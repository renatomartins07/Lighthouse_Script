const fs = require('fs');
const path = require('path');
const { lerJSON } = require('./JsonHelper');

function buscaDominioID(id, FICHEIRO_JSON) {
    let jsonData;
    try {
        jsonData = lerJSON(FICHEIRO_JSON);
        const dominio = jsonData
            .filter(({ InternalDomain }) => InternalDomain) // Filtra os domínios internos
            .find(item => item.ID === parseInt(id)); // Procura o domínio com o ID fornecido

        if (dominio) {
            console.log(dominio.InternalDomain); // Imprime apenas o InternalDomain do domínio encontrado
            return dominio.InternalDomain;
        } else {
            console.log(`Domínio com ID ${id} não encontrado.`);
        }
    } catch (error) {
        console.error(`Erro ao buscar domínio: ${error.message}`);
    }
}

function buscaDominioURL(url, FICHEIRO_JSON) {
    let jsonData;
    try {
        jsonData = lerJSON(FICHEIRO_JSON);
        const dominio = jsonData
            .filter(({ InternalDomain }) => InternalDomain) // Filtra os domínios internos
            .find(item => item.InternalDomain === url); // Procura o domínio com o URL fornecido

        if (dominio) {
            console.log(dominio.InternalDomain); // Imprime apenas o InternalDomain do domínio encontrado
            return dominio.InternalDomain;
        } else {
            console.log(`Domínio com URL ${url} não encontrado.`);
        }
    } catch (error) {
        console.error(`Erro ao buscar domínio: ${error.message}`);
    }
}

module.exports = { buscaDominioID, buscaDominioURL };