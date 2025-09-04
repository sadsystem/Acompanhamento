import { StorageAdapter } from './adapter';
import { User, Evaluation, Session, EvaluationFilters, Team, TravelRoute, Vehicle, InsertEvaluation, Answer } from '../config/types';
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

  async clearAllData(): Promise<void> {
    // Clear all localStorage data to force fresh start
    Object.values(LS_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
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

  async createEvaluation(evaluationData: InsertEvaluation): Promise<Evaluation> {
    const evaluations = await this.getEvaluations();
    // Generate ID for localStorage and ensure createdAt is consistent
    const evaluation: Evaluation = {
      ...evaluationData,
      id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      answers: evaluationData.answers as Answer[], // Cast Json to Answer[]
      status: (evaluationData.status || "queued") as "queued" | "synced", // Ensure valid status
      routeId: evaluationData.routeId || null
    };
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

  // Teams methods
  async getTeams(): Promise<Team[]> {
    return this.readLS<Team[]>(LS_KEYS.teams, []);
  }

  async setTeams(teams: Team[]): Promise<void> {
    this.writeLS(LS_KEYS.teams, teams);
  }

  async createTeam(team: Team): Promise<Team> {
    const teams = await this.getTeams();
    teams.push(team);
    await this.setTeams(teams);
    return team;
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
    const teams = await this.getTeams();
    const index = teams.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Team not found');
    
    const updatedTeam = { ...teams[index], ...updates };
    teams[index] = updatedTeam;
    await this.setTeams(teams);
    return updatedTeam;
  }

  async deleteTeam(id: string): Promise<void> {
    const teams = await this.getTeams();
    const filteredTeams = teams.filter(t => t.id !== id);
    await this.setTeams(filteredTeams);
  }

  // Travel Routes methods
  async getTravelRoutes(): Promise<TravelRoute[]> {
    return this.readLS<TravelRoute[]>(LS_KEYS.travelRoutes, []);
  }

  async setTravelRoutes(routes: TravelRoute[]): Promise<void> {
    this.writeLS(LS_KEYS.travelRoutes, routes);
  }

  async createTravelRoute(route: TravelRoute): Promise<TravelRoute> {
    const routes = await this.getTravelRoutes();
    routes.unshift(route);
    await this.setTravelRoutes(routes);
    return route;
  }

  async updateTravelRoute(id: string, updates: Partial<TravelRoute>): Promise<TravelRoute> {
    const routes = await this.getTravelRoutes();
    const index = routes.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Travel route not found');
    
    const updatedRoute = { ...routes[index], ...updates };
    routes[index] = updatedRoute;
    await this.setTravelRoutes(routes);
    return updatedRoute;
  }

  async deleteTravelRoute(id: string): Promise<void> {
    const routes = await this.getTravelRoutes();
    const filteredRoutes = routes.filter(r => r.id !== id);
    await this.setTravelRoutes(filteredRoutes);
  }

  // Vehicles methods
  async getVehicles(): Promise<Vehicle[]> {
    return this.readLS<Vehicle[]>(LS_KEYS.vehicles, []);
  }

  async setVehicles(vehicles: Vehicle[]): Promise<void> {
    this.writeLS(LS_KEYS.vehicles, vehicles);
  }

  async createVehicle(vehicle: Vehicle): Promise<Vehicle> {
    const vehicles = await this.getVehicles();
    vehicles.push(vehicle);
    await this.setVehicles(vehicles);
    return vehicle;
  }

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    const vehicles = await this.getVehicles();
    const index = vehicles.findIndex(v => v.id === id);
    if (index === -1) throw new Error('Vehicle not found');
    
    const updatedVehicle = { ...vehicles[index], ...updates };
    vehicles[index] = updatedVehicle;
    await this.setVehicles(vehicles);
    return updatedVehicle;
  }

  async deleteVehicle(id: string): Promise<void> {
    const vehicles = await this.getVehicles();
    const filteredVehicles = vehicles.filter(v => v.id !== id);
    await this.setVehicles(filteredVehicles);
  }
}
