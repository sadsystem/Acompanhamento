import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, gte, lte } from "drizzle-orm";
import { 
  users, 
  evaluations, 
  questions, 
  teams, 
  routes,
  type User, 
  type InsertUser, 
  type Evaluation, 
  type InsertEvaluation, 
  type Question, 
  type InsertQuestion,
  type Team,
  type InsertTeam,
  type Route,
  type InsertRoute
} from "@shared/schema";
import { IStorage } from "./storage";

export class SupabaseStorage implements IStorage {
  private db;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for Supabase connection");
    }
    
    const client = postgres(process.env.DATABASE_URL, { prepare: false });
    this.db = drizzle(client);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const result = await this.db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (!result[0]) {
      throw new Error(`User with id ${id} not found`);
    }
    return result[0];
  }

  // Evaluations
  async getEvaluations(filters?: {
    dateFrom?: string;
    dateTo?: string;
    evaluator?: string;
    evaluated?: string;
    status?: string;
  }): Promise<Evaluation[]> {
    let query = this.db.select().from(evaluations);
    
    const conditions = [];
    
    if (filters?.dateFrom) {
      conditions.push(gte(evaluations.dateRef, filters.dateFrom));
    }
    
    if (filters?.dateTo) {
      conditions.push(lte(evaluations.dateRef, filters.dateTo));
    }
    
    if (filters?.evaluator) {
      conditions.push(eq(evaluations.evaluator, filters.evaluator));
    }
    
    if (filters?.evaluated) {
      conditions.push(eq(evaluations.evaluated, filters.evaluated));
    }
    
    if (filters?.status) {
      conditions.push(eq(evaluations.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query;
  }

  async createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation> {
    const result = await this.db.insert(evaluations).values(evaluation).returning();
    return result[0];
  }

  async setEvaluations(evaluationList: Evaluation[]): Promise<void> {
    // Clear all existing evaluations and insert new ones
    await this.db.delete(evaluations);
    
    if (evaluationList.length > 0) {
      await this.db.insert(evaluations).values(evaluationList);
    }
  }

  // Questions
  async getQuestions(): Promise<Question[]> {
    return await this.db.select().from(questions);
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const result = await this.db.insert(questions).values(question).returning();
    return result[0];
  }

  // Teams
  async getTeams(): Promise<Team[]> {
    return await this.db.select().from(teams);
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const result = await this.db.insert(teams).values(team).returning();
    return result[0];
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
    const result = await this.db.update(teams).set(updates).where(eq(teams.id, id)).returning();
    if (!result[0]) {
      throw new Error(`Team with id ${id} not found`);
    }
    return result[0];
  }

  async deleteTeam(id: string): Promise<void> {
    await this.db.delete(teams).where(eq(teams.id, id));
  }

  // Routes
  async getRoutes(): Promise<Route[]> {
    return await this.db.select().from(routes);
  }

  async createRoute(route: InsertRoute): Promise<Route> {
    const result = await this.db.insert(routes).values(route).returning();
    return result[0];
  }

  async updateRoute(id: string, updates: Partial<Route>): Promise<Route> {
    const result = await this.db.update(routes).set(updates).where(eq(routes.id, id)).returning();
    if (!result[0]) {
      throw new Error(`Route with id ${id} not found`);
    }
    return result[0];
  }

  async deleteRoute(id: string): Promise<void> {
    await this.db.delete(routes).where(eq(routes.id, id));
  }

  // Seed initial data
  async seedInitialData(): Promise<void> {
    // Check if admin user exists
    const adminUser = await this.getUserByUsername("87999461725");
    
    if (!adminUser) {
      // Seed admin user
      await this.createUser({
        username: "87999461725",
        phone: "(87) 9 9946-1725",
        password: "admin",
        displayName: "Jucélio Verissimo Dias da Silva",
        role: "admin",
        permission: "ADM",
        active: true,
        cargo: "Assistente de Logística"
      });
    }

    // Check if questions exist
    const existingQuestions = await this.getQuestions();
    
    if (existingQuestions.length === 0) {
      // Seed questions
      const seedQuestions = [
        {
          id: "pontualidade",
          text: "Chegou dentro do horário estipulado?",
          order: 1,
          goodWhenYes: true,
          requireReasonWhen: "no"
        },
        {
          id: "conduta",
          text: "Foi educado e prestativo nas atividades de hoje?",
          order: 2,
          goodWhenYes: true,
          requireReasonWhen: "no"
        },
        {
          id: "desvio_rota",
          text: "Houve desvio de rota ao longo do dia?",
          order: 3,
          goodWhenYes: false,
          requireReasonWhen: "yes"
        },
        {
          id: "avaria",
          text: "Causou alguma avaria ao manusear os produtos?",
          order: 4,
          goodWhenYes: false,
          requireReasonWhen: "yes"
        },
      ];

      for (const question of seedQuestions) {
        await this.createQuestion(question);
      }
    }

    // Seed test users if they don't exist
    const testUsernames = ["87999001001", "87999001002", "87999002001", "87999002002", "87999002003", "87999002004"];
    
    for (const username of testUsernames) {
      const existingUser = await this.getUserByUsername(username);
      if (!existingUser) {
        const testUser = {
          username,
          phone: `(87) 9 ${username.slice(2, 6)}-${username.slice(6)}`,
          password: "123456",
          displayName: username.includes("001") ? "Motorista Teste" : "Ajudante Teste",
          role: "colaborador" as const,
          permission: "Colaborador" as const,
          active: true,
          cargo: username.includes("001") ? "Motorista" : "Ajudante"
        };
        await this.createUser(testUser);
      }
    }
  }
}