// Hybrid storage that works with both Supabase (dev) and Neon (production)
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { Pool, neonConfig } from "@neondatabase/serverless";
import postgres from "postgres";
import * as schema from "../shared/schema";
import { eq, sql, desc, and, isNull, or } from "drizzle-orm";
import type { User, Question, Evaluation, Team, Route } from "../shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

// Check if we're using Neon or regular Postgres
const isNeonUrl = (url: string) => url.includes('neon.tech') || url.includes('pooler.supabase.com');
const isSupabaseUrl = (url: string) => url.includes('supabase.com');

export class StorageHybrid {
  private db: any;
  private static instance: StorageHybrid;
  
  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for database connection");
    }
    
    const databaseUrl = process.env.DATABASE_URL;
    console.log(`Initializing database connection: ${databaseUrl.split('@')[0]}@***`);
    
    if (isNeonUrl(databaseUrl)) {
      // Use Neon serverless for production or Neon URLs
      console.log('Using Neon serverless adapter');
      neonConfig.fetchConnectionCache = true;
      neonConfig.useSecureWebSocket = false;
      
      const pool = new Pool({ 
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      
      this.db = drizzleNeon(pool, { schema });
    } else {
      // Use postgres-js for Supabase or regular PostgreSQL
      console.log('Using postgres-js adapter for Supabase/PostgreSQL');
      const queryClient = postgres(databaseUrl, {
        ssl: process.env.NODE_ENV === 'production' ? 'require' : 'prefer',
        max: 1, // Limit connections for serverless
      });
      
      this.db = drizzlePostgres(queryClient, { schema });
    }
  }
  
  static getInstance(): StorageHybrid {
    if (!StorageHybrid.instance) {
      StorageHybrid.instance = new StorageHybrid();
    }
    return StorageHybrid.instance;
  }

  async getUsers(): Promise<User[]> {
    const result = await this.db.select().from(schema.users);
    return result;
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
    return result[0];
  }

  async createUser(userData: Omit<User, "id" | "createdAt">): Promise<User> {
    const newUser = {
      id: randomUUID(),
      ...userData,
      createdAt: new Date(),
    };

    const result = await this.db.insert(schema.users).values(newUser).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const result = await this.db
      .update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`User with id ${id} not found`);
    }
    
    return result[0];
  }

  async deleteUser(id: string): Promise<void> {
    await this.db.delete(schema.users).where(eq(schema.users.id, id));
  }

  async getQuestions(): Promise<Question[]> {
    const result = await this.db.select().from(schema.questions).orderBy(desc(schema.questions.createdAt));
    return result;
  }

  async createQuestion(questionData: Omit<Question, "id" | "createdAt">): Promise<Question> {
    const newQuestion = {
      id: randomUUID(),
      ...questionData,
      createdAt: new Date(),
    };

    const result = await this.db.insert(schema.questions).values(newQuestion).returning();
    return result[0];
  }

  async getEvaluations(filters?: {
    dateFrom?: string;
    dateTo?: string;
    evaluator?: string;
    evaluated?: string;
    status?: string;
  }): Promise<Evaluation[]> {
    let query = this.db.select().from(schema.evaluations);

    if (filters) {
      const conditions = [];
      
      if (filters.dateFrom) {
        conditions.push(sql`${schema.evaluations.createdAt} >= ${filters.dateFrom}`);
      }
      
      if (filters.dateTo) {
        conditions.push(sql`${schema.evaluations.createdAt} <= ${filters.dateTo}`);
      }
      
      if (filters.evaluator) {
        conditions.push(eq(schema.evaluations.evaluatorId, filters.evaluator));
      }
      
      if (filters.evaluated) {
        conditions.push(eq(schema.evaluations.evaluatedId, filters.evaluated));
      }
      
      if (filters.status) {
        conditions.push(eq(schema.evaluations.status, filters.status as any));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }

    const result = await query.orderBy(desc(schema.evaluations.createdAt));
    return result;
  }

  async createEvaluation(evaluationData: Omit<Evaluation, "id" | "createdAt">): Promise<Evaluation> {
    const newEvaluation = {
      id: randomUUID(),
      ...evaluationData,
      createdAt: new Date(),
    };

    const result = await this.db.insert(schema.evaluations).values(newEvaluation).returning();
    return result[0];
  }

  async setEvaluations(evaluations: Evaluation[]): Promise<void> {
    if (evaluations.length === 0) return;
    
    // Delete existing evaluations and insert new ones
    await this.db.delete(schema.evaluations);
    await this.db.insert(schema.evaluations).values(evaluations);
  }

  // Seed data methods (for initialization)
  async seedInitialData(): Promise<void> {
    try {
      // Check if admin user exists
      const adminUser = await this.getUserByUsername("admin");
      if (!adminUser) {
        console.log("Creating admin user...");
        const hashedPassword = await bcrypt.hash("admin123", 10);
        await this.createUser({
          username: "admin",
          password: hashedPassword,
          role: "admin",
          name: "Administrator",
          email: "admin@example.com"
        });
        console.log("Admin user created successfully");
      }

      // Check if sample questions exist
      const questions = await this.getQuestions();
      if (questions.length === 0) {
        console.log("Creating sample questions...");
        const sampleQuestions = [
          {
            text: "Como você avalia a comunicação da pessoa avaliada?",
            type: "scale" as const,
            scale: { min: 1, max: 5, labels: { 1: "Péssima", 5: "Excelente" } }
          },
          {
            text: "Quais são os pontos fortes da pessoa avaliada?",
            type: "text" as const
          },
          {
            text: "Que áreas precisam de melhoria?",
            type: "text" as const
          }
        ];

        for (const question of sampleQuestions) {
          await this.createQuestion(question);
        }
        console.log("Sample questions created successfully");
      }
    } catch (error) {
      console.error("Error seeding data:", error);
      throw error;
    }
  }
}

// Singleton instance
export const storageHybrid = StorageHybrid.getInstance();
