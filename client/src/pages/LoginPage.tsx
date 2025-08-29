import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-6">
          <h1 className="text-xl font-semibold mb-4 text-center uppercase tracking-wide">
            ENTRAR
          </h1>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="..."
                data-testid="input-username"
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

      {loading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white border rounded-2xl p-6 text-center shadow-lg">
            <div className="mx-auto mb-2">
              <LoadingSpinner />
            </div>
            <div className="text-sm">Acessando...</div>
          </div>
        </div>
      )}
    </div>
  );
}
