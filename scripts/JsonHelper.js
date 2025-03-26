const fs = require('fs');

function lerJSON(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Erro: ${filePath} não foi encontrado!`);
    }

    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    if (!Array.isArray(jsonData) || jsonData.length === 0) {
        throw new Error('Erro: Formato JSON inválido ou lista vazia!');
    }

    return jsonData;
}

function carregarJSONData(filePath){
    try {
        return lerJSON(filePath);
    } catch (error) {
        console.error(error.message);
        return null;
    }
}

module.exports = { carregarJSONData, lerJSON };