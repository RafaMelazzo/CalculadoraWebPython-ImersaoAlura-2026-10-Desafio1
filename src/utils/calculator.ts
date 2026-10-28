/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CalculationResult {
  success: boolean;
  result?: number;
  formattedResult?: string;
  error?: string;
}

/**
 * Valida e calcula expressões aritméticas com suporte a +, -, *, /, %
 * Segue as mesmas regras e tratamento de erros do módulo Python calculator.py.
 */
export function calculateExpression(rawExpression: string): CalculationResult {
  if (!rawExpression || !rawExpression.trim()) {
    return {
      success: false,
      error: 'Digite uma expressão matemática',
    };
  }

  // Sanitização de caracteres usuais (ex.: x -> *, ÷ -> /, vírgula para ponto)
  const sanitized = rawExpression
    .trim()
    .replace(/x/gi, '*')
    .replace(/÷/g, '/')
    .replace(/,/g, '.');

  const compact = sanitized.replace(/\s+/g, '');

  // Validação de operadores consecutivos inválidos (ex: ++, --, +*, //, **, %%, etc.)
  if (/[\+\-\*/]{2,}/.test(compact) || /%{2,}/.test(compact)) {
    return {
      success: false,
      error: 'Expressão inválida: operadores consecutivos não permitidos',
    };
  }

  // Operadores aritméticos imediatamente seguidos de % (ex: +%, -%, *%, /%)
  if (/[\+\-\*/]%/.test(compact)) {
    return {
      success: false,
      error: 'Expressão inválida: operador seguido de porcentagem não permitido',
    };
  }

  // Não pode iniciar com operador de multiplicação, divisão ou porcentagem
  if (/^[*/%]/.test(compact)) {
    return {
      success: false,
      error: 'Expressão inválida: não pode iniciar com multiplicação, divisão ou porcentagem',
    };
  }

  // Não pode terminar com operador aritmético pendente (+, -, *, /)
  if (/[\+\-\*/]$/.test(compact)) {
    return {
      success: false,
      error: 'Expressão incompleta: operador pendente no final',
    };
  }

  // Permitir apenas caracteres matemáticos seguros: números, espaços, ponto e +, -, *, /, %, (, )
  if (!/^[0-9\.\+\-\*/\(\)\s%]+$/.test(sanitized)) {
    return {
      success: false,
      error: 'Expressão inválida: contém caracteres não numéricos',
    };
  }

  try {
    const tokens = tokenize(sanitized);
    if (!tokens.length) {
      return { success: false, error: 'Digite uma expressão válida' };
    }

    const ast = parseExpression(tokens);
    const value = evaluateAst(ast);

    if (!Number.isFinite(value) || Number.isNaN(value)) {
      return {
        success: false,
        error: 'Resultado matemático inválido',
      };
    }

    // Formatar resultado (evitar problemas de precisão IEEE 754 como 0.1 + 0.2 = 0.30000000000000004)
    const rounded = Math.round(value * 1e10) / 1e10;
    const formatted = rounded.toLocaleString('pt-BR', {
      maximumFractionDigits: 8,
    });

    return {
      success: true,
      result: rounded,
      formattedResult: formatted,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao calcular';
    return {
      success: false,
      error: message,
    };
  }
}

// Tokenizer & Parser AST seguro no cliente (sem eval)

type TokenType = 'NUMBER' | 'OP' | 'PERCENT' | 'LPAREN' | 'RPAREN';

interface Token {
  type: TokenType;
  value: string;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }

    if (ch === '%') {
      tokens.push({ type: 'PERCENT', value: '%' });
      i++;
      continue;
    }

    if (['+', '-', '*', '/'].includes(ch)) {
      tokens.push({ type: 'OP', value: ch });
      i++;
      continue;
    }

    if (/[0-9\.]/.test(ch)) {
      let numStr = '';
      let hasDot = false;
      while (i < expr.length && /[0-9\.]/.test(expr[i])) {
        if (expr[i] === '.') {
          if (hasDot) {
            throw new Error('Expressão inválida: número com múltiplos pontos decimais');
          }
          hasDot = true;
        }
        numStr += expr[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: numStr });
      continue;
    }

    throw new Error(`Caractere inválido: "${ch}"`);
  }

  return tokens;
}

