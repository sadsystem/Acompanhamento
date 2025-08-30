import { type User, type InsertUser, type Evaluation, type InsertEvaluation, type Question, type InsertQuestion } from "@shared/schema";
import { randomUUID } from "crypto";

// Extended interface to match application needs
export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;

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
        password: "admin123",
        displayName: "Administrador",
        role: "admin",
        active: true,
        cargo: "Gestor",
        cpf: null,
        createdAt: new Date(),
      },
      {
        id: "u2",
        username: "teste",
        password: "teste123",
        displayName: "Usuário Teste",
        role: "colaborador",
        active: true,
        cargo: "Motorista",
        cpf: null,
        createdAt: new Date(),
      },
      {
        id: "u3",
        username: "maria",
        password: "123456",
        displayName: "Maria Silva",
        role: "colaborador",
        active: true,
        cargo: "Ajudante",
        cpf: null,
        createdAt: new Date(),
      },
      {
        id: "u4",
        username: "joao",
        password: "123456",
        displayName: "João Santos",
        role: "colaborador",
        active: true,
        cargo: "Motorista",
        cpf: null,
        createdAt: new Date(),
      },
      {
        id: "u5",
        username: "carlos",
        password: "123456",
        displayName: "Carlos Almeida",
        role: "colaborador",
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
      status: insertEvaluation.status ?? "queued",
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

export const storage = new MemStorage();
