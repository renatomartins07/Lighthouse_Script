const { Worker } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const readline = require('readline');
const { openExplorer } = require ('explorer-opener');
const green = "\x1b[32m";
const reset = "\x1b[0m";

// Bibliotecas locais
const { carregarJSONData } = require('./scripts/JsonHelper');
const { buscaDominioID, buscaDominioURL } = require('./scripts/buscaDominio');


// Configuração
const FICHEIRO_JSON = 'ActiveWebsitesList.json';
exports.FICHEIRO_JSON = FICHEIRO_JSON;
const RESULTADOS_DIR = 'resultados';
const DATA = new Date().toISOString().replace('T', '-').replace(/:/g, '-').split('.')[0]; // Formato: YYYY-MM-DD-HH-mm-ss
const CONCURRENCY_LIMIT = 5; // Corre 5 URLs em simultâneo

// Funcao para limpar resultados antigos
function limpaResultadosAntigos(domainToClean = null) {
    // Cria a pasta de resultados se não existir
    if (!fs.existsSync(RESULTADOS_DIR)) {
        fs.mkdirSync(RESULTADOS_DIR, { recursive: true });
        return;
    }

    console.log('Verificando resultados antigos...');
    const domains = fs.readdirSync(RESULTADOS_DIR); // Lista de domínios

    // Filtra apenas o domínio específico, se fornecido
    const filteredDomains = domainToClean ? [domainToClean] : domains;

    filteredDomains.forEach(domain => {
        const domainPath = path.join(RESULTADOS_DIR, domain);
        if (fs.statSync(domainPath).isDirectory()) {
            const dates = fs.readdirSync(domainPath);
            if (dates.length > 1) {
                const sortedDates = dates.sort((a, b) => new Date(a) - new Date(b));
                const datesToDelete = sortedDates.slice(0, -1);

                datesToDelete.forEach(date => {
                    const datePath = path.join(domainPath, date);
                    fs.rmSync(datePath, { recursive: true, force: true });
                    console.log(`Apagado: ${datePath}`);
                });
            }
        }
    });
}


// Funcao para correr o Lighthouse
function runLighthouseWorker(url, domain) {
    return new Promise((resolve, reject) => {
        console.log(`A começar o Lighthouse para ${url}`); // Debug
        console.log('Caso queira parar a execução, pressione CTRL + C'); 

        // Cria um novo worker
        const worker = new Worker('./lighthouseWorker.js', {
            workerData: { url, domain, resultadosDir: RESULTADOS_DIR, data: DATA }, // Passa os dados para o worker
        });

        worker.on('message', (message) => {
            if (message.success) {
                resolve(message);
            } else {
                reject(new Error(`Erro no domínio ${domain}: ${message.error}`));
            }
        });

        worker.on('error', (error) => {
            console.error(`Worker error for ${url}:`, error); // Debug
            reject(error);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`Worker finalizou com código ${code}`));
            }
        });
    });
}

