import { StorageAdapter } from '../storage/adapter';
import { User, LoginResult, Session } from '../config/types';
import { queryClient } from '@/lib/queryClient';
import { API_BASE_URL } from '../config/config';

export class AuthService {
  constructor(private storage: StorageAdapter) {}

  async login(username: string, password: string): Promise<LoginResult> {
    try {
      // Convert phone to username format for API call
      const phoneDigits = username.replace(/\D/g, '');
      
      // Build API URL using configured base
      const apiUrl = `${API_BASE_URL}/auth/login`;
      
      // Add timestamp to prevent caching
      const apiUrlWithCache = `${apiUrl}?_t=${Date.now()}`;
      
      console.log('Tentando login com URL:', apiUrlWithCache);
      
      // Call login API directly with credentials
      const response = await fetch(apiUrlWithCache, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({
          username: phoneDigits,
          password: password,
          remember: true
        })
      });
      
      // Parse response first to get proper error message
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        if (response.status === 404) {
          return { ok: false, error: "API não encontrada (404). Servidor pode estar offline." };
        }
        return { ok: false, error: `Erro do servidor: ${response.status}` };
      }
      
      console.log('Login result:', result);
      
      // Check if login was successful
      if (!response.ok || !result.success) {
        console.error('Login failed:', result.error || "Credenciais inválidas");
        // Use server's error message if available, otherwise fallback to generic message
        return { ok: false, error: result.error || "Login ou senha incorretos" };
      }
      
      // Save session
      const session: Session = { username: result.data.user.username };
      await this.storage.setSession(session);
      
      return { ok: true, user: result.data.user };
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { ok: false, error: "Erro ao conectar com o servidor" };
      }
      return { ok: false, error: "Erro ao tentar fazer login" };
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const session = await this.storage.getSession();
    if (!session) return null;
    
    return await this.storage.getUserByUsername(session.username);
  }

  async logout(): Promise<void> {
    await this.storage.clearSession();
    await this.storage.setRemember(false);
  }

  async setRememberLogin(remember: boolean): Promise<void> {
    await this.storage.setRemember(remember);
  }

  async ensureFirstLogin(): Promise<void> {
    const remembered = await this.storage.getRemember();
    if (!remembered) {
      await this.storage.clearSession();
    }
  }

  async adminLoginAsUser(targetUser: User): Promise<LoginResult> {
    // This method allows an admin to directly log in as another user
    // Security: Should only be called after verifying the current user is an admin
    if (!targetUser.active) {
      return { ok: false, error: "Este usuário está desativado" };
    }
    
    const session: Session = { username: targetUser.username };
    await this.storage.setSession(session);
    
    // Set remember to true to prevent session from being cleared on page reload
    await this.storage.setRemember(true);
    
    return { ok: true, user: targetUser };
  }
}
