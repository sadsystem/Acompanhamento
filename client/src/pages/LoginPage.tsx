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
    <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-green-50 via-white to-blue-50 min-h-screen">
      <div className="w-full max-w-md">
        {/* Logo e Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4 shadow-lg">
            <span className="text-white font-bold text-xl">OV</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Sistema de Acompanhamento Diário
          </h1>
          <p className="text-gray-600 text-sm">
            Ouro Verde - Gestão de Equipes
          </p>
        </div>
        
        <Card className="w-full shadow-xl border-0 bg-white/95 backdrop-blur-sm">
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
    </div>
  );
}
