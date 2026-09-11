### [v1.0] - Lançamento Inicial
 * estrutura base das telas de login e dashboard.

### [v2.0] - Adição de Melhorias 
* conserto em falhas estruturais do codigo
* Inicio de implementação do firebase ao sistema

### [v3.0] - Adição de Funções Complementares
* adição das demais mecanicas do site de acordo com o banco de dados firebase
* mecanica de pesquisa de cidades e estados
* criação da pagina adiministrativa (podendo fazer modificaoes nos dados mostrados do dashboard)
* mudança no layout da pagina dashboard.css - dashboard.html - dashboard.js - login.js 
* mecanica de login(form)
* 

### [v4.0] - Alteração de dados e integração ao firebase
* integração total ao firebase







-----------------------------------



# EcoData Brasil — Dashboard

Painel administrativo + dashboard público de indicadores ambientais do Brasil, construído em HTML/CSS/JS puro (sem framework, sem build step) e com Firebase (Authentication + Firestore) como backend.

Este projeto é a **segunda versão** de um painel que começou como um dashboard de dados demográficos do IBGE. A tabela abaixo resume o que mudou.

## Comparação entre versões

| | **v1 — IBGE Analytics** | **v8 — EcoData Brasil (atual)** |
|---|---|---|
| Nicho / tema | Demografia (população, PIB, IDHM por estado e município) | Meio ambiente (resíduos sólidos, desmatamento, consumo de água) |
| Páginas | `login.html`, `admin.html`, `dashboard.html`, `detalhe.html` | `login.html`, `admin.html`, `dashboard.html` (sem página de detalhamento) |
| Coleções no Firestore | `localidades` (um só formato: estado ou município) | `destaques`, `graficos`, `pontos` (três coleções relacionadas) |
| Estrutura dos dados | Registros fixos: nome, UF, região, população, PIB, IDHM, ano | Estrutura genérica: qualquer indicador vira um gráfico, alimentado por pontos avulsos |
| Tipos de gráfico | 1 gráfico de linha (população) + 1 ranking de barras (PIB) fixos no layout | Barra, linha e pizza — quantidade e tipo definidos pelo administrador, sem mexer em código |
| Números de destaque | Não existia (havia só KPIs fixos: população total, nº de municípios etc.) | Coleção dedicada `destaques`, com título, valor, frase explicativa, tema e fonte |
| Fonte dos dados | Não exibida na interface | Exibida visivelmente em todo gráfico e destaque (campo `fonte` obrigatório) |
| Filtros | Região, estado e ano, com um dropdown para cada | Abas por tema (Resíduos / Desmatamento / Água / Outro) + busca por texto |
| Detalhamento por localidade | Página `detalhe.html` (clique num município abria os indicadores dele) | Removida — o nicho ambiental não gira em torno de uma localidade específica |
| Arquivo de constantes | `dados-brasil.js` (UF → região, usado nos filtros) | Removido — não é mais necessário |
| Branding | "IBGE Analytics" | "EcoData Brasil" |

## Por que a estrutura de dados mudou

Na v1, cada registro no Firestore já vinha com um formato fixo (população, PIB, IDHM...), porque o domínio era conhecido de antemão. Na v8, o pedido era poder cadastrar **qualquer indicador ambiental**, com **qualquer tipo de gráfico**, sem depender de alterações no código a cada novo tema. Por isso a v8 separa em três coleções:

- **`graficos`** — a "ficha" de um gráfico: título, tipo (`barra` | `linha` | `pizza`), tema, descrição para o visitante, unidade de medida e fonte.
- **`pontos`** — os valores que alimentam um gráfico específico (`graficoId` + rótulo + valor + ordem). Um gráfico de linha com 4 anos tem 4 documentos em `pontos`; um gráfico de pizza com 2 fatias tem 2.
- **`destaques`** — números isolados de impacto editorial (ex.: "221 mil toneladas/dia"), sem vínculo com um gráfico.

Essa separação é o que permite ao administrador criar um gráfico novo pela interface (aba "Gráficos" do `admin.html`) e populá-lo (aba "Pontos de dados") sem que um desenvolvedor precise tocar em `dashboard.js`.

## Estrutura de arquivos

```
index.html          → redireciona para dashboard.html
login.html / .css / .js   → autenticação (Firebase Auth)
admin.html / .css / .js   → painel protegido, CRUD das 3 coleções (com abas)
dashboard.html / .js      → painel público: destaques + grade de gráficos
dashboard.css              → estilos compartilhados por admin e dashboard
firebase-config.js         → inicialização do Firebase (Auth + Firestore)
```

## Regras do Firestore usadas nesta versão

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /destaques/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /graficos/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /pontos/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## O que ficou da v1-v7

- Fluxo de login (Firebase Authentication por e-mail/senha), incluindo persistência de sessão via "Manter conectado".
- Guarda de rota no `admin.html` (redireciona pra `login.html` sem sessão ativa).
- Identidade visual base (cores, tipografia, componentes de painel) em `dashboard.css`.

## Pendências conhecidas

- A coleção `localidades` (da v1) continua no Firestore, mas não é mais lida por nenhuma página — pode ser apagada manualmente no console, se desejado.
- Dados reais de exemplo (resíduos, desmatamento, água) foram levantados e repassados no chat, mas ainda precisam ser cadastrados manualmente via `admin.html` — o Firestore começa vazio.