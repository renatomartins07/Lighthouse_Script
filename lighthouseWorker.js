const { parentPort, workerData } = require('worker_threads');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to remove base64 images from JSON
function removeBase64Images(obj) {
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            removeBase64Images(obj[key]);
        } else if (key === 'data' && typeof obj[key] === 'string' && obj[key].startsWith('data:image/')) {
            delete obj[key];
        }
    }
}

(async () => {
    const { url, domain, resultadosDir, data } = workerData;
    const outputDir = path.join(resultadosDir, domain, data);
    const outputBase = path.join(outputDir, 'report');
    const outputHtml = `${outputBase}.html`;
    const outputJson = `${outputBase}.json`;

    try {
        // Verifica se a pasta de resultados existe
        fs.mkdirSync(outputDir, { recursive: true });

        // Corre o Lighthouse e guarda o resultado num ficheiro
        const command = `lighthouse ${url} --quiet --preset=desktop --chrome-flags="--headless" --output=json --output=html --output-path=${outputBase}`;
        execSync(command, { encoding: 'utf-8' });

        const jsonData = JSON.parse(fs.readFileSync(outputJson, 'utf-8')); 
        removeBase64Images(jsonData); // Apaga imagens base64 do ficheiro JSON

        fs.writeFileSync(outputJson, JSON.stringify(jsonData, null, 2));

        parentPort.postMessage({ success: true }); //Manda mensagem de sucesso
    } catch (error) {
        console.error(`Worker falhou no ${url}: ${error.message}`); // Debug log
        parentPort.postMessage({ success: false, error: error.message }); // Manda mensagem de erro
    }
})();