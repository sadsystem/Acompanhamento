import { StorageAdapter } from '../storage/adapter';
import { User, LoginResult, Session } from '../config/types';

export class AuthService {
  constructor(private storage: StorageAdapter) {}

  async login(username: string, password: string): Promise<LoginResult> {
    const user = await this.storage.getUserByUsername(username.trim());
    
    if (!user) {
      return { ok: false, error: "Usuário não encontrado/ativo" };
    }
    
    if (!user.active) {
      return { ok: false, error: "Usuário não encontrado/ativo" };
    }
    
    if (user.password !== password) {
      return { ok: false, error: "Senha incorreta" };
    }
    
    const session: Session = { username: user.username };
    await this.storage.setSession(session);
    
    return { ok: true, user };
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
}
