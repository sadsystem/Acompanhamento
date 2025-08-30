import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, gte, lte } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { users, evaluations, questions, type User, type InsertUser, type Evaluation, type InsertEvaluation, type Question, type InsertQuestion } from "@shared/schema";
import type { IStorage } from "./storage";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export class DbStorage implements IStorage {
  constructor() {
    this.initializeSeedData();
  }

  private async initializeSeedData() {
    try {
      // Check if users already exist
      const existingUsers = await db.select().from(users).limit(1);
      if (existingUsers.length > 0) {
        return; // Data already seeded
      }

      // Seed users
      await db.insert(users).values([
        {
          username: "admin",
          phone: "admin",
          password: "admin123",
          displayName: "Administrador",
          role: "admin",
          permission: "ADM",
          active: true,
          cargo: "Gestor",
          cpf: null,
        },
        {
          username: "(11)99999-8888",
          phone: "(11)99999-8888",
          password: "123456",
          displayName: "Motorista Teste 1",
          role: "colaborador",
          permission: "Colaborador",
          active: true,
          cargo: "Motorista",
          cpf: null,
        },
        {
          username: "(11)99999-7777", 
          phone: "(11)99999-7777",
          password: "123456",
          displayName: "Ajudante Teste 1",
          role: "colaborador",
          permission: "Colaborador",
          active: true,
          cargo: "Ajudante",
          cpf: null,
        },
        {
          username: "(11)99999-6666",
          phone: "(11)99999-6666",
          password: "123456",
          displayName: "Motorista Teste 2",
          role: "colaborador",
          permission: "Colaborador",
          active: true,
          cargo: "Motorista",
          cpf: null,
        },
        {
          username: "(11)99999-5555",
          phone: "(11)99999-5555",
          password: "123456",
          displayName: "Ajudante Teste 2",
          role: "colaborador",
          permission: "Colaborador",
          active: true,
          cargo: "Ajudante", 
          cpf: null,
        },
      ]);

      // Seed questions
      await db.insert(questions).values([
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
      ]);

      console.log("Database seeded successfully");
    } catch (error) {
      console.error("Error seeding database:", error);
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values({
      ...insertUser,
      active: insertUser.active ?? true,
      cargo: insertUser.cargo ?? null,
      cpf: insertUser.cpf ?? null,
    }).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const result = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`User with id ${id} not found`);
    }
    
    return result[0];
  }

  // Evaluation methods
  async getEvaluations(filters?: {
    dateFrom?: string;
    dateTo?: string;
    evaluator?: string;
    evaluated?: string;
    status?: string;
  }): Promise<Evaluation[]> {
    let query = db.select().from(evaluations);
    
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
      query = query.where(and(...conditions)) as any;
    }
    
    const result = await query.orderBy(evaluations.createdAt);
    return result.reverse(); // Newest first
  }

  async createEvaluation(insertEvaluation: InsertEvaluation): Promise<Evaluation> {
    const result = await db.insert(evaluations).values({
      ...insertEvaluation,
      status: insertEvaluation.status ?? "queued",
    }).returning();
    return result[0];
  }

  async setEvaluations(evaluationList: Evaluation[]): Promise<void> {
    // Para sincronização, vamos atualizar os status sem perder dados
    for (const evaluation of evaluationList) {
      await db.update(evaluations)
        .set({ status: evaluation.status })
        .where(eq(evaluations.id, evaluation.id));
    }
  }

  // Question methods
  async getQuestions(): Promise<Question[]> {
    return await db.select().from(questions).orderBy(questions.order);
  }

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const result = await db.insert(questions).values(insertQuestion).returning();
    return result[0];
  }
}