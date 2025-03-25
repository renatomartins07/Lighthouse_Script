const fs = require('fs');
const path = require('path');

function obterPontuacaoSeoDoRelatorio(caminhoRelatorio) {
    try {
        const relatorio = JSON.parse(fs.readFileSync(caminhoRelatorio, 'utf-8'));
        const pontuacaoSeo = relatorio.categories?.seo?.score * 100 || 0; // Converte a pontuação para porcentagem
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

    try {
        dominios.forEach(dominio => {
            const caminhoDominio = path.join(RESULTADOS_DIR, dominio);

            // Verifica se a entrada é um diretório
            if (fs.statSync(caminhoDominio).isDirectory()) {
                const pastasDatas = fs.readdirSync(caminhoDominio);

                pastasDatas.forEach(pastaData => {
                    const caminhoData = path.join(caminhoDominio, pastaData);
                    const caminhoRelatorioDesktopJson = path.join(caminhoData, 'relatorio_desktop.report.json');
                    const caminhoRelatorioDesktopHtml = path.join(caminhoData, 'relatorio_desktop.report.html');
                    const caminhoRelatorioMobileJson = path.join(caminhoData, 'relatorio_mobile.report.json');
                    const caminhoRelatorioMobileHtml = path.join(caminhoData, 'relatorio_mobile.report.html');

                    // Verifica se o relatório desktop existe
                    if (fs.existsSync(caminhoRelatorioDesktopJson)) {
                        const pontuacaoSeo = obterPontuacaoSeoDoRelatorio(caminhoRelatorioDesktopJson);
                        console.log(`Pontuação SEO para ${dominio}: ${pontuacaoSeo}`);

                        if (pontuacaoSeo == 0) {
                            fs.rmSync(caminhoDominio, { recursive: true });
                            return;
                        }

                        if (pontuacaoSeo !== null) {
                            const faixa = obterFaixaPontuacao(pontuacaoSeo);
                            const pastaFaixa = path.join(RESULTADOS_DIR, faixa);
                            const destinoDominio = path.join(pastaFaixa, dominio);

                            // Cria a pasta da faixa se não existir
                            if (!fs.existsSync(pastaFaixa)) {
                                fs.mkdirSync(pastaFaixa, { recursive: true });
                            }

                            // Se a pasta do domínio já existir no destino, move apenas a pasta de data
                            if (fs.existsSync(destinoDominio)) {
                                const destinoData = path.join(destinoDominio, pastaData);
                                if (!fs.existsSync(destinoData)) {
                                    fs.mkdirSync(destinoData, { recursive: true });

                                    // Move os relatórios desktop e mobile (JSON e HTML)
                                    if (fs.existsSync(caminhoRelatorioDesktopJson)) fs.renameSync(caminhoRelatorioDesktopJson, path.join(destinoData, 'relatorio_desktop.report.json'));
                                    
                                    if (fs.existsSync(caminhoRelatorioDesktopHtml)) fs.renameSync(caminhoRelatorioDesktopHtml, path.join(destinoData, 'relatorio_desktop.report.html'));
                                    
                                    if (fs.existsSync(caminhoRelatorioMobileJson)) fs.renameSync(caminhoRelatorioMobileJson, path.join(destinoData, 'relatorio_mobile.report.json'));
                                    
                                    if (fs.existsSync(caminhoRelatorioMobileHtml)) fs.renameSync(caminhoRelatorioMobileHtml, path.join(destinoData, 'relatorio_mobile.report.html'));

                                    console.log(`Movida a pasta de data: ${caminhoData} -> ${destinoData}`);
                                    fs.rmdirSync(caminhoData); // Remove a pasta de data se estiver vazia
                                }
                            } else {
                                // Move a pasta inteira do domínio para a pasta da faixa
                                fs.renameSync(caminhoDominio, destinoDominio);
                                console.log(`Movido: ${caminhoDominio} -> ${destinoDominio}`);
                            }
                        }
                    }
                });

                // Verifica se a pasta do domínio está vazia após mover todas as pastas de data
                if (fs.existsSync(caminhoDominio) && fs.readdirSync(caminhoDominio).length === 0) {
                    fs.rmdirSync(caminhoDominio);
                }
            } else {
                console.log(`Ignorando entrada que não é diretório: ${dominio}`);
            }
        });
    } catch (error) {
        console.error(`Erro ao organizar pastas por pontuação SEO: ${error.message}`);
    }
}

module.exports = { ordenarPastasPorPontuacaoSeo }; // Exporta as funções para serem usadas em outros scripts