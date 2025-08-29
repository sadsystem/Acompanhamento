import { StorageAdapter } from '../storage/adapter';
import { Session } from '../config/types';

export class SessionManager {
  constructor(private storage: StorageAdapter) {}

  async getSession(): Promise<Session | null> {
    return await this.storage.getSession();
  }

  async setSession(session: Session): Promise<void> {
    await this.storage.setSession(session);
  }

  async clearSession(): Promise<void> {
    await this.storage.clearSession();
  }

  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null;
  }
}
