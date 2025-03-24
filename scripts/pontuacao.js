const fs = require('fs');
const path = require('path');

function obterPontuacaoSeoDoRelatorio(caminhoRelatorio) {
    try {
        const relatorio = JSON.parse(fs.readFileSync(caminhoRelatorio, 'utf-8'));
        const pontuacaoSeo = relatorio.categories?.seo?.score * 100 || 0; // Converte a pontuação para porcentagem
        console.log(`Pontuação SEO extraída de ${caminhoRelatorio}: ${pontuacaoSeo}`);
        return pontuacaoSeo;
    } catch (error) {
        console.error(`Erro ao ler o arquivo de relatório ${caminhoRelatorio}: ${error.message}`);
        return null;
    }
}

function obterFaixaPontuacao(pontuacao) {
    if (pontuacao <= 39) return '0-39';
    if (pontuacao <= 59) return '40-59';
    if (pontuacao <= 89) return '60-89';
    return '90-100';
}

function ordenarPastasPorPontuacaoSeo(RESULTADOS_DIR) {
    console.log(`RESULTADOS_DIR: ${RESULTADOS_DIR}`);

    if (!fs.existsSync(RESULTADOS_DIR)) {
        console.error(`Diretório não existe: ${RESULTADOS_DIR}`);
        return;
    }

    const dominios = fs.readdirSync(RESULTADOS_DIR);
    console.log('Domínios encontrados:', dominios);

    dominios.forEach(dominio => {
        const caminhoDominio = path.join(RESULTADOS_DIR, dominio);
        console.log(`Verificando domínio: ${caminhoDominio}`);

        if (fs.statSync(caminhoDominio).isDirectory()) {
            const pastasDatas = fs.readdirSync(caminhoDominio);

            pastasDatas.forEach(pastaData => {
                const caminhoData = path.join(caminhoDominio, pastaData);
                const caminhoRelatorio = path.join(caminhoData, 'report.report.json');

                if (fs.existsSync(caminhoRelatorio)) {
                    console.log(`Relatório encontrado: ${caminhoRelatorio}`);
                    const pontuacaoSeo = obterPontuacaoSeoDoRelatorio(caminhoRelatorio);
                    console.log(`Pontuação SEO para ${dominio}: ${pontuacaoSeo}`);

                    if (pontuacaoSeo !== null) {
                        const faixa = obterFaixaPontuacao(pontuacaoSeo);
                        const pastaFaixa = path.join(RESULTADOS_DIR, faixa);
                        const destinoDominio = path.join(pastaFaixa, dominio);

                        // Cria a pasta da faixa se não existir
                        if (!fs.existsSync(pastaFaixa)) {
                            fs.mkdirSync(pastaFaixa, { recursive: true });
                            console.log(`Criada a pasta: ${pastaFaixa}`);
                        }

                        // Se a pasta do domínio já existir no destino, move apenas a pasta de data
                        if (fs.existsSync(destinoDominio)) {
                            console.log(`Pasta do domínio já existe: ${destinoDominio}`);
                            const destinoData = path.join(destinoDominio, pastaData);
                            if (!fs.existsSync(destinoData)) {
                                fs.renameSync(caminhoData, destinoData);
                                console.log(`Movida a pasta de data: ${caminhoData} -> ${destinoData}`);
                            } else {
                                console.log(`A pasta de data já existe no destino: ${destinoData}`);
                            }
                        } else {
                            // Move a pasta inteira do domínio para a pasta da faixa
                            fs.renameSync(caminhoDominio, destinoDominio);
                            console.log(`Movido: ${caminhoDominio} -> ${destinoDominio}`);
                        }
                    }
                } else {
                    console.log(`Relatório não encontrado em: ${caminhoData}`);
                }
            });
        } else {
            console.log(`Ignorando entrada que não é diretório: ${dominio}`);
        }
    });
}

module.exports = { ordenarPastasPorPontuacaoSeo }; // Exporta as funções para serem usadas em outros scripts