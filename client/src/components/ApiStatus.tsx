import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';

export function ApiStatus() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [message, setMessage] = useState<string>('');
  
  useEffect(() => {
    const checkApi = async () => {
      try {
        const startTime = Date.now();
        const response = await fetch('/api/health', { 
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        const endTime = Date.now();
        
        if (response.ok) {
          setApiStatus('online');
          setMessage(`API OK (${endTime - startTime}ms)`);
        } else {
          setApiStatus('offline');
          setMessage(`Status: ${response.status}`);
        }
      } catch (error) {
        console.error('API check failed:', error);
        setApiStatus('offline');
        setMessage('Conexão falhou');
      }
    };
    
    checkApi();
    const interval = setInterval(checkApi, 60000); // Check every minute
    
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
    <div className="fixed bottom-2 left-4 z-50">
      <Badge variant={getVariant() as any} className="text-xs">
        API: {apiStatus === 'checking' ? 'Verificando...' : message}
      </Badge>
    </div>
  );
}
