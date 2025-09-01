import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export function ApiStatus() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [message, setMessage] = useState<string>('');
  const [details, setDetails] = useState<any>(null);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  
  useEffect(() => {
    const checkApi = async () => {
      try {
        const startTime = Date.now();
        // Use window.location.origin to ensure we're using the correct base URL
        const baseUrl = window.location.origin;
        // Add cache busting timestamp parameter
        const response = await fetch(`${baseUrl}/api/health?_t=${Date.now()}`, { 
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
          setMessage(`API OK (${endTime - startTime}ms)`);
          setDetails(responseData);
        } else {
          setApiStatus('offline');
          setMessage(`Status: ${response.status}`);
          setDetails({ error: response.statusText });
        }
      } catch (error) {
        console.error('API check failed:', error);
        setApiStatus('offline');
        setMessage('Conexão falhou');
        setDetails({ error: String(error) });
      }
    };
    
    checkApi();
    const interval = setInterval(checkApi, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
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
          <div className="fixed bottom-2 left-4 z-50 cursor-pointer">
            <Badge variant={getVariant() as any} className="text-xs">
              API: {apiStatus === 'checking' ? 'Verificando...' : message}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-2 bg-slate-900 text-white">
          <div className="text-xs">
            <p>Última verificação: {lastCheck.toLocaleTimeString()}</p>
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
