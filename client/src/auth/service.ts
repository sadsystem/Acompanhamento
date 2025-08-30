import { StorageAdapter } from '../storage/adapter';
import { User, LoginResult, Session } from '../config/types';

export class AuthService {
  constructor(private storage: StorageAdapter) {}

  async login(username: string, password: string): Promise<LoginResult> {
    // Convert phone to username format for lookup
    const phoneDigits = username.replace(/\D/g, '');
    const user = await this.storage.getUserByUsername(phoneDigits);
    
    if (!user) {
      return { ok: false, error: "Telefone não encontrado" };
    }
    
    if (!user.active) {
      return { ok: false, error: "Seu acesso foi desativado, consulte o seu gestor responsável." };
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
