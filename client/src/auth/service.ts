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
      
      console.log('Attempting login with:', { phoneDigits });
      
      // Use absolute URL with deployed API
      const apiUrl = window.location.origin + '/api/auth/login';
      console.log('Calling API at:', apiUrl);
      
      // Call login API directly
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          username: phoneDigits,
          password: password,
          remember: false
        })
      });
      
      console.log('Login response status:', response.status);
      
      // Log raw response for debugging
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', e);
        return { ok: false, error: "Erro no formato da resposta do servidor" };
      }
      
      console.log('Parsed response:', result);
      
      if (!response.ok || !result.success) {
        console.error('Login failed:', result.error || "Credenciais inválidas");
        return { ok: false, error: result.error || "Credenciais inválidas" };
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
