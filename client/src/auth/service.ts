import { StorageAdapter } from '../storage/adapter';
import { User, LoginResult, Session } from '../config/types';
import { queryClient } from '@/lib/queryClient';

export class AuthService {
  constructor(private storage: StorageAdapter) {}

  async login(username: string, password: string): Promise<LoginResult> {
    try {
      // Convert phone to username format for API call
      const phoneDigits = username.replace(/\D/g, '');
      
      // Call login API directly
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: phoneDigits,
          password: password,
          remember: false
        })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        return { ok: false, error: result.error || "Credenciais inválidas" };
      }
      
      // Save session
      const session: Session = { username: result.data.user.username };
      await this.storage.setSession(session);
      
      return { ok: true, user: result.data.user };
    } catch (error) {
      console.error('Login error:', error);
      return { ok: false, error: "Telefone não encontrado" };
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
