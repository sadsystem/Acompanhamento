import { useState, useEffect } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PhoneInput } from "../components/forms/PhoneInput";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { AuthService } from "../auth/service";
import { useStorage } from "../hooks/useStorage";

interface LoginPageProps {
  onLoggedIn: () => void;
}

export function LoginPage({ onLoggedIn }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const storage = useStorage();
  const authService = new AuthService(storage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await authService.login(username.trim(), password);
      
      if (!result.ok) {
        setError(result.error || "Falha no login");
        setLoading(false);
        return;
      }

      await authService.setRememberLogin(remember);
      
      // Simulate loading time for better UX
      setTimeout(() => {
        onLoggedIn();
        setLoading(false);
      }, 700);
    } catch (err) {
      setError("Erro interno do sistema");
      setLoading(false);
    }
  };

  return (
  <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-100 via-gray-50 to-green-100 overflow-hidden relative">
      {/* Padrão geométrico de fundo */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 bg-green-600 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-blue-500 rounded-full blur-2xl"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-green-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-28 h-28 bg-slate-400 rounded-full blur-2xl"></div>
      </div>
      {/* Logo e Header */}
      <div className="text-center pt-8 pb-4 relative z-10">
        <div className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 rounded-full mb-4 shadow-xl border border-green-500/20">
          <span className="text-white font-bold text-sm tracking-wide">OURO VERDE</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-700 drop-shadow-sm">
          Acompanhamento Diário
        </h1>
      </div>
      
      {/* Área do formulário centralizada */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
        
        <Card className="w-full shadow-2xl border border-white/20 bg-white/90 backdrop-blur-md">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-6 text-center uppercase tracking-wide text-gray-700">
            ENTRAR
          </h2>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <PhoneInput
                id="username"
                value={username}
                onChange={(value) => setUsername(value)}
                label="Telefone"
                required
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="..."
                data-testid="input-password"
                required
              />
            </div>
            
            <label className="inline-flex items-center gap-2 text-xs text-gray-700 select-none">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                data-testid="checkbox-remember"
              />
              Lembrar login neste dispositivo
            </label>
            
            {error && (
              <div className="text-sm text-red-600" data-testid="error-message">
                {error}
              </div>
            )}
            
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <DiagnosticLink />
              <span></span>
            </div>
            <div className="mt-2 flex justify-center">
              <Button 
                type="submit" 
                disabled={loading}
                data-testid="button-login"
              >
                {loading ? "Acessando..." : "Entrar"}
              </Button>
            </div>
          </form>
        </CardContent>
        </Card>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/95 border rounded-2xl p-8 text-center shadow-2xl backdrop-blur-sm">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
              <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="text-lg font-medium text-gray-700 mb-1">Acessando sistema</div>
            <div className="text-sm text-gray-500">Aguarde um momento...</div>
          </div>
        </div>
      )}
  <ApiMiniStatus />
    </div>
  );
}

