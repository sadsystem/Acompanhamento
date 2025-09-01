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
      
      // Determine if we're in development or production
      const baseUrl = window.location.hostname === 'localhost' ? '' : '';
      const apiUrl = baseUrl + '/api/auth/login';
      console.log('Calling API at:', apiUrl);
      
      // First, try to seed the database if in serverless mode
      if (window.location.hostname !== 'localhost') {
        try {
          await fetch('/api/seed', { method: 'POST' });
        } catch (e) {
          console.warn('Seed endpoint not available:', e);
        }
      }
      
      // Call login API directly with credentials
      const response = await fetch(apiUrl, {
        method: 'POST',
        credentials: 'include',
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
      console.log('Login response headers:', Object.fromEntries(response.headers.entries()));
      
      // Handle network errors or server errors
      if (!response.ok && (response.status >= 500 || response.status === 0)) {
        console.error('Server error or network failure');
        return { 
          ok: false, 
          error: "Erro no servidor. Tente novamente em alguns momentos." 
        };
      }
      
      // Log raw response for debugging
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      // Handle empty responses
      if (!responseText.trim()) {
        console.error('Empty response from server');
        return { 
          ok: false, 
          error: "Resposta vazia do servidor. Verifique sua conexão." 
        };
      }
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', e);
        console.error('Response text that failed to parse:', responseText);
        return { 
          ok: false, 
          error: "Erro no formato da resposta do servidor. Tente novamente." 
        };
      }
      
      console.log('Parsed response:', result);
      
      // Handle API errors
      if (!response.ok || !result.success) {
        const errorMessage = result.error || 
          (response.status === 401 ? "Credenciais inválidas" : "Erro no servidor");
        console.error('Login failed:', errorMessage);
        return { ok: false, error: errorMessage };
      }
      
      // Validate response structure
      if (!result.data || !result.data.user) {
        console.error('Invalid response structure:', result);
        return { 
          ok: false, 
          error: "Resposta inválida do servidor. Tente novamente." 
        };
      }
      
      // Save session
      const session: Session = { username: result.data.user.username };
      await this.storage.setSession(session);
      
      return { ok: true, user: result.data.user };
    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { 
          ok: false, 
          error: "Erro ao conectar com o servidor. Verifique sua conexão de internet." 
        };
      }
      
      if (error instanceof TypeError && error.message.includes('NetworkError')) {
        return { 
          ok: false, 
          error: "Erro de rede. Verifique sua conexão e tente novamente." 
        };
      }
      
      return { 
        ok: false, 
        error: "Erro inesperado ao tentar fazer login. Tente novamente." 
      };
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
