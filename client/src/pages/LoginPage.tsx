import { useState } from "react";
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
      // Executa vários endpoints em paralelo
      const endpoints = [
        'health',
        'debug/diagnostics',
        'questions',
        'auth/login' // esperado 400/401 sem body - só para ver reach
      ];
      const results = await Promise.all(endpoints.map(async ep => {
        const url = `${base}/${ep}`;
        const started = performance.now();
        try {
          const res = await fetch(url, { method: ep === 'auth/login' ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: ep === 'auth/login' ? JSON.stringify({}) : undefined });
          const ms = Math.round(performance.now() - started);
          let body: any = null;
            try { body = await res.json(); } catch { body = null; }
          return { endpoint: ep, url, status: res.status, ok: res.ok, ms, body };
        } catch (e: any) {
          return { endpoint: ep, url, error: e.message };
        }
      }));
      setData({ results, ts: new Date().toISOString() });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button type="button" className="underline hover:text-green-600" onClick={() => { if (!open) { setOpen(true); run(); } else { setOpen(false); } }}>
        {open ? 'Fechar diagnósticos' : 'Diagnóstico'}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 w-[340px] max-h-[70vh] overflow-auto bg-white/95 backdrop-blur border rounded-xl shadow-lg p-3 text-[11px] space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Checks</span>
            <button className="text-xs text-blue-600" onClick={run} disabled={loading}>{loading ? '...' : 'Recarregar'}</button>
          </div>
          {error && <div className="text-red-600">Erro: {error}</div>}
          {!error && !data && loading && <div>Executando testes...</div>}
          {data && (
            <div className="space-y-2">
              {data.results.map((r: any) => (
                <div key={r.endpoint} className={`border rounded p-2 ${r.ok || (r.status && r.status < 500) ? 'border-gray-200' : 'border-red-400'} bg-white`}> 
                  <div className="font-medium">/{r.endpoint}</div>
                  <div>Status: {r.status ?? 'ERR'} • {r.ms ? r.ms + 'ms' : ''} {r.error && <span className="text-red-600">{r.error}</span>}</div>
                  {r.body && <pre className="mt-1 whitespace-pre-wrap break-words max-h-32 overflow-auto bg-gray-50 p-1 rounded">{JSON.stringify(r.body, null, 2)}</pre>}
                </div>
              ))}
              <div className="text-[10px] text-gray-500">Gerado em {new Date(data.ts).toLocaleString()} • Atualize para validar correções.</div>
            </div>
          )}
          <div className="pt-1 border-t text-[10px] text-gray-400">
            Dicas: 404 em /api/health indica rota não atingida (build/server). Erro de conexão em diagnostics-&gt;dbConnection aponta DATABASE_URL.
          </div>
        </div>
      )}
    </div>
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

  // única vez + botão manual no tooltip do badge (não usar useEffect extra aqui simplificado)
  if (!ts && status === 'loading') {
    // fire and forget
    ping();
  }

  const color = status === 'ok' ? 'bg-green-600' : status === 'fail' ? 'bg-red-600' : 'bg-amber-500';
  const label = status === 'ok' ? 'API OK' : status === 'fail' ? 'API OFF' : 'API...';

  return (
    <button type="button" onClick={ping} className={`fixed left-2 bottom-2 text-[10px] ${color} text-white px-2 py-1 rounded-full shadow font-medium hover:opacity-90 transition`} title={`Status: ${label}\nÚltimo teste: ${ts || '-'}\nClique para retestar.`}>
      {label}
    </button>
  );
}
