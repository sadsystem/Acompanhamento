import { StorageAdapter } from './adapter';
import { User, Evaluation, Session, EvaluationFilters } from '../config/types';
import { LS_KEYS } from '../config/constants';

export class LocalStorageAdapter implements StorageAdapter {
  private readLS<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  private writeLS<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async getUsers(): Promise<User[]> {
    return this.readLS<User[]>(LS_KEYS.users, []);
  }

  async setUsers(users: User[]): Promise<void> {
    this.writeLS(LS_KEYS.users, users);
  }

  async createUser(user: User): Promise<User> {
    const users = await this.getUsers();
    users.push(user);
    await this.setUsers(users);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('User not found');
    
    const updatedUser = { ...users[index], ...updates };
    users[index] = updatedUser;
    await this.setUsers(users);
    return updatedUser;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const users = await this.getUsers();
    return users.find(u => u.username === username) || null;
  }

  async getEvaluations(filters?: EvaluationFilters): Promise<Evaluation[]> {
    let evaluations = this.readLS<Evaluation[]>(LS_KEYS.evaluations, []);
    
    if (filters?.dateFrom) {
      evaluations = evaluations.filter(e => e.dateRef >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      evaluations = evaluations.filter(e => e.dateRef <= filters.dateTo!);
    }
    if (filters?.evaluator) {
      evaluations = evaluations.filter(e => e.evaluator === filters.evaluator);
    }
    if (filters?.evaluated) {
      evaluations = evaluations.filter(e => e.evaluated === filters.evaluated);
    }
    if (filters?.status) {
      evaluations = evaluations.filter(e => e.status === filters.status);
    }
    
    return evaluations;
  }

  async setEvaluations(evaluations: Evaluation[]): Promise<void> {
    this.writeLS(LS_KEYS.evaluations, evaluations);
  }

  async createEvaluation(evaluation: Evaluation): Promise<Evaluation> {
    const evaluations = await this.getEvaluations();
    evaluations.unshift(evaluation);
    await this.setEvaluations(evaluations);
    return evaluation;
  }

  async getSession(): Promise<Session | null> {
    return this.readLS<Session | null>(LS_KEYS.session, null);
  }

  async setSession(session: Session): Promise<void> {
    this.writeLS(LS_KEYS.session, session);
  }

  async clearSession(): Promise<void> {
    localStorage.removeItem(LS_KEYS.session);
  }

  async setRemember(flag: boolean): Promise<void> {
    if (flag) {
      localStorage.setItem(LS_KEYS.remember, JSON.stringify(true));
    } else {
      localStorage.removeItem(LS_KEYS.remember);
    }
  }

  async getRemember(): Promise<boolean> {
    return this.readLS<boolean>(LS_KEYS.remember, false);
  }
}
