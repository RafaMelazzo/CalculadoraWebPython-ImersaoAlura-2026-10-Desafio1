# 🧮 Calculadora Web & Engine Python

> Aplicação de calculadora interativa com interface moderna em **React + TypeScript + Tailwind CSS** e motor matemático equivalente em **Python (AST)**, desenvolvida como parte da **Imersão Alura — Desafio 1**.

Suporta com precisão as quatro operações fundamentais da matemática e cálculo de porcentagem comercial, com validação estrita de sintaxe, proteção contra divisões por zero, histórico de cálculos, critérios de teste interativos e suporte completo a atalhos do teclado físico.

---

## 🚀 Funcionalidades

* ➕ **Quatro Operações Básicas:** Soma (`+`), Subtração (`-`), Multiplicação (`*`) e Divisão (`/`).
* 📊 **Porcentagem Inteligente (`%`):**
  * **Porcentagem direta:** `50%` $\rightarrow$ `0,5`
  * **Porcentagem de um valor:** `200 * 10%` $\rightarrow$ `20`
  * **Acréscimo percentual comercial:** `100 + 10%` $\rightarrow$ `110`
  * **Desconto percentual comercial:** `200 - 15%` $\rightarrow$ `170`
* 🛡️ **Avaliação Segura via AST (Sem `eval`):**
  * O motor não utiliza a função perigosa `eval()`.
  * Utiliza árvore de sintaxe abstrata (AST) tanto no frontend (TypeScript) quanto no script Python (`ast.parse`), garantindo imunidade a injeções de código.
* ⌨️ **Suporte a Teclado Físico:** Totalmente utilizável pelo teclado do computador, incluindo `Enter`, `=`, `Esc`, `Backspace`, `%`, números e operadores.
* 📜 **Painel de Histórico:** Lista os últimos cálculos realizados com data/hora e permite clicar em um resultado anterior para reutilizá-lo.
* 🧪 **Painel "Critérios de Teste":** Casos de teste rápidos pré-configurados para validação com um único clique.
* 🔊 **Feedback Sonoro:** Sons suaves gerados via sintetizador Web Audio API para respostas táteis ao digitar.
* 🐍 **CLI Python Independente:** O script [`calculator.py`](file:///./calculator.py) pode ser executado diretamente pelo terminal de forma interativa ou via argumentos.

---

## 🛠️ Tecnologias Utilizadas

| Camada | Ferramenta / Biblioteca | Descrição |
| :--- | :--- | :--- |
| **Frontend** | [React 19](https://react.dev/) | Construção declarativa da interface |
| **Linguagem** | [TypeScript](https://www.typescriptlang.org/) | Tipagem estática e segurança do código |
| **Bundler** | [Vite](https://vitejs.dev/) | Servidor de desenvolvimento ultrarrápido |
| **Estilização** | [Tailwind CSS v4](https://tailwindcss.com/) | Design responsivo com visual escuro elegante |
| **Ícones** | [Lucide React](https://lucide.dev/) | Conjunto de ícones vetoriais modernos |
| **Áudio** | Web Audio API | Efeitos sonoros sem arquivos de áudio externos |
| **Engine Python**| Python 3.8+ (`ast`, `operator`, `re`) | Validação estrita e cálculo no terminal |

---

## 📁 Estrutura de Pastas e Arquivos

```text
├── calculator.py          # Motor matemático em Python (CLI e funções com AST)
├── index.html             # Ponto de montagem HTML da aplicação
├── package.json           # Dependências e scripts do ecossistema Node/React
├── tsconfig.json          # Configurações do compilador TypeScript
├── vite.config.ts         # Configuração do Vite e plugins
├── metadata.json          # Metadados e capacidades do projeto
└── src/
    ├── main.tsx           # Ponto de inicialização da aplicação React
    ├── App.tsx            # Componente central: UI, estados, teclado e painéis
    ├── index.css          # Estilos globais e importação do Tailwind CSS
    └── utils/
        └── calculator.ts  # Tokenizer, Parser AST e avaliador em TypeScript
```

---

## 💻 Como Executar o Projeto

### Pré-requisitos
* **Node.js** (versão 18 ou superior) e **npm**
* **Python** (versão 3.8 ou superior — opcional para o CLI)

---

### 1. Rodando a Aplicação Web

1. **Clone o repositório ou acesse a pasta do projeto:**
   ```bash
   cd CalculadoraWebPython-ImersaoAlura-2026-10-Desafio1
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Acesse no seu navegador:**
   ```text
   http://localhost:3000
   ```

---

### 2. Rodando o Script Python no Terminal

Você pode utilizar o arquivo [`calculator.py`](file:///./calculator.py) diretamente no terminal:

* **Modo Interativo:**
  ```bash
  python calculator.py
  ```
  *Exemplo de uso:*
  ```text
  ==================================================
   Calculadora Python v2.0 - (+, -, *, /, %)
   Exemplos: '5+7', '10*2', '100+10%', '200-15%', '50%'
   Digite 'sair' ou pressione Ctrl+C para encerrar.
  ==================================================

  Digite a expressão: 100+10%
  -> Resultado: 110

  Digite a expressão: 50%
  -> Resultado: 0.5
  ```

* **Cálculo Direto via Argumento:**
  ```bash
  python calculator.py "200 - 15%"
  # Saída: 170
  ```

---

## ⌨️ Atalhos do Teclado Físico

| Tecla Física | Ação Correspondente |
| :--- | :--- |
| `0` a `9` | Digita o número |
| `+`, `-`, `*`, `/` | Insere os operadores matemáticos |
| `%` (`Shift + 5`) | Insere o operador de porcentagem |
| `.` ou `,` | Insere o ponto decimal |
| `(` e `)` | Insere parênteses para controle de prioridade |
| `Enter` ou `=` | Executa o cálculo da expressão |
| `Backspace` | Apaga o último caractere (correção) |
| `Escape` (`Esc`) | Zera a calculadora e limpa o display (`AC`) |

---

## 🧪 Matriz de Critérios de Teste

A aplicação inclui um painel de testes interativo com os principais cenários de validação:

| Caso de Teste | Expressão | Resultado Esperado | Categoria |
| :--- | :--- | :--- | :--- |
| **Soma** | `5+7` | `12` | Operação Básica |
| **Multiplicação** | `10*2` | `20` | Operação Básica |
| **Divisão** | `15/3` | `5` | Operação Básica |
| **Subtração** | `20-8` | `12` | Operação Básica |
| **Divisão por Zero** | `10/0` | `Não é possível dividir por zero` | Tratamento de Erro |
| **Decimais** | `3.5+4.2` | `7.7` | Ponto Flutuante |
| **Negativos** | `5-12` | `-7` | Números Negativos |
| **Porcentagem Direta** | `50%` | `0.5` | Porcentagem |
| **Porcentagem de Valor**| `200*10%` | `20` | Porcentagem |
| **Acréscimo Percentual** | `100+10%` | `110` | Porcentagem Comercial |
| **Desconto Percentual** | `200-15%` | `170` | Porcentagem Comercial |
| **Operador Duplicado** | `5++2` | `Operadores consecutivos não permitidos` | Validação de Sintaxe |
| **Porcentagem Duplicada**| `50%%` | `Operadores consecutivos não permitidos` | Validação de Sintaxe |
| **Operador Inicial** | `*9` | `Não pode iniciar com multiplicação ou divisão` | Validação de Sintaxe |
| **Porcentagem Inicial** | `%10` | `Não pode iniciar com porcentagem` | Validação de Sintaxe |

---

## 📄 Licença

Este projeto é distribuído sob os termos da licença **Apache-2.0**.
