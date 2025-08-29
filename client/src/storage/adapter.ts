import { User, Evaluation, Session, EvaluationFilters } from '../config/types';

export interface StorageAdapter {
  // Users
  getUsers(): Promise<User[]>;
  setUsers(users: User[]): Promise<void>;
  createUser(user: User): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  getUserByUsername(username: string): Promise<User | null>;

  // Evaluations
  getEvaluations(filters?: EvaluationFilters): Promise<Evaluation[]>;
  setEvaluations(evaluations: Evaluation[]): Promise<void>;
  createEvaluation(evaluation: Evaluation): Promise<Evaluation>;

  // Session
  getSession(): Promise<Session | null>;
  setSession(session: Session): Promise<void>;
  clearSession(): Promise<void>;
  
  // Remember functionality
  setRemember(flag: boolean): Promise<void>;
  getRemember(): Promise<boolean>;
}

export class MockStorageAdapter implements StorageAdapter {
  private users: User[] = [];
  private evaluations: Evaluation[] = [];
  private session: Session | null = null;
  private remember: boolean = false;

  async getUsers(): Promise<User[]> {
    return [...this.users];
  }

  async setUsers(users: User[]): Promise<void> {
    this.users = [...users];
  }

  async createUser(user: User): Promise<User> {
    this.users.push(user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('User not found');
    
    const updatedUser = { ...this.users[index], ...updates };
    this.users[index] = updatedUser;
    return updatedUser;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return this.users.find(u => u.username === username) || null;
  }

  async getEvaluations(filters?: EvaluationFilters): Promise<Evaluation[]> {
    let filtered = [...this.evaluations];
    
    if (filters?.dateFrom) {
      filtered = filtered.filter(e => e.dateRef >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      filtered = filtered.filter(e => e.dateRef <= filters.dateTo!);
    }
    if (filters?.evaluator) {
      filtered = filtered.filter(e => e.evaluator === filters.evaluator);
    }
    if (filters?.evaluated) {
      filtered = filtered.filter(e => e.evaluated === filters.evaluated);
    }
    if (filters?.status) {
      filtered = filtered.filter(e => e.status === filters.status);
    }
    
    return filtered;
  }

  async setEvaluations(evaluations: Evaluation[]): Promise<void> {
    this.evaluations = [...evaluations];
  }

  async createEvaluation(evaluation: Evaluation): Promise<Evaluation> {
    this.evaluations.unshift(evaluation);
    return evaluation;
  }

  async getSession(): Promise<Session | null> {
    return this.session;
  }

  async setSession(session: Session): Promise<void> {
    this.session = session;
  }

  async clearSession(): Promise<void> {
    this.session = null;
  }

  async setRemember(flag: boolean): Promise<void> {
    this.remember = flag;
  }

  async getRemember(): Promise<boolean> {
    return this.remember;
  }
}
