import { User, Evaluation, Session, EvaluationFilters, Team, TravelRoute } from '../config/types';

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

  // Teams
  getTeams(): Promise<Team[]>;
  setTeams(teams: Team[]): Promise<void>;
  createTeam(team: Team): Promise<Team>;
  updateTeam(id: string, updates: Partial<Team>): Promise<Team>;
  deleteTeam(id: string): Promise<void>;

  // Travel Routes
  getTravelRoutes(): Promise<TravelRoute[]>;
  setTravelRoutes(routes: TravelRoute[]): Promise<void>;
  createTravelRoute(route: TravelRoute): Promise<TravelRoute>;
  updateTravelRoute(id: string, updates: Partial<TravelRoute>): Promise<TravelRoute>;
  deleteTravelRoute(id: string): Promise<void>;
  clearAllData?(): Promise<void>;
}

export class MockStorageAdapter implements StorageAdapter {
  private users: User[] = [];
  private evaluations: Evaluation[] = [];
  private teams: Team[] = [];
  private travelRoutes: TravelRoute[] = [];
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

  // Teams methods
  async getTeams(): Promise<Team[]> {
    return [...this.teams];
  }

  async setTeams(teams: Team[]): Promise<void> {
    this.teams = [...teams];
  }

  async createTeam(team: Team): Promise<Team> {
    this.teams.push(team);
    return team;
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
    const index = this.teams.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Team not found');
    
    const updatedTeam = { ...this.teams[index], ...updates };
    this.teams[index] = updatedTeam;
    return updatedTeam;
  }

  async deleteTeam(id: string): Promise<void> {
    this.teams = this.teams.filter(t => t.id !== id);
  }

  // Travel Routes methods
  async getTravelRoutes(): Promise<TravelRoute[]> {
    return [...this.travelRoutes];
  }

  async setTravelRoutes(routes: TravelRoute[]): Promise<void> {
    this.travelRoutes = [...routes];
  }

  async createTravelRoute(route: TravelRoute): Promise<TravelRoute> {
    this.travelRoutes.unshift(route);
    return route;
  }

  async updateTravelRoute(id: string, updates: Partial<TravelRoute>): Promise<TravelRoute> {
    const index = this.travelRoutes.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Travel route not found');
    
    const updatedRoute = { ...this.travelRoutes[index], ...updates };
    this.travelRoutes[index] = updatedRoute;
    return updatedRoute;
  }

  async deleteTravelRoute(id: string): Promise<void> {
    this.travelRoutes = this.travelRoutes.filter(r => r.id !== id);
  }
}
