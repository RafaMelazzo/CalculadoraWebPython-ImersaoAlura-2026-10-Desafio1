"""
Calculadora Simples em Python com suporte às quatro operações básicas e porcentagem:
- Soma (+)
- Subtração (-)
- Multiplicação (*)
- Divisão (/)
- Porcentagem (%)

Com validação segura de sintaxe via AST (sem eval arbitrário)
e tratamento específico para divisão por zero, erros de sintaxe e regras de porcentagem comercial.
"""

import ast
import operator
import re
import sys
from typing import Union, Tuple

# Operadores suportados
OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

class CalculationError(Exception):
    """Exceção customizada para erros de cálculo."""
    pass

def _eval_node(node: ast.AST) -> Union[int, float]:
    """Avalia nós permitidos da AST de forma estritamente segura."""
    if isinstance(node, ast.Constant): # Python 3.8+ (números literais)
        if isinstance(node.value, (int, float)):
            return node.value
        raise CalculationError(f"Tipo de valor não suportado: {type(node.value).__name__}")
    
    if isinstance(node, ast.BinOp):
        op_type = type(node.op)
        if op_type not in OPERATORS:
            raise CalculationError("Operação não suportada nesta versão (apenas +, -, *, / são permitidos)")
        
        left_val = _eval_node(node.left)
        right_val = _eval_node(node.right)
        
        if op_type is ast.Div:
            if right_val == 0:
                raise CalculationError("Não é possível dividir por zero")
        
        op_func = OPERATORS[op_type]
        return op_func(left_val, right_val)
    
    if isinstance(node, ast.UnaryOp):
        op_type = type(node.op)
        if op_type not in (ast.USub, ast.UAdd):
            raise CalculationError("Operador unário inválido")
        operand = _eval_node(node.operand)
        return OPERATORS[op_type](operand)

    raise CalculationError("Expressão inválida ou símbolo não reconhecido")

def calcular(expressao: str) -> Tuple[bool, Union[int, float, str]]:
    """
    Avalia a expressão matemática informada pelo usuário com suporte a porcentagem.
    Retorna uma tupla (sucesso: bool, resultado_ou_erro: Union[int, float, str]).
    """
    if not expressao or not expressao.strip():
        return False, "Digite uma expressão matemática"
    
    # Sanitização básica de caracteres comuns
    expr_limpa = (
        expressao.strip()
        .replace("x", "*")
        .replace("X", "*")
        .replace("÷", "/")
        .replace(",", ".")
    )
    
    expr_sem_espacos = expr_limpa.replace(" ", "")

    # Validação de operadores consecutivos inválidos (ex: ++, --, +*, //, **, %%, etc.)
    if re.search(r'[\+\-\*/]{2,}', expr_sem_espacos) or re.search(r'%{2,}', expr_sem_espacos):
        return False, "Expressão inválida: operadores consecutivos não permitidos"
    
    # Operador binário seguido imediatamente de porcentagem (+%, -%, *%, /%)
    if re.search(r'[\+\-\*/]%', expr_sem_espacos):
        return False, "Expressão inválida: operador seguido de porcentagem não permitido"
    
    # Não pode iniciar com operador de multiplicação, divisão ou porcentagem
    if re.search(r'^[*/%]', expr_sem_espacos):
        return False, "Expressão inválida: não pode iniciar com multiplicação, divisão ou porcentagem"
    
    # Não pode terminar com operador aritmético pendente (+, -, *, /)
    if re.search(r'[\+\-\*/]$', expr_sem_espacos):
        return False, "Expressão incompleta: operador pendente no final"

    # Validação de caracteres matemáticos permitidos
    if not re.match(r'^[0-9\.\+\-\*/\(\)\s%]+$', expr_limpa):
        return False, "Expressão inválida: contém caracteres não numéricos"
    
    # Transformação de porcentagem para sintaxe aritmética interpretável pela AST
    expr_ast = expr_limpa

    # 1. Acréscimo e desconto percentual comercial: A + B% -> (A + (A * ((B) / 100))) e A - B% -> (A - (A * ((B) / 100)))
    # Garante que não combine com outro % à esquerda
    expr_ast = re.sub(
        r'(\b\d+(?:\.\d+)?|\))\s*([\+\-])\s*(\b\d+(?:\.\d+)?|\([^)]+\))%',
        r'(\1 \2 (\1 * ((\3) / 100)))',
        expr_ast
    )

    # 2. Porcentagem direta e multiplicativa/divisiva: X% -> ((X) / 100)
    expr_ast = re.sub(
        r'(\b\d+(?:\.\d+)?|\([^)]+\))%',
        r'((\1) / 100)',
        expr_ast
    )
    
    try:
        # Analisa a expressão como árvore sintática
        parsed = ast.parse(expr_ast, mode='eval')
        resultado = _eval_node(parsed.body)
        
        # Formata resultado (se for número inteiro exato, como 4.0 -> 4)
        if isinstance(resultado, float) and resultado.is_integer():
            resultado = int(resultado)
        elif isinstance(resultado, float):
            resultado = round(resultado, 8)
            
        return True, resultado
    except ZeroDivisionError:
        return False, "Não é possível dividir por zero"
    except CalculationError as ce:
        return False, str(ce)
    except SyntaxError:
        return False, "Expressão inválida. Verifique os operadores digitados"
    except Exception as e:
        return False, f"Erro ao calcular: {str(e)}"

def executar_cli():
    """Modo interativo via linha de comando."""
    print("=" * 50)
    print(" Calculadora Python v2.0 - (+, -, *, /, %)")
    print(" Exemplos: '5+7', '10*2', '100+10%', '200-15%', '50%'")
    print(" Digite 'sair' ou pressione Ctrl+C para encerrar.")
    print("=" * 50)
    
    while True:
        try:
            entrada = input("\nDigite a expressão: ").strip()
            if entrada.lower() in ("sair", "exit", "quit"):
                print("Encerrando calculadora. Até mais!")
                break
            
            sucesso, resultado = calcular(entrada)
            if sucesso:
                print(f"-> Resultado: {resultado}")
            else:
                print(f"[!] Erro: {resultado}")
        except (KeyboardInterrupt, EOFError):
            print("\nEncerrando calculadora. Até mais!")
            break

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Execução direta com argumento ex: python3 calculator.py "100+10%"
        arg_expr = " ".join(sys.argv[1:])
        sucesso, res = calcular(arg_expr)
        if sucesso:
            print(res)
            sys.exit(0)
        else:
            print(f"Erro: {res}", file=sys.stderr)
            sys.exit(1)
    else:
        executar_cli()
