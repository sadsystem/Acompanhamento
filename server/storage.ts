import { type User, type InsertUser, type Evaluation, type InsertEvaluation, type Question, type InsertQuestion, users, evaluations, questions } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Extended interface to match application needs
export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Evaluations
  getEvaluations(filters?: {
    dateFrom?: string;
    dateTo?: string;
    evaluator?: string;
    evaluated?: string;
    status?: string;
  }): Promise<Evaluation[]>;
  createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation>;
  setEvaluations(evaluations: Evaluation[]): Promise<void>;

  // Questions
  getQuestions(): Promise<Question[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private evaluations: Map<string, Evaluation>;
  private questions: Map<string, Question>;

  constructor() {
    this.users = new Map();
    this.evaluations = new Map();
    this.questions = new Map();
    
    // Initialize with seed data
    this.initializeSeedData();
  }

  private initializeSeedData() {
    // Seed users
    const seedUsers: User[] = [
      {
        id: "u1",
        username: "admin",
        phone: "(87) 9 1234-5678",
        password: "admin123",
        displayName: "Administrador",
        role: "admin",
        permission: "ADM",
        active: true,
        cargo: "Gestor",
        cpf: null,
        createdAt: new Date(),
      },
      {
        id: "u2",
        username: "teste",
        phone: "(87) 9 9999-0001",
        password: "teste123",
        displayName: "Usuário Teste",
        role: "colaborador",
        permission: "Colaborador",
        active: true,
        cargo: "Motorista",
        cpf: null,
        createdAt: new Date(),
      },
      {
        id: "u3",
        username: "maria",
        phone: "(87) 9 9999-0002",
        password: "123456",
        displayName: "Maria Silva",
        role: "colaborador",
        permission: "Colaborador",
        active: true,
        cargo: "Ajudante",
        cpf: null,
        createdAt: new Date(),
      },
      {
        id: "u4",
        username: "joao",
        phone: "(87) 9 9999-0003",
        password: "123456",
        displayName: "João Santos",
        role: "colaborador",
        permission: "Colaborador",
        active: true,
        cargo: "Motorista",
        cpf: null,
        createdAt: new Date(),
      },
      {
        id: "u5",
        username: "carlos",
        phone: "(87) 9 9999-0004",
        password: "123456",
        displayName: "Carlos Almeida",
        role: "colaborador",
        permission: "Colaborador",
        active: true,
        cargo: "Ajudante",
        cpf: null,
        createdAt: new Date(),
      },
    ];

    seedUsers.forEach(user => {
      this.users.set(user.id, user);
    });

    // Seed questions
    const seedQuestions: Question[] = [
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

    seedQuestions.forEach(question => {
      this.questions.set(question.id, question);
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      active: insertUser.active ?? true,
      cargo: insertUser.cargo ?? null,
      cpf: insertUser.cpf ?? null,
      permission: insertUser.permission ?? "Colaborador",
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error(`User with id ${id} not found`);
    }

    const updatedUser: User = {
      ...existingUser,
      ...updates,
      id, // Ensure ID cannot be changed
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    if (!this.users.has(id)) {
      throw new Error(`User with id ${id} not found`);
    }
    this.users.delete(id);
  }

  // Evaluation methods
  async getEvaluations(filters?: {
    dateFrom?: string;
    dateTo?: string;
    evaluator?: string;
    evaluated?: string;
    status?: string;
  }): Promise<Evaluation[]> {
    let evaluations = Array.from(this.evaluations.values());

    if (filters) {
      if (filters.dateFrom) {
        evaluations = evaluations.filter(e => e.dateRef >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        evaluations = evaluations.filter(e => e.dateRef <= filters.dateTo!);
      }
      if (filters.evaluator) {
        evaluations = evaluations.filter(e => e.evaluator === filters.evaluator);
      }
      if (filters.evaluated) {
        evaluations = evaluations.filter(e => e.evaluated === filters.evaluated);
      }
      if (filters.status) {
        evaluations = evaluations.filter(e => e.status === filters.status);
      }
    }

    // Sort by creation date (newest first)
    return evaluations.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createEvaluation(insertEvaluation: InsertEvaluation): Promise<Evaluation> {
    const id = randomUUID();
    const evaluation: Evaluation = {
      ...insertEvaluation,
      id,
      createdAt: new Date(),
      status: insertEvaluation.status ?? "queued",
      routeId: insertEvaluation.routeId || null
    };
    this.evaluations.set(id, evaluation);
    return evaluation;
  }

  async setEvaluations(evaluations: Evaluation[]): Promise<void> {
    // Clear existing evaluations and replace with new list
    this.evaluations.clear();
    evaluations.forEach(evaluation => {
      this.evaluations.set(evaluation.id, evaluation);
    });
  }

  // Question methods
  async getQuestions(): Promise<Question[]> {
    return Array.from(this.questions.values()).sort((a, b) => a.order - b.order);
  }

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const question: Question = { ...insertQuestion };
    this.questions.set(question.id, question);
    return question;
  }
}

// Database storage using PostgreSQL
export class DatabaseStorage implements IStorage {
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

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (!result[0]) {
      throw new Error(`User with id ${id} not found`);
    }
    return result[0];
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getEvaluations(filters?: {
    dateFrom?: string;
    dateTo?: string;
    evaluator?: string;
    evaluated?: string;
    status?: string;
  }): Promise<Evaluation[]> {
    return await db.select().from(evaluations);
  }

  async createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation> {
    const evaluationData = {
      ...evaluation,
      createdAt: new Date()
    };
    const result = await db.insert(evaluations).values(evaluationData).returning();
    return result[0];
  }

  async setEvaluations(evaluationList: Evaluation[]): Promise<void> {
    // For now, just ignore this method as it's not used in production
  }

  async getQuestions(): Promise<Question[]> {
    return await db.select().from(questions);
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const result = await db.insert(questions).values(question).returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