async function main() {
    let UrlsAnalisadas = 0;
    let totalUrls = 0;
    let tempoTotal = 0;
    const errors = [];

    console.log('A iniciar o processo em 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Delay de 3 segundos
    limpaResultadosAntigos(); // Limpa resultados antigos

    const jsonData = carregarJSONData(FICHEIRO_JSON); // Carrega o JSON
    totalUrls = jsonData.filter(item => item.InternalDomain).length; // Conta o número de URLs
    if (!jsonData) return; // Sai se não conseguir carregar o JSON

    // Filtra URLs internas
    const urls = jsonData.filter(({ InternalDomain }) => InternalDomain);
    const promises = []; 
    const startTime = performance.now(); // Tempo de execução

    // Corre o Lighthouse para cada URL
    for (const { InternalDomain } of urls) { 
        if (promises.length >= CONCURRENCY_LIMIT) {
            await Promise.race(promises); // Espera que uma promessa termine
        }

        const url = `https://${InternalDomain}`;
        const promise = runLighthouseWorker(url, InternalDomain)
            .then(() => {
                UrlsAnalisadas++; 
                console.log('-----------------------------------------------');
                console.log(`${UrlsAnalisadas}/${totalUrls} URLs processadas`); 
                console.log('-----------------------------------------------');
            })
            .catch((error) => { 
                errors.push(error.message); 
                console.error(error.message); 
                UrlsAnalisadas++; 
                console.log('-----------------------------------------------');
                console.log(`${UrlsAnalisadas}/${totalUrls} URLs processadas`); 
                console.log('-----------------------------------------------');
            })
            .finally(() => {
                promises.splice(promises.indexOf(promise), 1); // Remove a promessa do array
            });

        promises.push(promise); // Adiciona a promessa ao array
    }
    
    await Promise.all(promises); // Espera que todas as promessas terminem

    const endTime = performance.now(); // Tempo de execução
    tempoTotal = Math.round((endTime - startTime) * 0.001);

    if (errors.length > 0) {
        console.log('Erros encontrados:');
        errors.forEach((error) => console.log(`- ${error}`));
    }

    console.log('-----------------------------------------------');
    console.log(`|${UrlsAnalisadas}/${totalUrls} URLs processadas`); 
    console.log('-----------------------------------------------');
    console.log(`Tempo total de execução: ${tempoTotal} segundos/${Math.round(tempoTotal / 60)} minuto(s)`);
    openExplorer('C:\\Users\\renato.martins\\Lighthouse_Script\\resultados');
}

function menu(){
    let op = '';
    let dominio = '';
    const text = ' ---------------------------------------------\n' 
               + '| Menu\t\t\t\t\t      |\n'
               + '| 1 - Correr todos os domínios\t\t      |\n'
               + '| 2 - Correr um domínio (Por ID)\t      |\n'
               + '| 3 - Correr um domínio (Por URL)\t      |\n'
               + '| 4 - Sair\t\t\t\t      |\n'
               + ' ---------------------------------------------';
    const regex = new RegExp('^[1-4]$');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Cria um timeout para o caso de não ser inserida nenhuma opção ir para o main()
    const timeout = setTimeout(() => {
        console.log('\nNenhuma opção foi inserida. A executar a opção padrão: Correr todos os domínios.');
        main();
        rl.close();
    }, 10000); // 10 segundos    

    rl.question(text + '\nInsira uma opção: ', ans => {
        clearTimeout(timeout); // Limpa o timeout
        do{
            op = ans;
            if(op === '1'){
                main();
                rl.close();
            }
    
            if(op === '2'){
                rl.question('Insira o ID do site: ', ans => {
                    dominio = buscaDominioID(ans, FICHEIRO_JSON);

                    limpaResultadosAntigos(dominio); // Limpa resultados antigos
                    try {
                        const startTime = performance.now(); // Tempo de execução
                        runLighthouseWorker(`https://${dominio}`, dominio)
                        .then(() => {
                            openExplorer(`C:\\Users\\renato.martins\\Lighthouse_Script\\resultados\\${dominio}\\${DATA}`);
                            const endTime = performance.now(); // Tempo de execução
                            const tempoTotal = Math.round((endTime - startTime) * 0.001);
                            console.log(`Tempo total de execução: ${tempoTotal} segundos`);
                        })
                    } catch (error) {
                        console.error(`Erro ao executar o Lighthouse para o domínio ${dominio}:`, error.message);
                    }
                    rl.close();
                });
            }
    
            if(op === '3'){
                rl.question('Insira a URL do site: ', ans => {
                    dominio = buscaDominioURL(ans, FICHEIRO_JSON);

                    if (!dominio) {
                        console.error('Domínio não encontrado.');
                        rl.close();
                        return;
                    }

                    limpaResultadosAntigos(dominio); // Limpa resultados antigos apenas para o domínio específico
                    
                    try {
                        const startTime = performance.now(); // Tempo de execução
                        runLighthouseWorker(`https://${dominio}`, dominio)
                        .then(() => {
                            openExplorer(`C:\\Users\\renato.martins\\Lighthouse_Script\\resultados\\${dominio}\\${DATA}`);
                            const endTime = performance.now(); // Tempo de execução
                            const tempoTotal = Math.round((endTime - startTime) * 0.001);
                            console.log(`Tempo total de execução: ${tempoTotal} segundos`);
                        })
                    } catch (error) {
                        console.error(`Erro ao executar o Lighthouse para o domínio ${dominio}:`, error.message);
                    }
                    rl.close();
                });
            }
    
            if(op === '4'){
                rl.close();
                process.exit(0);
            }
    
            if(!regex.test(op)){
                console.log('Opção inválida!');
                process.exit(0);
            }
        }while(!regex.test(op));
    });    
}
console.log(green);
console.log('Bem-vindo ao Lighthouse Script!');
menu();
console.log(reset);