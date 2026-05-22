import React, { useState, useEffect, useCallback } from 'react';
import { Server, Wifi, Loader2, AlertCircle, RefreshCw, Activity } from 'lucide-react';
import { API_BASE_URL } from '../lib/api';

interface BackendStatusGateProps {
  children: React.ReactNode;
}

export default function BackendStatusGate({ children }: BackendStatusGateProps) {
  const [isAwake, setIsAwake] = useState<boolean | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [manualRetrying, setManualRetrying] = useState<boolean>(false);

  // Check health status once
  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000); // 4s timeout for each ping

      const res = await fetch(`${API_BASE_URL}/api/status`, {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });
      clearTimeout(id);

      if (res.ok) {
        const data = await res.json();
        return data.status === 'ok';
      }
      return false;
    } catch (e) {
      return false;
    }
  }, []);

  // Main monitoring loop
  useEffect(() => {
    let active = true;
    let checkInterval: any;
    let timerInterval: any;

    const performCheck = async (isFirstCheck: boolean = false) => {
      const awake = await checkHealth();
      if (!active) return;

      if (awake) {
        if (isFirstCheck) {
          // Se o servidor já estava acordado no carregamento inicial, libera imediatamente sem piscar telas
          setIsAwake(true);
        } else {
          // Se estava na tela de carregamento, mostra 100% de progresso e depois libera de forma suave
          setProgress(100);
          setTimeout(() => {
            if (active) setIsAwake(true);
          }, 800);
        }
      } else {
        if (isFirstCheck) {
          // Se a primeira verificação falhar (ex: erro de rede imediato), já ativa a tela de carregamento
          setIsAwake(false);
        }
        setErrorCount((prev) => prev + 1);
      }
    };

    // First immediate check
    performCheck(true);

    // Dynamic timer to simulate progress and count seconds
    timerInterval = setInterval(() => {
      setElapsedTime((prev) => {
        const nextTime = prev + 1;
        
        // Simulated progress logic: fast at first, then slows down as it approaches 95%
        setProgress((currProgress) => {
          if (currProgress >= 95) return 95;
          if (nextTime < 10) return currProgress + 3;      // 0-10s: ~30%
          if (nextTime < 25) return currProgress + 1.5;    // 10-25s: ~60%
          if (nextTime < 45) return currProgress + 0.8;    // 25-45s: ~85%
          return currProgress + 0.3;                       // 45s+: caps near 95%
        });

        return nextTime;
      });
    }, 1000);

    // Ping the backend every 3.5 seconds
    checkInterval = setInterval(() => {
      performCheck(false);
    }, 3500);

    return () => {
      active = false;
      clearInterval(checkInterval);
      clearInterval(timerInterval);
    };
  }, [checkHealth]);

  const handleManualRetry = async () => {
    setManualRetrying(true);
    const awake = await checkHealth();
    setManualRetrying(false);
    if (awake) {
      setProgress(100);
      setTimeout(() => {
        setIsAwake(true);
      }, 600);
    } else {
      setErrorCount((prev) => prev + 1);
    }
  };

  // 1. Estado Inicial: Verifica se o servidor já está acordado.
  // Durante o primeiro segundo, não renderizamos nada (retornando null) para evitar
  // qualquer piscada de tela caso o servidor já esteja pronto (resposta em ~100ms).
  if (isAwake === null) {
    if (elapsedTime < 1.0) {
      return null;
    } else {
      // Se passar de 1 segundo sem resposta, significa que o servidor está dormindo (Render cold-start)
      // Ativamos explicitamente o estado para mostrar a tela de carregamento premium
      setIsAwake(false);
    }
  }

  // 2. Awake State: Render standard application
  if (isAwake === true) {
    return <>{children}</>;
  }

  // 3. Sleeping / Waking State: Render gorgeous sleeping layout
  // Compute text status messages dynamically based on elapsed time
  let statusMessage = "Iniciando verificação do servidor...";
  if (elapsedTime < 5) {
    statusMessage = "Localizando servidor backend...";
  } else if (elapsedTime < 15) {
    statusMessage = "O servidor gratuito no Render está iniciando. Isso ocorre após 15min de inatividade.";
  } else if (elapsedTime < 30) {
    statusMessage = "Inicializando banco de dados e APIs do sistema...";
  } else if (elapsedTime < 45) {
    statusMessage = "Quase lá! Restabelecendo conexões seguras...";
  } else {
    statusMessage = "Finalizando boot da aplicação. Agradecemos a paciência!";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070A13] overflow-hidden font-sans">
      {/* Decorative gradient glowing spheres */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-600/10 blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-600/10 blur-[120px] animate-pulse" />

      {/* Grid Pattern Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:16px_16px] opacity-70" />

      <div className="relative w-full max-w-md p-8 mx-4 rounded-3xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-2xl shadow-2xl shadow-indigo-950/20 text-center space-y-6">
        {/* Animated Server & Pulse Indicator */}
        <div className="relative w-24 h-24 mx-auto">
          {/* Radial animated waves */}
          <div className="absolute inset-0 rounded-3xl bg-indigo-500/20 animate-ping opacity-75 duration-1000" />
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 blur-md" />
          
          <div className="relative w-full h-full rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/30 flex flex-col items-center justify-center">
            {progress === 100 ? (
              <Wifi className="w-9 h-9 text-white animate-bounce" />
            ) : (
              <Server className="w-9 h-9 text-white animate-pulse" />
            )}
            
            <div className="absolute bottom-2 flex items-center gap-1">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-bold text-white/80 uppercase tracking-widest">
                {progress === 100 ? "Online" : "Waking"}
              </span>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100 tracking-tight flex items-center justify-center gap-2">
            <span>Backend acordando/ligando</span>
            {progress < 100 && (
              <Loader2 className="w-4.5 h-4.5 text-indigo-400 animate-spin" />
            )}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed px-2">
            Tenham um ótimo uso!
          </p>
        </div>

        {/* Progress Bar & Percentage */}
        <div className="space-y-2.5 pt-2">
          <div className="flex justify-between items-center text-xs font-semibold px-1">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              {progress === 100 ? "Pronto!" : `Progresso Estimado: ${Math.round(progress)}%`}
            </span>
            <span className="text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5 text-[10px]">
              {elapsedTime}s decorridos
            </span>
          </div>

          {/* Glassmorphic progress bar */}
          <div className="w-full h-3 bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.06] p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(99,102,241,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Dynamic Status message */}
        <div className="py-2.5 px-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center min-h-[50px]">
          <p className="text-xs font-medium text-indigo-200/90 leading-relaxed animate-pulse">
            {progress === 100 ? "Conexão estabelecida com sucesso! Carregando..." : statusMessage}
          </p>
        </div>

        {/* Info & Manual Action */}
        <div className="pt-2 border-t border-white/[0.05] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 text-left font-mono truncate max-w-[200px]" title={API_BASE_URL}>
              Host: {API_BASE_URL}
            </span>
            <button
              onClick={handleManualRetry}
              disabled={manualRetrying || progress === 100}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                manualRetrying || progress === 100
                  ? 'bg-slate-800/40 text-slate-500 border-slate-800'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20 active:scale-95'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${manualRetrying ? 'animate-spin' : ''}`} />
              <span>Reverificar</span>
            </button>
          </div>

          {errorCount > 8 && (
            <div className="flex gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-left">
              <AlertCircle className="w-4 h-4 mt-0.5 text-red-400 flex-shrink-0" />
              <div className="text-[10px] space-y-1">
                <p className="font-semibold">O servidor está demorando muito para responder.</p>
                <p className="opacity-90">Verifique se você está conectado à internet. Se o problema persistir, o serviço do Render pode estar passando por manutenção.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
