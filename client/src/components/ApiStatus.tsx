import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { API_BASE_URL } from '../config/config';

export function ApiStatus() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [responseTime, setResponseTime] = useState<number>(0);
  const [details, setDetails] = useState<any>(null);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  
  useEffect(() => {
    const checkApi = async () => {
      try {
        const startTime = Date.now();
        // Add cache busting timestamp parameter
        const response = await fetch(`${API_BASE_URL}/health?_t=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        const endTime = Date.now();
        setLastCheck(new Date());
        
        if (response.ok) {
          const responseData = await response.json();
          setApiStatus('online');
          setResponseTime(endTime - startTime);
          setDetails(responseData);
        } else {
          setApiStatus('offline');
          setResponseTime(0);
          setDetails({ error: response.statusText });
        }
      } catch (error) {
        console.error('API check failed:', error);
        setApiStatus('offline');
        setResponseTime(0);
        setDetails({ error: String(error) });
      }
    };
    
    checkApi();
    const interval = setInterval(checkApi, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
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
