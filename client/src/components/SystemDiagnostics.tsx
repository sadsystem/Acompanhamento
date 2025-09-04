import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { RefreshCw, Activity, Database, Server, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config/config';

interface ApiTest {
  endpoint: string;
  url: string;
  status?: number;
  ok?: boolean;
  ms?: number;
  body?: any;
  error?: string;
  note?: string;
  headers?: Record<string, string>;
}

interface ApiStatusData {
  status: 'checking' | 'online' | 'offline';
  responseTime: number;
  details: any;
  lastCheck: Date;
}

interface SystemDiagnosticsProps {
  trigger?: React.ReactNode;
}

export function SystemDiagnostics({ trigger }: SystemDiagnosticsProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatusData>({
    status: 'checking',
    responseTime: 0,
    details: null,
    lastCheck: new Date()
  });
  const [diagnosticResults, setDiagnosticResults] = useState<ApiTest[]>([]);
  const [issues, setIssues] = useState<string[]>([]);

  // Verificação rápida de status da API
  const checkApiStatus = async () => {
    try {
      const startTime = Date.now();
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'HEAD',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        signal: AbortSignal.timeout(10000)
      });
      const endTime = Date.now();

      if (response.ok) {
        setApiStatus({
          status: 'online',
          responseTime: endTime - startTime,
          details: { 
            status: 'healthy', 
            timestamp: new Date().toISOString(),
            headers: Object.fromEntries(response.headers.entries())
          },
          lastCheck: new Date()
        });
      } else {
        setApiStatus({
          status: 'offline',
          responseTime: 0,
          details: { error: response.statusText, status: response.status },
          lastCheck: new Date()
        });
      }
    } catch (error) {
      setApiStatus({
        status: 'offline',
        responseTime: 0,
        details: { error: String(error) },
        lastCheck: new Date()
      });
    }
  };

  // Diagnóstico completo da API
  const runFullDiagnostics = async () => {
    setLoading(true);
    try {
      const base = API_BASE_URL;
      
      const testSpecs = [
        { ep: 'health', note: 'Verificação de saúde básica' },
        { ep: 'ping', note: 'Função ping dedicada' },
        { ep: 'debug/diagnostics', note: 'Diagnósticos internos do sistema' },
        { ep: 'questions', note: 'Endpoint de perguntas' },
        { ep: 'auth/login', method: 'POST', body: {}, note: 'Teste de alcance da rota de autenticação' },
        { ep: '__rota_inexistente__', note: 'Teste de 404 (esperado)' },
      ];

      const results = await Promise.all(testSpecs.map(async spec => {
        const url = `${base}/${spec.ep}`;
        const startTime = performance.now();
        try {
          const response = await fetch(url, {
            method: spec.method || 'GET',
            headers: { 'Content-Type': 'application/json' },
            body: spec.body ? JSON.stringify(spec.body) : undefined,
            signal: AbortSignal.timeout(15000)
          });
          const endTime = performance.now();
          
          let body: any = null;
          try {
            body = await response.json();
          } catch {
            body = null;
          }

          return {
            endpoint: spec.ep,
            url,
            status: response.status,
            ok: response.ok,
            ms: Math.round(endTime - startTime),
            body,
            note: spec.note
          };
        } catch (error: any) {
          return {
            endpoint: spec.ep,
            url,
            error: error.message,
            note: spec.note
          };
        }
      }));

      // HEAD request para health
      try {
        const startTime = performance.now();
        const headResponse = await fetch(`${base}/health`, { method: 'HEAD' });
        const endTime = performance.now();
        
        results.push({
          endpoint: 'health (HEAD)',
          url: `${base}/health`,
          status: headResponse.status,
          ok: headResponse.ok,
          ms: Math.round(endTime - startTime),
          headers: Object.fromEntries(headResponse.headers.entries()),
          note: 'HEAD request otimizado'
        });
      } catch (error: any) {
        results.push({
          endpoint: 'health (HEAD)',
          url: `${base}/health`,
          error: error.message,
          note: 'HEAD request otimizado'
        });
      }

      setDiagnosticResults(results);
      
      // Análise de problemas
      const detectedIssues = analyzeResults(results);
      setIssues(detectedIssues);

    } catch (error) {
      console.error('Diagnóstico falhou:', error);
    } finally {
      setLoading(false);
    }
  };

  // Análise dos resultados para detectar problemas
  const analyzeResults = (results: ApiTest[]): string[] => {
    const issues: string[] = [];
    
    const health = results.find(r => r.endpoint === 'health');
    const ping = results.find(r => r.endpoint === 'ping');
    const diagnostics = results.find(r => r.endpoint === 'debug/diagnostics');
    const headHealth = results.find(r => r.endpoint === 'health (HEAD)');

    if (!health || health.status === 404) {
      issues.push('❌ Rota /api/health não encontrada - Verificar roteamento');
    }

    if (health && health.status && health.status >= 500) {
      issues.push('⚠️ Health retornou erro 5xx - Problema interno do servidor');
    }

    if (ping && ping.status === 404) {
      issues.push('⚠️ Endpoint ping ausente - Arquivo api/ping.ts não encontrado');
    }

    if (diagnostics && diagnostics.status === 404) {
      issues.push('⚠️ Diagnósticos internos ausentes - routes.ts não executado');
    }

    if (headHealth && headHealth.status === 404) {
      issues.push('⚠️ HEAD request para health falhou - Vercel pode não estar roteando HEAD');
    }

    if (diagnostics && diagnostics.body?.checks) {
      const { envVars, dbConnection } = diagnostics.body.checks;
      
      if (envVars?.missing?.length > 0) {
        issues.push(`🔧 Variáveis de ambiente ausentes: ${envVars.missing.join(', ')}`);
      }

      if (dbConnection && !dbConnection.ok) {
        issues.push(`💾 Falha na conexão com banco: ${dbConnection.error || 'Erro desconhecido'}`);
      }
    }

    return issues;
  };

  // Executar verificação ao abrir o diálogo
  useEffect(() => {
    if (open) {
      checkApiStatus();
      runFullDiagnostics();
    }
  }, [open]);

  const getStatusIcon = () => {
    switch (apiStatus.status) {
      case 'online':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (apiStatus.status) {
      case 'online': return 'bg-green-100 text-green-800 border-green-300';
      case 'offline': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button type="button" className="underline hover:text-green-600 text-sm">
            Diagnóstico
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-blue-600" />
            Diagnóstico do Sistema
            <Badge className={`ml-auto ${getStatusColor()}`}>
              {getStatusIcon()}
              <span className="ml-1 capitalize">{apiStatus.status === 'online' ? 'Online' : apiStatus.status === 'offline' ? 'Offline' : 'Verificando'}</span>
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="status" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="status">Status da API</TabsTrigger>
              <TabsTrigger value="tests">Testes Completos</TabsTrigger>
              <TabsTrigger value="issues">Análise de Problemas</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto mt-4">
              <TabsContent value="status" className="mt-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        Status do Servidor
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <Badge className={getStatusColor()}>
                          {apiStatus.status === 'online' ? 'Online' : apiStatus.status === 'offline' ? 'Offline' : 'Verificando'}
                        </Badge>
                      </div>
                      {apiStatus.responseTime > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Tempo de resposta:</span>
                          <span className="text-sm font-mono">{apiStatus.responseTime}ms</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Última verificação:</span>
                        <span className="text-sm">{apiStatus.lastCheck.toLocaleTimeString()}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Banco de Dados
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {apiStatus.details?.database ? (
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Status:</span>
                            <Badge variant="default">Conectado</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Tipo:</span>
                            <span className="text-sm">{apiStatus.details.database}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Executar teste completo para verificar BD</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="flex gap-2">
                  <Button onClick={checkApiStatus} disabled={loading} size="sm">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Verificar Status
                  </Button>
                  <Button onClick={runFullDiagnostics} disabled={loading} variant="outline" size="sm">
                    <Activity className="h-4 w-4 mr-2" />
                    Teste Completo
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="tests" className="mt-0">
                <div className="space-y-3">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Executando testes...</span>
                    </div>
                  ) : diagnosticResults.length > 0 ? (
                    diagnosticResults.map((result, index) => (
                      <Card key={index} className={`${result.ok || (result.status && result.status < 500) ? 'border-gray-200' : 'border-red-300'}`}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">/{result.endpoint}</span>
                            <div className="flex items-center gap-2 text-sm">
                              {result.status && (
                                <Badge variant={result.ok ? "default" : "destructive"}>
                                  {result.status}
                                </Badge>
                              )}
                              {result.ms && <span className="text-gray-500">{result.ms}ms</span>}
                            </div>
                          </div>
                          {result.note && (
                            <p className="text-xs text-gray-600 mb-2">{result.note}</p>
                          )}
                          {result.error && (
                            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{result.error}</p>
                          )}
                          {result.body && (
                            <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                              {JSON.stringify(result.body, null, 2)}
                            </pre>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      Clique em "Teste Completo" para executar diagnósticos
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="issues" className="mt-0">
                <div className="space-y-4">
                  {issues.length > 0 ? (
                    <>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h3 className="font-semibold text-amber-800 mb-2">Problemas Detectados</h3>
                        <ul className="space-y-1">
                          {issues.map((issue, index) => (
                            <li key={index} className="text-sm text-amber-700">{issue}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  ) : diagnosticResults.length > 0 ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-semibold text-green-800 mb-2">✅ Sistema Funcionando Normalmente</h3>
                      <p className="text-sm text-green-700">Nenhum problema detectado nos testes realizados.</p>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      Execute os testes para ver a análise de problemas
                    </p>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">💡 Dicas de Diagnóstico</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• 404 em /api/health indica problema de roteamento (verificar vercel.json)</li>
                      <li>• Erro 5xx sugere problema interno do servidor ou banco de dados</li>
                      <li>• Variáveis de ambiente ausentes impedem conexão com banco</li>
                      <li>• HEAD requests otimizados reduzem uso de recursos</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
