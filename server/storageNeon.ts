// Neon-optimized storage for Vercel serverless
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../shared/schema";
import { eq, sql, desc, and, or, asc } from "drizzle-orm";
import type { User, Question, Evaluation, Team, Route } from "../shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export class StorageNeon {
  private db: ReturnType<typeof drizzle>;
  private static instance: StorageNeon;
  
  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for Neon database connection");
    }
    
    const databaseUrl = process.env.DATABASE_URL;
    console.log(`🔗 Connecting to Neon: ${databaseUrl.split('@')[0]}@***`);
    
    // Use HTTP connection for better serverless performance
    const neonClient = neon(databaseUrl);
    this.db = drizzle(neonClient, { schema });
    console.log('✅ Neon database connection initialized');
  }

  // Singleton pattern for connection reuse
  static getInstance(): StorageNeon {
    if (!StorageNeon.instance) {
      StorageNeon.instance = new StorageNeon();
    }
    return StorageNeon.instance;
  }

  // User management
  async getUsers(): Promise<User[]> {
    const result = await this.db.select().from(schema.users);
    return result;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(schema.users).where(eq(schema.users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(schema.users).where(eq(schema.users.username, username));
    return result[0];
  }

  async getUserByCpf(cpf: string): Promise<User | undefined> {
    const result = await this.db.select().from(schema.users).where(eq(schema.users.cpf, cpf));
    return result[0];
  }

  async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const userData = { 
      ...user, 
      id: randomUUID(),
      password: hashedPassword,
      createdAt: new Date()
    };
    
    const result = await this.db.insert(schema.users).values(userData).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    console.log('=== STORAGE UPDATE USER DEBUG ===');
    console.log('User ID:', id);
    console.log('Updates received:', JSON.stringify(updates, null, 2));
    
    try {
      // Validate required fields
      if (!id || id.trim() === '') {
        throw new Error('User ID is required');
      }

      // Fields that should not be updated
      const excludedFields = ['id', 'createdAt'];

      // Clean the updates object to remove undefined/null values and excluded fields
      const cleanUpdates: any = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null && !excludedFields.includes(key)) {
          // Convert string dates to Date objects for timestamp fields
          if (key === 'createdAt' && typeof value === 'string') {
            cleanUpdates[key] = new Date(value);
          } else {
            cleanUpdates[key] = value;
          }
        }
      });

      console.log('Clean updates:', JSON.stringify(cleanUpdates, null, 2));

      // Hash password if being updated
      if (cleanUpdates.password) {
        console.log('Hashing password...');
        cleanUpdates.password = await bcrypt.hash(cleanUpdates.password, 10);
      }
      
      console.log('Executing update query...');
      const result = await this.db
        .update(schema.users)
        .set(cleanUpdates)
        .where(eq(schema.users.id, id))
        .returning();
      
      console.log('Query result length:', result.length);
      
      if (result.length === 0) {
        throw new Error(`User with id ${id} not found`);
      }
      
      console.log('User updated successfully:', result[0].id);
      return result[0];
    } catch (error) {
      console.error('=== STORAGE UPDATE USER ERROR ===');
      console.error('Error details:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    await this.db.delete(schema.users).where(eq(schema.users.id, id));
  }

  // Questions management
  async getQuestions(): Promise<Question[]> {
    const result = await this.db
      .select()
      .from(schema.questions)
      .orderBy(schema.questions.order);
    return result;
  }

  async createQuestion(question: Omit<Question, 'id'>): Promise<Question> {
    const questionData = {
      ...question,
      id: randomUUID()
    };
    
    const result = await this.db.insert(schema.questions).values(questionData).returning();
    return result[0];
  }

  // Evaluations management
  async getEvaluations(filters?: {
    dateFrom?: string;
    dateTo?: string;
    evaluator?: string;
    evaluated?: string;
    status?: "queued" | "synced";
  }): Promise<Evaluation[]> {
    let query = this.db.select().from(schema.evaluations);
    
    if (filters) {
      const conditions = [];
      
      if (filters.dateFrom) {
        conditions.push(sql`${schema.evaluations.dateRef} >= ${filters.dateFrom}`);
      }
      if (filters.dateTo) {
        conditions.push(sql`${schema.evaluations.dateRef} <= ${filters.dateTo}`);
      }
      if (filters.evaluator) {
        conditions.push(eq(schema.evaluations.evaluator, filters.evaluator));
      }
      if (filters.evaluated) {
        conditions.push(eq(schema.evaluations.evaluated, filters.evaluated));
      }
      if (filters.status) {
        conditions.push(eq(schema.evaluations.status, filters.status));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    const result = await query.orderBy(desc(schema.evaluations.createdAt));
    return result;
  }

  async createEvaluation(evaluation: Omit<Evaluation, 'id'>): Promise<Evaluation> {
    const evaluationData = {
      ...evaluation,
      id: randomUUID(),
      createdAt: new Date()
    };
    
    const result = await this.db.insert(schema.evaluations).values(evaluationData).returning();
    return result[0];
  }

  async setEvaluations(evaluations: Evaluation[]): Promise<void> {
    if (evaluations.length === 0) return;
    
    // Clear existing evaluations and insert new ones
    await this.db.delete(schema.evaluations);
    await this.db.insert(schema.evaluations).values(evaluations);
  }

  // Teams management
  async getTeams(): Promise<Team[]> {
    const result = await this.db.select().from(schema.teams).orderBy(desc(schema.teams.createdAt));
    return result;
  }

  async createTeam(team: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<Team> {
    const teamData = {
      ...team,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await this.db.insert(schema.teams).values(teamData).returning();
    return result[0];
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
    const result = await this.db
      .update(schema.teams)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.teams.id, id))
      .returning();
    return result[0];
  }

  async deleteTeam(id: string): Promise<void> {
    await this.db.delete(schema.teams).where(eq(schema.teams.id, id));
  }

  // Routes management
  async getRoutes(): Promise<Route[]> {
    const result = await this.db.select().from(schema.routes).orderBy(desc(schema.routes.createdAt));
    return result;
  }

  async createRoute(route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>): Promise<Route> {
    const routeData = {
      ...route,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await this.db.insert(schema.routes).values(routeData).returning();
    return result[0];
  }

  async updateRoute(id: string, updates: Partial<Route>): Promise<Route> {
    const result = await this.db
      .update(schema.routes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.routes.id, id))
      .returning();
    return result[0];
  }

  async deleteRoute(id: string): Promise<void> {
    await this.db.delete(schema.routes).where(eq(schema.routes.id, id));
  }

  // Health check with database connectivity test
  async healthCheck(): Promise<{
    status: string;
    database: string;
    responseTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Simple database connectivity test
      const result = await this.db.execute(sql`SELECT 1 as test`);
      const responseTime = Date.now() - startTime;
      
      return {
        status: "healthy",
        database: "connected",
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error("Health check database error:", error);
      
      return {
        status: "unhealthy", 
        database: "disconnected",
        responseTime
      };
    }
  }

  // Seed initial data
  async seedInitialData(): Promise<void> {
    try {
      // Check if admin user exists
      const adminUser = await this.getUserByUsername("87999461725");
      
      if (!adminUser) {
        // Create admin user
        await this.createUser({
          username: "87999461725",
          phone: "(87) 9 9946-1725",
          password: "admin123", // Will be hashed automatically
          displayName: "Administrador",
          role: "admin",
          permission: "ADM",
          active: true,
          cargo: "ADM",
          cpf: null
        });
        console.log("Admin user created");
      }

      // Check if questions exist
      const questions = await this.getQuestions();
      
      if (questions.length === 0) {
        const defaultQuestions = [
          {
            id: "1",
            text: "Chegou no horário?",
            order: 1,
            goodWhenYes: true,
            requireReasonWhen: "no" as const
          },
          {
            id: "2", 
            text: "Uniforme completo?",
            order: 2,
            goodWhenYes: true,
            requireReasonWhen: "no" as const
          },
          {
            id: "3",
            text: "Atendimento adequado?", 
            order: 3,
            goodWhenYes: true,
            requireReasonWhen: "no" as const
          },
          {
            id: "4",
            text: "Organizou o veículo?",
            order: 4,
            goodWhenYes: true,
            requireReasonWhen: "no" as const
          }
        ];

        for (const question of defaultQuestions) {
          await this.db.insert(schema.questions).values(question);
        }
        console.log("Default questions created");
      }
    } catch (error) {
      console.error("Error seeding data:", error);
      // Don't throw - let the app continue
    }
  }
}

// Export singleton instance
export const storageNeon = StorageNeon.getInstance();