type Node =
  | { type: 'NUMBER'; value: number }
  | { type: 'UNARY'; op: '+' | '-'; operand: Node }
  | { type: 'PERCENT'; operand: Node }
  | { type: 'BINARY'; op: '+' | '-' | '*' | '/'; left: Node; right: Node };

function parseExpression(tokens: Token[]): Node {
  let pos = 0;

  function peek(): Token | undefined {
    return tokens[pos];
  }

  function consume(expected?: string): Token {
    const token = tokens[pos];
    if (!token) {
      throw new Error('Expressão incompleta');
    }
    if (expected && token.value !== expected) {
      throw new Error(`Esperado "${expected}", mas encontrado "${token.value}"`);
    }
    pos++;
    return token;
  }

  // Regra de precedência: AddSub (nível mais baixo: + e -)
  function parseAddSub(): Node {
    let node = parseMulDiv();

    while (pos < tokens.length) {
      const next = peek();
      if (next && next.type === 'OP' && (next.value === '+' || next.value === '-')) {
        const op = consume().value as '+' | '-';
        const right = parseMulDiv();
        node = { type: 'BINARY', op, left: node, right };
      } else {
        break;
      }
    }

    return node;
  }

  // Precedência intermediária: MulDiv (* e /)
  function parseMulDiv(): Node {
    let node = parseFactor();

    while (pos < tokens.length) {
      const next = peek();
      if (next && next.type === 'OP' && (next.value === '*' || next.value === '/')) {
        const op = consume().value as '*' | '/';
        const right = parseFactor();
        node = { type: 'BINARY', op, left: node, right };
      } else {
        break;
      }
    }

    return node;
  }

  // Fator: número, unário (-/+), parênteses e porcentagem pós-fixada (%)
  function parseFactor(): Node {
    const token = peek();
    if (!token) {
      throw new Error('Expressão incompleta');
    }

    let node: Node;

    // Operador unário: -5 ou +3
    if (token.type === 'OP' && (token.value === '-' || token.value === '+')) {
      const op = consume().value as '+' | '-';
      const operand = parseFactor();
      node = { type: 'UNARY', op, operand };
    } else if (token.type === 'NUMBER') {
      consume();
      const num = parseFloat(token.value);
      if (Number.isNaN(num)) {
        throw new Error(`Número inválido: "${token.value}"`);
      }
      node = { type: 'NUMBER', value: num };
    } else if (token.type === 'LPAREN') {
      consume('(');
      node = parseAddSub();
      consume(')');
    } else {
      throw new Error(`Símbolo inesperado: "${token.value}"`);
    }

    // Operador de porcentagem pós-fixado (%) aplicado ao fator
    while (pos < tokens.length && peek()?.type === 'PERCENT') {
      consume('%');
      node = { type: 'PERCENT', operand: node };
    }

    return node;
  }

  const result = parseAddSub();
  if (pos < tokens.length) {
    throw new Error(`Expressão inválida próximo a "${tokens[pos].value}"`);
  }
  return result;
}

function evaluateAst(node: Node): number {
  switch (node.type) {
    case 'NUMBER':
      return node.value;

    case 'UNARY': {
      const val = evaluateAst(node.operand);
      return node.op === '-' ? -val : val;
    }

    case 'PERCENT': {
      return evaluateAst(node.operand) / 100;
    }

    case 'BINARY': {
      switch (node.op) {
        case '+': {
          // Acréscimo percentual comercial: A + B% = A + (A * (B / 100))
          if (node.right.type === 'PERCENT' && node.left.type !== 'PERCENT') {
            const leftVal = evaluateAst(node.left);
            const pctVal = evaluateAst(node.right.operand) / 100;
            return leftVal + (leftVal * pctVal);
          }
          return evaluateAst(node.left) + evaluateAst(node.right);
        }
        case '-': {
          // Desconto percentual comercial: A - B% = A - (A * (B / 100))
          if (node.right.type === 'PERCENT' && node.left.type !== 'PERCENT') {
            const leftVal = evaluateAst(node.left);
            const pctVal = evaluateAst(node.right.operand) / 100;
            return leftVal - (leftVal * pctVal);
          }
          return evaluateAst(node.left) - evaluateAst(node.right);
        }
        case '*': {
          return evaluateAst(node.left) * evaluateAst(node.right);
        }
        case '/': {
          const right = evaluateAst(node.right);
          if (right === 0) {
            throw new Error('Não é possível dividir por zero');
          }
          return evaluateAst(node.left) / right;
        }
      }
    }
  }
}
