import { StorageAdapter } from './adapter';
import { User, Evaluation, Session, EvaluationFilters, Team, TravelRoute, Vehicle, InsertEvaluation } from '../config/types';
import { apiRequest } from '@/lib/queryClient';
import { API_BASE_URL } from '../config/config';

export class ApiStorageAdapter implements StorageAdapter {
  // Users
  async getUsers(): Promise<User[]> {
    const timestamp = Date.now();
    const response = await fetch(`${API_BASE_URL}/users/admin?_t=${timestamp}`, {
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
    
    const response = await fetch(`${API_BASE_URL}/evaluations?${params}`);
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

  // Teams - API implementation
  async getTeams(): Promise<Team[]> {
    const response = await fetch(`${API_BASE_URL}/teams`);
    if (!response.ok) throw new Error('Failed to fetch teams');
    return response.json();
  }

  async setTeams(teams: Team[]): Promise<void> {
    // Not needed with API - teams are managed individually
    throw new Error('setTeams not implemented in API adapter');
  }

  async createTeam(team: Team): Promise<Team> {
    const response = await apiRequest('POST', '/teams', team);
    return response.json();
  }

  async updateTeam(teamId: string, updates: Partial<Team>): Promise<Team> {
    const response = await apiRequest('PUT', `/teams/${teamId}`, updates);
    return response.json();
  }

  async deleteTeam(teamId: string): Promise<void> {
    await apiRequest('DELETE', `/teams/${teamId}`);
  }

  // Travel Routes - API implementation
  async getTravelRoutes(): Promise<TravelRoute[]> {
    const response = await fetch(`${API_BASE_URL}/routes`);
    if (!response.ok) throw new Error('Failed to fetch travel routes');
    return response.json();
  }

  async setTravelRoutes(routes: TravelRoute[]): Promise<void> {
    // Not needed with API - routes are managed individually
    throw new Error('setTravelRoutes not implemented in API adapter');
  }

  async createTravelRoute(route: TravelRoute): Promise<TravelRoute> {
    const response = await apiRequest('POST', '/routes', route);
    return response.json();
  }

  async updateTravelRoute(routeId: string, updates: Partial<TravelRoute>): Promise<TravelRoute> {
    const response = await apiRequest('PUT', `/routes/${routeId}`, updates);
    return response.json();
  }

  async deleteTravelRoute(routeId: string): Promise<void> {
    await apiRequest('DELETE', `/routes/${routeId}`);
  }

  // Vehicles - API implementation
  async getVehicles(): Promise<Vehicle[]> {
    const response = await fetch(`${API_BASE_URL}/vehicles`);
    if (!response.ok) throw new Error('Failed to fetch vehicles');
    return response.json();
  }

  async setVehicles(vehicles: Vehicle[]): Promise<void> {
    // Not needed with API - vehicles are managed individually
    throw new Error('setVehicles not implemented in API adapter');
  }

  async createVehicle(vehicle: Vehicle): Promise<Vehicle> {
    const response = await apiRequest('POST', '/vehicles', vehicle);
    return response.json();
  }

  async updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    const response = await apiRequest('PUT', `/vehicles/${vehicleId}`, updates);
    return response.json();
  }

  async deleteVehicle(vehicleId: string): Promise<void> {
    await apiRequest('DELETE', `/vehicles/${vehicleId}`);
  }

  async clearAllData(): Promise<void> {
    // Clear only session localStorage data (API data persists on server)
    const keys = ['sad_session', 'sad_remember'];
    keys.forEach(key => localStorage.removeItem(key));
    
    // Clear all browser caches to force fresh data
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  }
}