// Componente inline para testes de diagnóstico
function DiagnosticLink() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true); setError(null); setData(null);
    try {
      const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

      type TestSpec = { ep: string; method?: string; note?: string; body?: any; custom?: boolean };
      const specs: TestSpec[] = [
        { ep: 'health', note: 'Saúde básica' },
        { ep: 'ping', note: 'Função ping dedicada (api/ping.ts)' },
        { ep: 'debug/diagnostics', note: 'Diagnósticos internos' },
        { ep: 'questions', note: 'Lista de perguntas' },
        { ep: 'auth/login', method: 'POST', body: {}, note: 'Teste alcance rota auth (espera 400/401)' },
        { ep: '__rota_inexistente_sentinel__', note: '404 esperado para classificar tipo de 404' },
      ];

      // HEAD para health
    const headHealth = async () => {
        const url = `${base}/health`;
        const started = performance.now();
        try {
      const res = await fetch(url, { method: 'HEAD' });
      return { endpoint: 'health (HEAD)', url, status: res.status, ok: res.ok, ms: Math.round(performance.now() - started), body: null, note: 'HEAD request', headers: Object.fromEntries(res.headers.entries()) };
        } catch (e: any) {
      return { endpoint: 'health (HEAD)', url, error: e.message, body: null, note: 'HEAD request' };
        }
      };

  const baseResults = await Promise.all(specs.map(async spec => {
        const url = `${base}/${spec.ep}`;
        const started = performance.now();
        try {
          const res = await fetch(url, { method: spec.method || 'GET', headers: { 'Content-Type': 'application/json' }, body: spec.body ? JSON.stringify(spec.body) : undefined });
          const ms = Math.round(performance.now() - started);
            let body: any = null; try { body = await res.json(); } catch { body = null; }
          return { endpoint: spec.ep, url, status: res.status, ok: res.ok, ms, body, note: spec.note };
        } catch (e: any) {
          return { endpoint: spec.ep, url, error: e.message, note: spec.note };
        }
  }));
  const headResult = await headHealth();
  const results = [...baseResults, headResult];

      // Classificação heurística
      const classify = () => {
        const health = results.find(r => r.endpoint === 'health');
        const ping = results.find(r => r.endpoint === 'ping');
        const diagnostics = results.find(r => r.endpoint === 'debug/diagnostics');
        const notFound = results.find(r => r.endpoint === '__rota_inexistente_sentinel__');
  const head = results.find(r => r.endpoint === 'health (HEAD)');

        const issues: string[] = [];
        if (!health || health.status === 404) {
          issues.push('Rota /api/health não encontrada (ver roteamento vercel.json ou build).');
        }
  if (health && typeof health.status === 'number' && health.status >= 500) {
          issues.push('Health retornou 5xx (erro interno na função serverless).');
        }
        if (ping && ping.status === 404) {
          issues.push('Função ping ausente: arquivo api/ping.ts não reconhecido no build.');
        }
        if (diagnostics && diagnostics.status === 404) {
          issues.push('Endpoint diagnostics ausente (routes.ts possivelmente não executou).');
        }
        if (notFound && notFound.status === 404) {
          if (notFound.body && notFound.body.error === 'api_not_found') {
            issues.push('Serverless ativo (404 estruturado).');
          } else {
            issues.push('404 bruto (pode ser fallback de static hosting; função não executou).');
          }
        }
        if (head && head.status === 404) {
          issues.push('HEAD /api/health 404 — indica ausência de rota ou vercel não roteando HEAD (menos comum).');
        }
        if (diagnostics && diagnostics.body && diagnostics.body.checks) {
          const envVars = diagnostics.body.checks.envVars;
          if (envVars && envVars.missing && envVars.missing.length) {
            issues.push('Variáveis ausentes: ' + envVars.missing.join(', '));
          }
          const dbConn = diagnostics.body.checks.dbConnection;
          if (dbConn && dbConn.ok === false) {
            issues.push('Falha conexão DB: ' + (dbConn.error || 'desconhecido'));
          }
        }
        return issues;
      };

      const summary = classify();
      setData({ results, ts: new Date().toISOString(), summary });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Fechar com ESC
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);

  return (
    <>
      <button type="button" className="underline hover:text-green-600" onClick={() => { if (!open) { setOpen(true); run(); } else { setOpen(false); } }}>
        {open ? 'Fechar diagnóstico' : 'Diagnóstico'}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border p-4 flex flex-col max-h-[80vh] text-[12px]">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Diagnóstico de API / DB</span>
                {loading && <span className="text-xs text-gray-500 animate-pulse">carregando...</span>}
              </div>
              <div className="flex items-center gap-2">
                <button className="text-xs px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 border" onClick={run} disabled={loading}>{loading ? '...' : 'Recarregar'}</button>
                <button className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200" onClick={() => setOpen(false)}>Fechar</button>
              </div>
            </div>
            <div className="overflow-y-auto pr-1 space-y-3">
              {error && <div className="text-red-600">Erro: {error}</div>}
              {!error && !data && loading && <div>Executando testes iniciais...</div>}
              {data && data.summary && (
                <div className="border rounded-lg p-3 bg-slate-50">
                  <div className="font-semibold text-xs mb-1">Resumo / Heurísticas</div>
                  {data.summary.length === 0 ? (
                    <div className="text-[11px] text-green-600">Nenhum problema evidente detectado.</div>
                  ) : (
                    <ul className="list-disc ml-4 space-y-1 text-[11px] text-gray-700">
                      {data.summary.map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ul>
                  )}
                </div>
              )}
              {data && data.results && data.results.map((r: any) => (
                <div key={r.endpoint} className={`border rounded-lg p-3 bg-white ${r.ok || (r.status && r.status < 500) ? 'border-gray-200' : 'border-red-400'}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">/{r.endpoint}</div>
                    <div className="text-[11px] font-mono">
                      {r.status != null ? r.status : 'ERR'} • {r.ms ? r.ms + 'ms' : ''}
                    </div>
                  </div>
                  {r.note && <div className="text-[10px] text-gray-500 mt-0.5">{r.note}</div>}
                  {r.error && <div className="text-red-600 text-[11px] mt-1">{r.error}</div>}
                  {r.body && <pre className="mt-2 whitespace-pre-wrap break-words max-h-40 overflow-auto bg-gray-50 p-2 rounded text-[10px] leading-snug">{JSON.stringify(r.body, null, 2)}</pre>}
                </div>
              ))}
              {data && (
                <div className="text-[10px] text-gray-500 border-t pt-2">
                  Gerado em {new Date(data.ts).toLocaleString()} — Clique em Recarregar após ajustes.
                  <div className="mt-1">
                    Dicas: 404 em /api/health = rota não roteada (ver vercel.json). Falha em dbConnection = variável DATABASE_URL ausente ou inválida. 404 geral + nenhum log = função não foi buildada.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Mini status (usa somente GET /health) – aparece canto inferior esquerdo para coerência
function ApiMiniStatus() {
  const [status, setStatus] = useState<'ok' | 'fail' | 'loading'>('loading');
  const [ts, setTs] = useState('');
  const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

  const ping = async () => {
    try {
      setStatus('loading');
      const r = await fetch(`${base}/health?_t=${Date.now()}`);
      if (!r.ok) throw new Error('status ' + r.status);
      const j = await r.json().catch(() => ({}));
      setTs(j.timestamp || new Date().toISOString());
      setStatus('ok');
    } catch {
      setStatus('fail');
      setTs(new Date().toISOString());
    }
  };

  // Executa uma vez no mount
  useEffect(() => { ping(); /* eslint-disable-line */ }, []);

  const color = status === 'ok' ? 'bg-green-600' : status === 'fail' ? 'bg-red-600' : 'bg-amber-500';
  const label = status === 'ok' ? 'API OK' : status === 'fail' ? 'API OFF' : 'API...';

  return (
    <button type="button" onClick={ping} className={`fixed left-2 bottom-2 text-[10px] ${color} text-white px-2 py-1 rounded-full shadow font-medium hover:opacity-90 transition`} title={`Status: ${label}\nÚltimo teste: ${ts || '-'}\nClique para retestar.`}>
      {label}
    </button>
  );
}
