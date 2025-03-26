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
const { ordenarPastasPorPontuacaoSeo } = require('./scripts/pontuacao');

// Configuração
const FICHEIRO_JSON = 'ActiveWebsitesList.json';
exports.FICHEIRO_JSON = FICHEIRO_JSON; // Exporta o ficheiro JSON para ser usado em outros ficheiros
const RESULTADOS_DIR = 'resultados';
const DATA = new Date().toISOString().replace('T', '-').replace(/:/g, '-').split('.')[0]; // Formato: YYYY-MM-DD-HH-mm-ss
const CONCURRENCY_LIMIT = 5; // Corre 5 URLs em simultâneo


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


async function correrDominios(){
    let UrlsAnalisadas = 0;
    let totalUrls = 0;
    let tempoTotal = 0;
    const errors = [];
    
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

    ordenarPastasPorPontuacaoSeo(RESULTADOS_DIR); // Ordena pastas por pontuação SEO

    if (errors.length > 0) {
        console.log('Erros encontrados:');
        errors.forEach((error) => console.log(`- ${error}`));
    }

    console.log('-----------------------------------------------');
    console.log(`${UrlsAnalisadas}/${totalUrls} URLs processadas`); 
    console.log('-----------------------------------------------');
    console.log(`Tempo total de execução: ${tempoTotal} segundos/${Math.round(tempoTotal / 60)} minuto(s)`);
    openExplorer(`${__dirname}\\resultados`);
    process.exit(0);
}


// Funcao para limpar resultados antigos
function limpaResultadosAntigos(domainToClean = null) {
    // Cria a pasta de resultados se não existir
    if (!fs.existsSync(RESULTADOS_DIR)) {
        fs.mkdirSync(RESULTADOS_DIR, { recursive: true });
        console.log(`Criada a pasta de resultados: ${RESULTADOS_DIR}`);
        return;
    }

    console.log('Verificando resultados antigos...');

    // Obtém todos os diretórios dentro de "resultados"
    const allEntries = fs.readdirSync(RESULTADOS_DIR).filter(entry => {
        const entryPath = path.join(RESULTADOS_DIR, entry);
        return fs.statSync(entryPath).isDirectory();
    });

    // Regex para identificar faixas de pontuação (exemplo: "50-60")
    const faixaRegex = /^\d{1,3}-\d{1,3}$/;

    allEntries.forEach(entry => {
        const entryPath = path.join(RESULTADOS_DIR, entry);

        if (faixaRegex.test(entry)) {
            // Caso seja uma faixa de pontuação
            const rangePath = entryPath;

            // Renova sobre os domínios dentro da faixa
            const domains = fs.readdirSync(rangePath).filter(domain => {
                const domainPath = path.join(rangePath, domain);
                return fs.statSync(domainPath).isDirectory();
            });

            // Filtra os domínios se um domínio específico for fornecido
            const filteredDomains = domainToClean
                ? domains.filter(domain => domain === domainToClean)
                : domains;

            filteredDomains.forEach(domain => {
                const domainPath = path.join(rangePath, domain);

                // Obtém todas as pastas de datas dentro do domínio
                const dates = fs.readdirSync(domainPath).filter(date => {
                    const datePath = path.join(domainPath, date);
                    return fs.statSync(datePath).isDirectory();
                });

                if (dates.length > 1) {
                    // Ordena as datas e mantém apenas a mais recente
                    const sortedDates = dates.sort((a, b) => new Date(a) - new Date(b));
                    const datesToDelete = sortedDates.slice(0, -1); // Mantém a mais recente

                    datesToDelete.forEach(date => {
                        const datePath = path.join(domainPath, date);
                        fs.rmSync(datePath, { recursive: true, force: true });
                        console.log(`Apagado: ${datePath}`);
                    });
                }
            });
        } else {
            // Caso seja um domínio diretamente no formato "resultados/<domínio>"
            if (!domainToClean || domainToClean === entry) {
                fs.rmSync(entryPath, { recursive: true, force: true });
                console.log(`Domínio apagado diretamente: ${entryPath}`);
            }
        }
    });
}


function correrDominioUnico(dominio){
    try {
        const startTime = performance.now(); // Tempo de execução
        runLighthouseWorker(`https://${dominio}`, dominio)
        .then(() => {
            const endTime = performance.now(); // Tempo de execução
            const tempoTotal = Math.round((endTime - startTime) * 0.001);
            
            ordenarPastasPorPontuacaoSeo(RESULTADOS_DIR);
            console.log('\n--------------------------------------------------------------------------------');
            console.log('Domínio processado com sucesso! Por favor extraia a pasta para outro local.');
            console.log('--------------------------------------------------------------------------------');
            console.log(`Tempo total de execução: ${tempoTotal} segundos/${Math.round(tempoTotal / 60)} minuto(s)`);
        })
    } catch (error) {
        console.error(`Erro ao executar o Lighthouse para o domínio ${dominio}:`, error.message);
    }
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
                    dominio = buscaDominioID(ans, FICHEIRO_JSON); // Busca o domínio pelo ID

                    limpaResultadosAntigos(dominio); // Limpa resultados antigos
                    correrDominioUnico(dominio); // Corre o Lighthouse para o domínio específico
                    rl.close();
                });
            }
    
            if(op === '3'){
                rl.question('Insira a URL do site: ', ans => {
                    dominio = buscaDominioURL(ans, FICHEIRO_JSON); // Busca o domínio pelo URL

                    limpaResultadosAntigos(dominio); // Limpa resultados antigos apenas para o domínio específico
                    correrDominioUnico(dominio); // Corre o Lighthouse para o domínio específico
                    rl.close();
                });
            }
    
            if(op === '4'){
                rl.close();
                console.log('A sair...');
                process.exit(0);
            }
    
            if(!regex.test(op)){
                console.clear();
                console.log('Opção inválida!');
                return menu();
            }
        }while(!regex.test(op));
    });    
}


async function main() {
    console.log('A iniciar o processo em 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Delay de 3 segundos
    limpaResultadosAntigos(); // Limpa resultados antigos
    correrDominios(); // Corre o Lighthouse para todos os domínios
}

// Inicia o script
console.clear();
console.log(green);
console.log('Bem-vindo ao Lighthouse Script!');
menu();
console.log(reset);