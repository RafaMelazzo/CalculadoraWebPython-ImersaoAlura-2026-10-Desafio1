"""
Calculadora Simples em Python com suporte às quatro operações básicas:
- Soma (+)
- Subtração (-)
- Multiplicação (*)
- Divisão (/)

Com validação segura de sintaxe via AST (sem eval arbitrário)
e tratamento específico para divisão por zero e erros de sintaxe.
"""

import ast
import operator
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
    Avalia a expressão matemática informada pelo usuário.
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
    
    # Validação de operadores consecutivos ou sintaxe inválida de calculadora
    import re
    # Operadores duplicados ou consecutivos como ++, --, +*, *+, //, **, etc.
    if re.search(r'[\+\-\*/]{2,}', expr_limpa.replace(" ", "")):
        return False, "Expressão inválida: operadores consecutivos não permitidos"
    
    # Operador no início (exceto unário - ou +) ou operador no fim
    expr_sem_espacos = expr_limpa.replace(" ", "")
    if re.search(r'^[*/]', expr_sem_espacos):
        return False, "Expressão inválida: não pode iniciar com multiplicação ou divisão"
    if re.search(r'[\+\-\*/]$', expr_sem_espacos):
        return False, "Expressão incompleta: operador pendente no final"
    
    try:
        # Analisa a expressão como árvore sintática
        parsed = ast.parse(expr_limpa, mode='eval')
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
    print("=" * 45)
    print(" Calculadora Python - Operações Básicas (+, -, *, /)")
    print(" Exemplos de entrada: '5+7', '10*2', '20/4', '15-8'")
    print(" Digite 'sair' ou pressione Ctrl+C para encerrar.")
    print("=" * 45)
    
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
        # Execução direta com argumento ex: python3 calculator.py "5+7"
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
