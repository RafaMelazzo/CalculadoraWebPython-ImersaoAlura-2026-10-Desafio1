/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  calculateExpression,
  CalculationResult,
} from './utils/calculator';
import {
  History,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Keyboard,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: string;
}

const CRITERIOS_DE_TESTE = [
  { label: '5 + 7', expr: '5+7', expected: '12', tag: 'Soma' },
  { label: '10 * 2', expr: '10*2', expected: '20', tag: 'Multiplicação' },
  { label: '15 / 3', expr: '15/3', expected: '5', tag: 'Divisão' },
  { label: '20 - 8', expr: '20-8', expected: '12', tag: 'Subtração' },
  { label: '10 / 0', expr: '10/0', expected: 'Erro (divisão por zero)', tag: 'Divisão por Zero' },
  { label: '3.5 + 4.2', expr: '3.5+4.2', expected: '7.7', tag: 'Decimais' },
  { label: '5 - 12', expr: '5-12', expected: '-7', tag: 'Negativos' },
  { label: '5++2', expr: '5++2', expected: 'Erro de sintaxe', tag: 'Operador Duplicado' },
  { label: '*9', expr: '*9', expected: 'Erro de sintaxe', tag: 'Operador Inicial' },
];

export default function App() {
  const [expression, setExpression] = useState<string>('');
  const [lastCalculation, setLastCalculation] = useState<CalculationResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showPythonCode, setShowPythonCode] = useState<boolean>(false);
  const [showTestPanel, setShowTestPanel] = useState<boolean>(true);
  const [justCalculated, setJustCalculated] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Som suave de feedback de clique
  const playClickSound = useCallback((frequency = 440, type: OscillatorType = 'sine') => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Ignora erro de áudio se restrito pelo navegador
    }
  }, [soundEnabled]);

  // Ação: Zerar tudo (AC / Esc)
  const handleClear = useCallback(() => {
    playClickSound(260, 'triangle');
    setExpression('');
    setLastCalculation(null);
    setJustCalculated(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [playClickSound]);

  // Ação: Backspace (corrigir entrada, apagando apenas o último caractere)
  const handleBackspace = useCallback(() => {
    playClickSound(350);
    setExpression((prev) => {
      if (!prev || prev.length === 0) return '';
      return prev.slice(0, -1);
    });
    setLastCalculation(null);
    setJustCalculated(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [playClickSound]);

  // Ação: Inserir caractere ou operador
  const handleInput = useCallback((char: string) => {
    playClickSound(520);

    setExpression((prev) => {
      // Se acabou de calcular:
      if (justCalculated) {
        setJustCalculated(false);
        // Se for operador (+, -, *, /), encadeia com o resultado anterior
        if (['+', '-', '*', '/'].includes(char) && lastCalculation?.success && lastCalculation.result !== undefined) {
          return `${lastCalculation.result}${char}`;
        }
        // Se for número ou outro valor, inicia nova expressão
        return char;
      }

      // Evita repetição de ponto decimal consecutivo
      if (char === '.' && prev.endsWith('.')) {
        return prev;
      }

      return prev + char;
    });

    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [justCalculated, lastCalculation, playClickSound]);

  // Ação: Calcular resultado (= ou Enter)
  const handleCalculate = useCallback((exprToCalc?: string) => {
    const targetExpr = (exprToCalc !== undefined ? exprToCalc : expression).trim();

    if (!targetExpr) {
      setLastCalculation({
        success: false,
        error: 'Digite uma expressão matemática (ex: 5+7)',
      });
      playClickSound(220, 'square');
      return;
    }

    playClickSound(660);
    const result = calculateExpression(targetExpr);
    setLastCalculation(result);
    setJustCalculated(true);

    if (result.success && result.formattedResult !== undefined) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setHistory((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          expression: targetExpr,
          result: result.formattedResult!,
          timestamp: timeStr,
        },
        ...prev.slice(0, 29), // Manter até 30 registros
      ]);
    } else {
      playClickSound(220, 'sawtooth');
    }

    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [expression, playClickSound]);

  // Carregar caso de teste rápido
  const loadTestCase = (testExpr: string) => {
    setExpression(testExpr);
    setJustCalculated(false);
    handleCalculate(testExpr);
  };

  // Suporte a atalhos do teclado físico (conforme instrução do usuário)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Se a tecla pressionada for Escape -> ZERAR a tela e o estado interno
      if (e.key === 'Escape') {
        e.preventDefault();
        setActiveKey('Escape');
        handleClear();
        setTimeout(() => setActiveKey(null), 150);
        return;
      }

      // Se a tecla for Backspace -> CORRIGIR a entrada (apagar último caractere)
      if (e.key === 'Backspace') {
        // Se o foco já estiver no input nativo, o evento padrão do input apagará.
        // Se o foco estiver fora do input, chamamos handleBackspace explicitamente.
        if (document.activeElement !== inputRef.current) {
          e.preventDefault();
          setActiveKey('Backspace');
          handleBackspace();
          setTimeout(() => setActiveKey(null), 150);
        } else {
          setActiveKey('Backspace');
          setTimeout(() => setActiveKey(null), 150);
        }
        return;
      }

      // Se for Enter ou = -> calcular
      if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        setActiveKey('Enter');
        handleCalculate();
        setTimeout(() => setActiveKey(null), 150);
        return;
      }

      // Números e operadores básicos
      const validChars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '-', '*', '/', '.', ',', '(', ')'];
      if (validChars.includes(e.key)) {
        setActiveKey(e.key);
        setTimeout(() => setActiveKey(null), 150);

        // Se o foco estiver fora do input, injeta o caractere
        if (document.activeElement !== inputRef.current) {
          e.preventDefault();
          const mappedChar = e.key === ',' ? '.' : e.key;
          handleInput(mappedChar);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCalculate, handleClear, handleBackspace, handleInput]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Barra Superior / Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30 px-4 py-3.5 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 font-mono font-bold text-slate-950 text-lg">
              ±
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-100 tracking-tight leading-none">
                Calculadora Web
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Quatro operações básicas com validação estrita e engine Python
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Alternar painel de testes */}
            <button
              type="button"
              onClick={() => setShowTestPanel((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                showTestPanel
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Alternar painel de critérios de teste"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Critérios de Teste</span>
            </button>

            {/* Alternar Histórico */}
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                showHistory
                  ? 'bg-slate-800 text-slate-200 border-slate-700'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Exibir histórico de cálculos"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Histórico</span>
              {history.length > 0 && (
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded-full font-mono text-slate-300">
                  {history.length}
                </span>
              )}
            </button>

            {/* Ver Código Python */}
            <button
              type="button"
              onClick={() => setShowPythonCode(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200 transition-all flex items-center gap-1.5"
              title="Visualizar módulo Python calculator.py"
            >
              <Code2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Código Python</span>
            </button>

            {/* Mudo / Som */}
            <button
              type="button"
              onClick={() => setSoundEnabled((s) => !s)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 transition-colors"
              title={soundEnabled ? 'Silenciar cliques' : 'Ativar som de cliques'}
              aria-label="Controle de áudio"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Coluna da Calculadora (Lado Esquerdo / 7 colunas fixas) */}
          <div className="mx-auto w-full lg:col-span-7 max-w-md">
            <div className="bg-slate-900 border border-slate-800/90 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-black/60 relative overflow-hidden">
              
              {/* Efeito sutil de brilho superior */}
              <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent pointer-events-none" />

              {/* Visor / Display da Calculadora */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-5 focus-within:border-amber-500/50 transition-all shadow-inner">
                {/* Linha de expressão anterior / status */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1 min-h-[1.25rem]">
                  <span className="font-mono truncate max-w-[80%]">
                    {justCalculated && lastCalculation?.success
                      ? `Expressão calculada: ${expression}`
                      : 'Expressão atual:'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {expression.length} {expression.length === 1 ? 'char' : 'chars'}
                  </span>
                </div>

                {/* Campo de Entrada Direta de Texto (Requisito RF01) */}
                <div className="relative flex items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={expression}
                    onChange={(e) => {
                      setExpression(e.target.value);
                      setJustCalculated(false);
                      setLastCalculation(null);
                    }}
                    placeholder="Digite ex: 5+7 ou 10*2"
                    aria-label="Expressão matemática"
                    className="w-full bg-transparent text-right font-mono text-2xl sm:text-3xl font-semibold text-slate-100 placeholder:text-slate-600 focus:outline-none tracking-tight"
                    autoFocus
                  />
                </div>

                {/* Linha do Resultado ou Erro */}
                <div className="mt-2 pt-2 border-t border-slate-800/60 min-h-[2.5rem] flex items-center justify-end">
                  {lastCalculation && !lastCalculation.success && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-rose-400 bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-900/50 animate-in fade-in duration-150">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{lastCalculation.error}</span>
                    </div>
                  )}

                  {lastCalculation && lastCalculation.success && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-slate-400 font-mono">=</span>
                      <span className="font-mono text-3xl sm:text-4xl font-bold text-amber-400 tracking-tight">
                        {lastCalculation.formattedResult}
                      </span>
                    </div>
                  )}

                  {!lastCalculation && (
                    <span className="text-xs text-slate-400 font-mono">
                      Pressione <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Enter</kbd> ou clique em <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">=</kbd>
                    </span>
                  )}
                </div>
              </div>

              {/* Teclado da Calculadora */}
              <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
                {/* Linha 1: Limpar (AC), Backspace (⌫), Parênteses */}
                <button
                  type="button"
                  onClick={handleClear}
                  className={`py-3.5 rounded-xl font-mono text-sm font-semibold transition-all flex flex-col items-center justify-center border ${
                    activeKey === 'Escape'
                      ? 'bg-rose-500 text-white scale-95 border-rose-400'
                      : 'bg-rose-950/30 text-rose-300 border-rose-900/40 hover:bg-rose-900/40 hover:text-rose-100 active:scale-95'
                  }`}
                  title="Zerar tela e estado interno (Atalho: tecla física Esc)"
                >
                  <span className="text-sm font-semibold">AC</span>
                  <span className="text-[9px] text-rose-400/80 font-normal mt-0.5">Esc</span>
                </button>

                <button
                  type="button"
                  onClick={handleBackspace}
                  className={`py-3.5 rounded-xl font-mono text-sm font-semibold transition-all flex flex-col items-center justify-center border ${
                    activeKey === 'Backspace'
                      ? 'bg-slate-700 text-white scale-95 border-slate-600'
                      : 'bg-slate-800/80 text-slate-200 border-slate-700/60 hover:bg-slate-750 hover:text-white active:scale-95'
                  }`}
                  title="Apagar último caractere (Atalho: tecla física Backspace)"
                >
                  <span className="text-sm font-semibold">⌫</span>
                  <span className="text-[9px] text-slate-400 font-normal mt-0.5">Backspace</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleInput('(')}
                  className={`py-3.5 rounded-xl font-mono text-base font-medium transition-all border ${
                    activeKey === '('
                      ? 'bg-slate-700 text-white scale-95 border-slate-600'
                      : 'bg-slate-800/50 text-slate-300 border-slate-800 hover:bg-slate-800 active:scale-95'
                  }`}
                >
                  (
                </button>

                <button
                  type="button"
                  onClick={() => handleInput(')')}
                  className={`py-3.5 rounded-xl font-mono text-base font-medium transition-all border ${
                    activeKey === ')'
                      ? 'bg-slate-700 text-white scale-95 border-slate-600'
                      : 'bg-slate-800/50 text-slate-300 border-slate-800 hover:bg-slate-800 active:scale-95'
                  }`}
                >
                  )
                </button>

                {/* Linha 2: 7, 8, 9, Divisão (/) */}
                {['7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleInput(digit)}
                    className={`py-3.5 rounded-xl font-mono text-lg font-semibold transition-all border ${
                      activeKey === digit
                        ? 'bg-amber-500 text-slate-950 scale-95 border-amber-400'
                        : 'bg-slate-800/70 text-slate-100 border-slate-700/40 hover:bg-slate-750 hover:border-slate-600 active:scale-95'
                    }`}
                  >
                    {digit}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handleInput('/')}
                  className={`py-3.5 rounded-xl font-mono text-lg font-semibold transition-all border ${
                    activeKey === '/'
                      ? 'bg-amber-500 text-slate-950 scale-95 border-amber-400'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 active:scale-95'
                  }`}
                  title="Divisão (/)"
                >
                  ÷
                </button>

                {/* Linha 3: 4, 5, 6, Multiplicação (*) */}
                {['4', '5', '6'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleInput(digit)}
                    className={`py-3.5 rounded-xl font-mono text-lg font-semibold transition-all border ${
                      activeKey === digit
                        ? 'bg-amber-500 text-slate-950 scale-95 border-amber-400'
                        : 'bg-slate-800/70 text-slate-100 border-slate-700/40 hover:bg-slate-750 hover:border-slate-600 active:scale-95'
                    }`}
                  >
                    {digit}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handleInput('*')}
                  className={`py-3.5 rounded-xl font-mono text-lg font-semibold transition-all border ${
                    activeKey === '*'
                      ? 'bg-amber-500 text-slate-950 scale-95 border-amber-400'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 active:scale-95'
                  }`}
                  title="Multiplicação (*)"
                >
                  ×
                </button>

                {/* Linha 4: 1, 2, 3, Subtração (-) */}
                {['1', '2', '3'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleInput(digit)}
                    className={`py-3.5 rounded-xl font-mono text-lg font-semibold transition-all border ${
                      activeKey === digit
                        ? 'bg-amber-500 text-slate-950 scale-95 border-amber-400'
                        : 'bg-slate-800/70 text-slate-100 border-slate-700/40 hover:bg-slate-750 hover:border-slate-600 active:scale-95'
                    }`}
                  >
                    {digit}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handleInput('-')}
                  className={`py-3.5 rounded-xl font-mono text-lg font-semibold transition-all border ${
                    activeKey === '-'
                      ? 'bg-amber-500 text-slate-950 scale-95 border-amber-400'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 active:scale-95'
                  }`}
                  title="Subtração (-)"
                >
                  −
                </button>

                {/* Linha 5: 0, Ponto (.), Igualdade (=), Soma (+) */}
                <button
                  type="button"
                  onClick={() => handleInput('0')}
                  className={`py-3.5 rounded-xl font-mono text-lg font-semibold transition-all border ${
                    activeKey === '0'
                      ? 'bg-amber-500 text-slate-950 scale-95 border-amber-400'
                      : 'bg-slate-800/70 text-slate-100 border-slate-700/40 hover:bg-slate-750 hover:border-slate-600 active:scale-95'
                  }`}
                >
                  0
                </button>

                <button
                  type="button"
                  onClick={() => handleInput('.')}
                  className={`py-3.5 rounded-xl font-mono text-lg font-semibold transition-all border ${
                    activeKey === '.' || activeKey === ','
                      ? 'bg-amber-500 text-slate-950 scale-95 border-amber-400'
                      : 'bg-slate-800/70 text-slate-100 border-slate-700/40 hover:bg-slate-750 hover:border-slate-600 active:scale-95'
                  }`}
                  title="Ponto decimal (.)"
                >
                  .
                </button>

                <button
                  type="button"
                  onClick={() => handleCalculate()}
                  className={`py-3.5 rounded-xl font-mono text-lg font-bold transition-all shadow-md flex items-center justify-center border ${
                    activeKey === 'Enter' || activeKey === '='
                      ? 'bg-amber-400 text-slate-950 scale-95 shadow-amber-500/40 border-amber-300'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400/30 shadow-amber-500/20 hover:brightness-110 active:scale-95'
                  }`}
                  title="Calcular resultado (Atalho: Enter ou =)"
                >
                  =
                </button>

                <button
                  type="button"
                  onClick={() => handleInput('+')}
                  className={`py-3.5 rounded-xl font-mono text-lg font-semibold transition-all border ${
                    activeKey === '+'
                      ? 'bg-amber-500 text-slate-950 scale-95 border-amber-400'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 active:scale-95'
                  }`}
                  title="Soma (+)"
                >
                  +
                </button>
              </div>

              {/* Guia discreto de atalhos físicos do teclado */}
              <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Keyboard className="w-3.5 h-3.5 text-slate-400" />
                  <span>Teclado físico ativo</span>
                </span>
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span><strong className="text-slate-300">Esc:</strong> Zerar tudo</span>
                  <span>·</span>
                  <span><strong className="text-slate-300">⌫:</strong> Corrigir</span>
                  <span>·</span>
                  <span><strong className="text-slate-300">Enter:</strong> Calcular</span>
                </div>
              </div>

            </div>
          </div>

          {/* Coluna Lateral: Critérios de Teste e/ou Histórico */}
          <div className="w-full lg:col-span-5 space-y-4">
            
            {/* Painel de Validação dos Critérios de Teste da Primeira Versão */}
            {showTestPanel && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-semibold text-slate-200">
                      Critérios de Teste (v1)
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-400">Clique para testar</span>
                </div>

                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Casos de teste acordados na etapa de especificação: operações básicas, decimais, negativos e tratamento de erros.
                </p>

                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {CRITERIOS_DE_TESTE.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => loadTestCase(item.expr)}
                      className="w-full text-left p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-800/40 transition-all group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-semibold text-amber-300 group-hover:text-amber-200">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                          {item.tag}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-slate-400 group-hover:text-slate-200 font-mono">
                        <span>Esperado: {item.expected}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Painel de Histórico de Cálculos */}
            {showHistory && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-300" />
                    <h2 className="text-sm font-semibold text-slate-200">
                      Histórico Recente
                    </h2>
                  </div>
                  {history.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setHistory([])}
                      className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      Limpar histórico
                    </button>
                  )}
                </div>

                {history.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 font-mono">
                    Nenhum cálculo registrado ainda.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setExpression(item.expression);
                          setJustCalculated(false);
                          handleCalculate(item.expression);
                        }}
                        className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-all flex items-center justify-between group"
                        title="Clique para reutilizar"
                      >
                        <div>
                          <div className="text-xs text-slate-400 font-mono group-hover:text-slate-300">
                            {item.expression}
                          </div>
                          <div className="text-sm font-mono font-semibold text-amber-400">
                            = {item.result}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.timestamp}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cartão Informativo de Arquitetura */}
            <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Tratamento Robusto de Erros Ativo</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Divisões por zero e operadores malformados são interceptados de forma segura tanto no frontend quanto no módulo Python correspondente (<code className="text-amber-300 font-mono">calculator.py</code>).
              </p>
            </div>

          </div>

        </div>
      </main>

      {/* Modal: Visualizar Código Python (calculator.py) */}
      {showPythonCode && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-slate-200 font-mono">calculator.py</span>
                <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800/50 px-2 py-0.5 rounded-full font-mono">
                  Python 3.10 AST
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPythonCode(false)}
                className="text-xs text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto font-mono text-xs text-slate-300 bg-slate-950/90 leading-relaxed space-y-3">
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-slate-400 font-sans">
                💡 Este módulo está salvo na raiz do projeto (<code className="text-amber-300 font-mono">/calculator.py</code>). Ele pode ser executado via terminal com <code className="text-emerald-300 font-mono">python3 calculator.py &quot;5+7&quot;</code> ou em modo interativo.
              </div>

              <pre className="text-emerald-400/90 overflow-x-auto p-3 rounded-lg bg-black/40 border border-slate-800/60 font-mono">
{`# Teste rápido no terminal:
python3 calculator.py "10*2"      # Saída: 20
python3 calculator.py "15/3"      # Saída: 5
python3 calculator.py "10/0"      # Erro: Não é possível dividir por zero
python3 calculator.py "5++2"      # Erro: operadores consecutivos não permitidos`}
              </pre>

              <div className="text-slate-400 pt-2 text-[11px] font-sans">
                A validação no frontend web espelha fielmente essas mesmas regras de segurança matemática.
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPythonCode(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-semibold text-xs hover:bg-amber-400 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé Limpo */}
      <footer className="border-t border-slate-800/60 py-4 px-4 text-center text-xs text-slate-400">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Calculadora Web v1.0 · Operações Aritméticas Básicas</span>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>Backspace = Corrigir</span>
            <span>·</span>
            <span>Esc = Zerar</span>
            <span>·</span>
            <span>Enter = Calcular</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
