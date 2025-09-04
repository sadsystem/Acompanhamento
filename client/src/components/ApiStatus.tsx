import { useState, useEffect, useRef } from 'react';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { API_BASE_URL } from '../config/config';

export function ApiStatus() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [responseTime, setResponseTime] = useState<number>(0);
  const [details, setDetails] = useState<any>(null);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveErrors = useRef<number>(0);
  
  // Intervalo base: 5 minutos (muito mais eficiente)
  const BASE_INTERVAL = 5 * 60 * 1000; // 5 minutos
  const MAX_INTERVAL = 15 * 60 * 1000; // 15 minutos máximo
  
  const getCheckInterval = () => {
    // Backoff exponencial: se há erros consecutivos, aumenta o intervalo
    const multiplier = Math.min(Math.pow(2, consecutiveErrors.current), 3);
    return Math.min(BASE_INTERVAL * multiplier, MAX_INTERVAL);
  };
  
  useEffect(() => {
    const checkApi = async () => {
      // Não fazer polling se a aba não está ativa (economiza recursos)
      if (document.hidden) {
        return;
      }
      
      try {
        const startTime = Date.now();
        // Usar HEAD request para economizar banda (só precisamos saber se está online)
        const response = await fetch(`${API_BASE_URL}/health`, {
          method: 'HEAD', // HEAD ao invés de GET - mais eficiente
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          // Timeout de 10 segundos para evitar requests longos
          signal: AbortSignal.timeout(10000)
        });
        const endTime = Date.now();
        setLastCheck(new Date());
        
        if (response.ok) {
          setApiStatus('online');
          setResponseTime(endTime - startTime);
          setDetails({ status: 'healthy', timestamp: new Date().toISOString() });
          consecutiveErrors.current = 0; // Reset contador de erros
        } else {
          setApiStatus('offline');
          setResponseTime(0);
          setDetails({ error: response.statusText, status: response.status });
          consecutiveErrors.current++;
        }
      } catch (error) {
        console.warn('API status check failed (this is normal):', error);
        setApiStatus('offline');
        setResponseTime(0);
        setDetails({ error: String(error) });
        consecutiveErrors.current++;
      }
      
      // Reagendar próxima verificação com interval dinâmico
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
      intervalRef.current = setTimeout(checkApi, getCheckInterval());
    };
    
    // Verificação inicial
    checkApi();
    
    // Listener para mudanças de visibilidade da página
    const handleVisibilityChange = () => {
      if (!document.hidden && apiStatus === 'offline') {
        // Se a página ficou visível e estava offline, fazer uma verificação
        checkApi();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Remover dependências desnecessárias
  
  const getDisplayText = () => {
    switch (apiStatus) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      default: return 'Verificando...';
    }
  };

  const getVariant = () => {
    switch (apiStatus) {
      case 'online': return 'success';
      case 'offline': return 'destructive';
      default: return 'default';
    }
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="fixed bottom-16 left-4 z-50 cursor-pointer">
            <Badge 
              variant={getVariant() as any} 
              className={`text-xs font-medium transition-all duration-200 inline-flex items-center px-2.5 py-1 ${
                apiStatus === 'online' 
                  ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200' 
                  : apiStatus === 'offline' 
                  ? 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200' 
                  : 'bg-gray-100 text-gray-800 border-gray-300'
              }`}
            >
              {getDisplayText()}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-2 bg-slate-900 text-white">
          <div className="text-xs">
            <p>Status: {getDisplayText()}</p>
            <p>Última verificação: {lastCheck.toLocaleTimeString()}</p>
            {apiStatus === 'online' && responseTime > 0 && (
              <p>Tempo de resposta: {responseTime}ms</p>
            )}
            <p>Próxima verificação: {Math.ceil(getCheckInterval() / 60000)} min</p>
            {consecutiveErrors.current > 0 && (
              <p>Erros consecutivos: {consecutiveErrors.current}</p>
            )}
            <p className="text-gray-300 mt-1">Verificação otimizada para economizar recursos</p>
            {details && (
              <pre className="mt-1 whitespace-pre-wrap overflow-auto max-h-32">
                {JSON.stringify(details, null, 2)}
              </pre>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
