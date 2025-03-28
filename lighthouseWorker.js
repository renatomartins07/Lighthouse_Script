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

function getUserPath() {
    var currentPath = __dirname; // Example: "C:\\Users\\renato.martins\\AppData"
    var parts = currentPath.split(path.sep); // Split path into parts

    var userIndex = parts.indexOf("Users"); // Find "Users" directory

    if (userIndex !== -1 && userIndex + 1 < parts.length) {
        // Extract path up to "Users\username\"
        var desiredPath = parts.slice(0, userIndex + 2).join(path.sep) + path.sep;
        return desiredPath;
    } else {
        return "Users folder not found in path";
    }
}

(async () => {
    const { url, domain, resultadosDir, data } = workerData;
    const outputDir = path.join(resultadosDir, domain, data); // Caminho para a pasta de resultados
    const removeDir = path.join(resultadosDir, domain); // Caminho para a pasta de resultados a remover
    const outputDesktopBase = path.join(outputDir, 'relatorio_desktop');
    const outputMobileBase = path.join(outputDir, 'relatorio_mobile');
    const outputDesktopJson = `${outputDesktopBase}.report.json`;
    const outputMobileJson = `${outputMobileBase}.report.json`;

    var UserPath = await getUserPath();

    try {
        // Verifica se a pasta de resultados existe
        fs.mkdirSync(outputDir, { recursive: true });

        // Corre o Lighthouse para desktop e guarda o resultado
        const desktopCommand = `${UserPath}\AppData\\Roaming\\npm\\lighthouse ${url} --quiet --disable-storage-reset --preset=desktop --chrome-flags="--headless" --output=json --output=html --output-path=${outputDesktopBase}`;
        execSync(desktopCommand, { encoding: 'utf-8' });

        const desktopJsonData = JSON.parse(fs.readFileSync(outputDesktopJson, 'utf-8'));
        removeBase64Images(desktopJsonData); // Apaga imagens base64 do ficheiro JSON
        fs.writeFileSync(outputDesktopJson, JSON.stringify(desktopJsonData, null, 2));

        // Corre o Lighthouse para mobile e guarda o resultado
        const mobileCommand = `${UserPath}\AppData\\Roaming\\npm\\lighthouse ${url} --quiet --disable-storage-reset --preset=experimental --chrome-flags="--headless" --output=json --output=html --output-path=${outputMobileBase}`;
        execSync(mobileCommand, { encoding: 'utf-8' });

        const mobileJsonData = JSON.parse(fs.readFileSync(outputMobileJson, 'utf-8'));
        removeBase64Images(mobileJsonData); // Apaga imagens base64 do ficheiro JSON
        fs.writeFileSync(outputMobileJson, JSON.stringify(mobileJsonData, null, 2));

        parentPort.postMessage({ success: true }); // Manda mensagem de sucesso
    } catch (error) {
        const errorString = error.toString().toLowerCase().trim();
        const SiteEmDesenvolvimento = "status code: 503";
        const isSiteEmDesenvolvimento = Boolean(errorString.includes(SiteEmDesenvolvimento)); // Verifica se a mensagem de erro contém "status code: 503"

        if (isSiteEmDesenvolvimento) {
            fs.rmSync(removeDir, { recursive: true }); // Apaga a pasta de resultados
            parentPort.postMessage({ success: false, error: `Status Code: 503, análise apagada` }); // Manda mensagem de erro
            return;
        } else {
            fs.rmSync(removeDir, {recursive: true});
            parentPort.postMessage({ success: false, error: `URL errado, análise ${url} apagada` }); // Manda mensagem de erro
        }
    
        // Em vez de apagar a pasta, apenas registra o erro e continua
        parentPort.postMessage({ success: false, error: error.message });
    }    
})();