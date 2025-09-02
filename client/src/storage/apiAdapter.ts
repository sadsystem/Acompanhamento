import { StorageAdapter } from './adapter';
import { User, Evaluation, Session, EvaluationFilters, Team, TravelRoute, Vehicle, InsertEvaluation } from '../config/types';
import { apiRequest } from '@/lib/queryClient';
import { API_URL } from '../config/config';

export class ApiStorageAdapter implements StorageAdapter {
  // Users
  async getUsers(): Promise<User[]> {
    const timestamp = Date.now();
    const response = await fetch(`${API_URL}/users/admin?_t=${timestamp}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  }

  async setUsers(users: User[]): Promise<void> {
    // Not needed with API - users are managed individually
    // This method is disabled to prevent any localStorage seeds
    return;
  }

  async createUser(user: User): Promise<User> {
    const response = await apiRequest('POST', '/users', user);
    return response.json();
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const response = await apiRequest('PUT', `/users/${id}`, updates);
    return response.json();
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const users = await this.getUsers();
      return users.find(u => u.username === username) || null;
    } catch {
      return null;
    }
  }

  // Session Management - Keep in localStorage for now
  async getSession(): Promise<Session | null> {
    try {
      const raw = localStorage.getItem('sad_session');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async setSession(session: Session): Promise<void> {
    localStorage.setItem('sad_session', JSON.stringify(session));
  }

  async clearSession(): Promise<void> {
    localStorage.removeItem('sad_session');
  }

  async getRemember(): Promise<boolean> {
    try {
      const raw = localStorage.getItem('sad_remember');
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  }

  async setRemember(remember: boolean): Promise<void> {
    localStorage.setItem('sad_remember', JSON.stringify(remember));
  }

  // Evaluations
  async getEvaluations(filters?: EvaluationFilters): Promise<Evaluation[]> {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.evaluator) params.append('evaluator', filters.evaluator);
    if (filters?.evaluated) params.append('evaluated', filters.evaluated);
    if (filters?.status) params.append('status', filters.status);
    
    const response = await fetch(`${API_URL}/evaluations?${params}`);
    if (!response.ok) throw new Error('Failed to fetch evaluations');
    return response.json();
  }

  async setEvaluations(evaluations: Evaluation[]): Promise<void> {
    // Not needed with API - evaluations are managed individually
    throw new Error('setEvaluations not implemented in API adapter');
  }

  async createEvaluation(evaluationData: InsertEvaluation): Promise<Evaluation> {
    console.log("ApiAdapter - Sending evaluation data:", JSON.stringify(evaluationData, null, 2));
    const response = await apiRequest('POST', '/evaluations', evaluationData);
    return response.json();
  }

  // Teams - Temporary localStorage implementation
  async getTeams(): Promise<Team[]> {
    try {
      const raw = localStorage.getItem('sad_teams');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async setTeams(teams: Team[]): Promise<void> {
    localStorage.setItem('sad_teams', JSON.stringify(teams));
  }

  async createTeam(team: Team): Promise<Team> {
    const teams = await this.getTeams();
    teams.push(team);
    await this.setTeams(teams);
    return team;
  }

  async updateTeam(teamId: string, updates: Partial<Team>): Promise<Team> {
    const teams = await this.getTeams();
    const index = teams.findIndex(t => t.id === teamId);
    if (index === -1) throw new Error('Team not found');
    
    const updatedTeam = { ...teams[index], ...updates };
    teams[index] = updatedTeam;
    await this.setTeams(teams);
    return updatedTeam;
  }

  async deleteTeam(teamId: string): Promise<void> {
    const teams = await this.getTeams();
    const filteredTeams = teams.filter(t => t.id !== teamId);
    await this.setTeams(filteredTeams);
  }

  // Travel Routes - Temporary localStorage implementation
  async getTravelRoutes(): Promise<TravelRoute[]> {
    try {
      const raw = localStorage.getItem('sad_travel_routes');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async setTravelRoutes(routes: TravelRoute[]): Promise<void> {
    localStorage.setItem('sad_travel_routes', JSON.stringify(routes));
  }

  async createTravelRoute(route: TravelRoute): Promise<TravelRoute> {
    const routes = await this.getTravelRoutes();
    routes.push(route);
    await this.setTravelRoutes(routes);
    return route;
  }

  async updateTravelRoute(routeId: string, updates: Partial<TravelRoute>): Promise<TravelRoute> {
    const routes = await this.getTravelRoutes();
    const index = routes.findIndex(r => r.id === routeId);
    if (index === -1) throw new Error('Route not found');
    
    const updatedRoute = { ...routes[index], ...updates };
    routes[index] = updatedRoute;
    await this.setTravelRoutes(routes);
    return updatedRoute;
  }

  async deleteTravelRoute(routeId: string): Promise<void> {
    const routes = await this.getTravelRoutes();
    const filteredRoutes = routes.filter(r => r.id !== routeId);
    await this.setTravelRoutes(filteredRoutes);
  }

  // Vehicles - Temporary localStorage implementation
  async getVehicles(): Promise<Vehicle[]> {
    try {
      const raw = localStorage.getItem('sad_vehicles');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async setVehicles(vehicles: Vehicle[]): Promise<void> {
    localStorage.setItem('sad_vehicles', JSON.stringify(vehicles));
  }

  async createVehicle(vehicle: Vehicle): Promise<Vehicle> {
    const vehicles = await this.getVehicles();
    vehicles.push(vehicle);
    await this.setVehicles(vehicles);
    return vehicle;
  }

  async updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    const vehicles = await this.getVehicles();
    const index = vehicles.findIndex(v => v.id === vehicleId);
    if (index === -1) throw new Error('Vehicle not found');
    
    const updatedVehicle = { ...vehicles[index], ...updates };
    vehicles[index] = updatedVehicle;
    await this.setVehicles(vehicles);
    return updatedVehicle;
  }

  async deleteVehicle(vehicleId: string): Promise<void> {
    const vehicles = await this.getVehicles();
    const filteredVehicles = vehicles.filter(v => v.id !== vehicleId);
    await this.setVehicles(filteredVehicles);
  }

  async clearAllData(): Promise<void> {
    // Clear localStorage data only (API data persists)
    const keys = ['sad_session', 'sad_remember', 'sad_teams', 'sad_travel_routes', 'sad_vehicles'];
    keys.forEach(key => localStorage.removeItem(key));
    
    // Clear all browser caches to force fresh data
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  }
}