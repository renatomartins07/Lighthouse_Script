# Script de Automação do Lighthouse

Este script executa o Lighthouse para cada URL listada no ficheiro JSON e guarda os resultados numa pasta chamada `resultados`. É uma solução prática para avaliar a qualidade de múltiplos websites de forma automatizada.

## Pré-requisitos

Antes de executar o script, certifique-se de que possui os seguintes requisitos:

- **Node.js** instalado no sistema.
- **Lighthouse** instalado globalmente. Pode instalá-lo com o comando:
  `npm install -g lighthouse`
- Um ficheiro JSON chamado ActiveWebsitesList.json no mesmo diretório do script

### Estrutura do Ficheiro JSON
O ficheiro JSON deve seguir o seguinte formato:
[
    {
        "ID": 105,
        "InternalDomain": "15300-1.ep.egorealestate.com",
        "DateUpdated": "2018-02-22 09:30:26"
    },
    {
        "ID": 109,
        "InternalDomain": "15394-1.ep.egorealestate.com",
        "DateUpdated": "2019-02-06 11:35:35"
    }
]
Cada entrada no JSON representa um website a ser analisado.

### Como Executar
Siga os passos abaixo para executar o script:

Certifique-se de que o ficheiro JSON está no formato correto.
Abra o terminal e navegue até ao diretório onde o script está localizado.
Execute o comando:
`node main.js`

Os resultados serão guardados na pasta resultados com a seguinte estrutura:
[report.html](http://_vscodecontentref_/0)

### Estrutura dos Resultados
Os relatórios gerados pelo Lighthouse serão organizados da seguinte forma:

Domínio: Cada domínio terá a sua própria pasta.
Data: Dentro de cada pasta de domínio, os relatórios serão organizados por data e hora de execução.
Relatório: O ficheiro report.html contém o relatório detalhado da análise do Lighthouse.

resultados/
    15300-1.ep.egorealestate.com/
        2025-03-19-11-31-30/
            [report.html](http://_vscodecontentref_/1)
        2025-03-19-11-32-24/
            [report.html](http://_vscodecontentref_/2)
    15394-1.ep.egorealestate.com/
        2025-03-19-11-31-30/
            [report.html](http://_vscodecontentref_/3)
        2025-03-19-11-32-24/
            [report.html](http://_vscodecontentref_/4)