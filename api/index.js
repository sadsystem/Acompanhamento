var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import "dotenv/config";
import express2 from "express";
import cors from "cors";

// server/routes.ts
import { createServer } from "http";

// server/storageNeon.ts
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  evaluations: () => evaluations,
  insertEvaluationSchema: () => insertEvaluationSchema,
  insertQuestionSchema: () => insertQuestionSchema,
  insertRouteSchema: () => insertRouteSchema,
  insertTeamSchema: () => insertTeamSchema,
  insertUserSchema: () => insertUserSchema,
  questions: () => questions,
  routes: () => routes,
  teams: () => teams,
  users: () => users
});
import { pgTable, text, varchar, boolean, timestamp, real, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { randomUUID } from "crypto";
var users = pgTable("users", {
  id: varchar("id").primaryKey().$defaultFn(() => randomUUID()),
  username: text("username").notNull().unique(),
  // Now phone number for login
  phone: text("phone").notNull(),
  // Phone in format: (87) 9 XXXX-XXXX
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull(),
  // "admin" | "colaborador" | "gestor"
  permission: text("permission").notNull().default("Colaborador"),
  // "ADM" | "Colaborador" | "Gestor"
  active: boolean("active").notNull().default(true),
  cargo: text("cargo"),
  // "Motorista" | "Ajudante" | "ADM"
  cpf: text("cpf"),
  createdAt: timestamp("created_at").defaultNow()
});
var questions = pgTable("questions", {
  id: varchar("id").primaryKey(),
  text: text("text").notNull(),
  order: real("order").notNull(),
  goodWhenYes: boolean("good_when_yes").notNull(),
  requireReasonWhen: text("require_reason_when").notNull()
  // "yes" | "no" | "never"
});
var evaluations = pgTable("evaluations", {
  id: varchar("id").primaryKey().$defaultFn(() => randomUUID()),
  createdAt: timestamp("created_at").notNull(),
  dateRef: text("date_ref").notNull(),
  // YYYY-MM-DD
  evaluator: text("evaluator").notNull(),
  evaluated: text("evaluated").notNull(),
  answers: json("answers").notNull(),
  // Answer[]
  score: real("score").notNull(),
  status: text("status").notNull().default("queued")
  // "queued" | "synced"
});
var teams = pgTable("teams", {
  id: varchar("id").primaryKey().$defaultFn(() => randomUUID()),
  driverUsername: text("driver_username").notNull(),
  assistants: json("assistants").notNull(),
  // string[] - usernames of assistants (max 2)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var routes = pgTable("routes", {
  id: varchar("id").primaryKey().$defaultFn(() => randomUUID()),
  city: text("city").notNull(),
  cities: json("cities").notNull(),
  // string[] - lista completa das cidades
  teamId: varchar("team_id").references(() => teams.id),
  startDate: text("start_date").notNull(),
  // YYYY-MM-DD
  endDate: text("end_date"),
  // YYYY-MM-DD when route is finished
  status: text("status").notNull().default("formation"),
  // "formation" | "active" | "completed"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});
var insertQuestionSchema = createInsertSchema(questions);
var insertEvaluationSchema = createInsertSchema(evaluations).omit({
  id: true
});
var insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertRouteSchema = createInsertSchema(routes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// server/storageNeon.ts
import { eq, sql, desc, and } from "drizzle-orm";
import { randomUUID as randomUUID2 } from "crypto";
import bcrypt from "bcryptjs";
if (process.env.NODE_ENV === "production") {
  neonConfig.fetchConnectionCache = true;
  neonConfig.useSecureWebSocket = false;
}
var StorageNeon = class _StorageNeon {
  db;
  static instance;
  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for database connection");
    }
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
    });
    this.db = drizzle(pool, { schema: schema_exports });
  }
  // Singleton pattern for connection reuse
  static getInstance() {
    if (!_StorageNeon.instance) {
      _StorageNeon.instance = new _StorageNeon();
    }
    return _StorageNeon.instance;
  }
  // User management
  async getUsers() {
    const result = await this.db.select().from(users);
    return result;
  }
  async getUserById(id) {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }
  async getUserByUsername(username) {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }
  async createUser(user) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const userData = {
      ...user,
      id: randomUUID2(),
      password: hashedPassword,
      createdAt: /* @__PURE__ */ new Date()
    };
    const result = await this.db.insert(users).values(userData).returning();
    return result[0];
  }
  async updateUser(id, updates) {
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    const result = await this.db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }
  async deleteUser(id) {
    await this.db.delete(users).where(eq(users.id, id));
  }
  // Questions management
  async getQuestions() {
    const result = await this.db.select().from(questions).orderBy(questions.order);
    return result;
  }
  async createQuestion(question) {
    const questionData = {
      ...question,
      id: randomUUID2()
    };
    const result = await this.db.insert(questions).values(questionData).returning();
    return result[0];
  }
  // Evaluations management
  async getEvaluations(filters) {
    let query = this.db.select().from(evaluations);
    if (filters) {
      const conditions = [];
      if (filters.dateFrom) {
        conditions.push(sql`${evaluations.dateRef} >= ${filters.dateFrom}`);
      }
      if (filters.dateTo) {
        conditions.push(sql`${evaluations.dateRef} <= ${filters.dateTo}`);
      }
      if (filters.evaluator) {
        conditions.push(eq(evaluations.evaluator, filters.evaluator));
      }
      if (filters.evaluated) {
        conditions.push(eq(evaluations.evaluated, filters.evaluated));
      }
      if (filters.status) {
        conditions.push(eq(evaluations.status, filters.status));
      }
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    const result = await query.orderBy(desc(evaluations.createdAt));
    return result;
  }
  async createEvaluation(evaluation) {
    const evaluationData = {
      ...evaluation,
      id: randomUUID2(),
      createdAt: /* @__PURE__ */ new Date()
    };
    const result = await this.db.insert(evaluations).values(evaluationData).returning();
    return result[0];
  }
  async setEvaluations(evaluations2) {
    if (evaluations2.length === 0) return;
    await this.db.delete(evaluations);
    await this.db.insert(evaluations).values(evaluations2);
  }
  // Teams management
  async getTeams() {
    const result = await this.db.select().from(teams).orderBy(desc(teams.createdAt));
    return result;
  }
  async createTeam(team) {
    const teamData = {
      ...team,
      id: randomUUID2(),
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    const result = await this.db.insert(teams).values(teamData).returning();
    return result[0];
  }
  async updateTeam(id, updates) {
    const result = await this.db.update(teams).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(teams.id, id)).returning();
    return result[0];
  }
  async deleteTeam(id) {
    await this.db.delete(teams).where(eq(teams.id, id));
  }
  // Routes management
  async getRoutes() {
    const result = await this.db.select().from(routes).orderBy(desc(routes.createdAt));
    return result;
  }
  async createRoute(route) {
    const routeData = {
      ...route,
      id: randomUUID2(),
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    const result = await this.db.insert(routes).values(routeData).returning();
    return result[0];
  }
  async updateRoute(id, updates) {
    const result = await this.db.update(routes).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(routes.id, id)).returning();
    return result[0];
  }
  async deleteRoute(id) {
    await this.db.delete(routes).where(eq(routes.id, id));
  }
  // Seed initial data
  async seedInitialData() {
    try {
      const adminUser = await this.getUserByUsername("87999461725");
      if (!adminUser) {
        await this.createUser({
          username: "87999461725",
          phone: "(87) 9 9946-1725",
          password: "admin123",
          // Will be hashed automatically
          displayName: "Administrador",
          role: "admin",
          permission: "ADM",
          active: true,
          cargo: "ADM",
          cpf: null
        });
        console.log("Admin user created");
      }
      const questions2 = await this.getQuestions();
      if (questions2.length === 0) {
        const defaultQuestions = [
          {
            id: "1",
            text: "Chegou no hor\xE1rio?",
            order: 1,
            goodWhenYes: true,
            requireReasonWhen: "no"
          },
          {
            id: "2",
            text: "Uniforme completo?",
            order: 2,
            goodWhenYes: true,
            requireReasonWhen: "no"
          },
          {
            id: "3",
            text: "Atendimento adequado?",
            order: 3,
            goodWhenYes: true,
            requireReasonWhen: "no"
          },
          {
            id: "4",
            text: "Organizou o ve\xEDculo?",
            order: 4,
            goodWhenYes: true,
            requireReasonWhen: "no"
          }
        ];
        for (const question of defaultQuestions) {
          await this.db.insert(questions).values(question);
        }
        console.log("Default questions created");
      }
    } catch (error) {
      console.error("Error seeding data:", error);
    }
  }
};
var storageNeon = StorageNeon.getInstance();

// server/routes.ts
import { z } from "zod";
var seedInitialized = false;
var ensureSeedData = async () => {
  if (!seedInitialized) {
    try {
      await storageNeon.seedInitialData();
      seedInitialized = true;
    } catch (error) {
      console.error("Seed initialization error:", error);
    }
  }
};
var loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  remember: z.boolean().optional()
});
var createUserSchema = insertUserSchema.extend({
  cargo: z.string().optional(),
  cpf: z.string().optional()
});
async function registerRoutes(app2) {
  app2.use("/api", async (req, res, next) => {
    try {
      await ensureSeedData();
      next();
    } catch (error) {
      console.error("Seed middleware error:", error);
      next();
    }
  });
  app2.get("/api/health", async (req, res) => {
    try {
      const start = Date.now();
      await storageNeon.getUsers();
      const responseTime = Date.now() - start;
      res.json({
        status: "healthy",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        database: "connected",
        responseTime: `${responseTime}ms`,
        environment: process.env.NODE_ENV || "development"
      });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(503).json({
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app2.get("/health", (req, res) => {
    res.json({ status: "ok", alt: true, path: "/health" });
  });
  app2.get("/api/questions", async (_req, res) => {
    try {
      const qs = await storageNeon.getQuestions();
      res.json(qs);
    } catch (error) {
      res.status(500).json({ error: "Erro interno" });
    }
  });
  app2.get("/questions", async (_req, res) => {
    try {
      const qs = await storageNeon.getQuestions();
      res.json(qs);
    } catch {
      res.status(500).json({ error: "Erro" });
    }
  });
  app2.get("/api/debug/diagnostics", async (req, res) => {
    const started = Date.now();
    const checks = {};
    const run = async (name, fn) => {
      const t0 = Date.now();
      try {
        const data = await fn();
        checks[name] = { ok: true, ms: Date.now() - t0, ...data };
      } catch (err) {
        checks[name] = { ok: false, ms: Date.now() - t0, error: err.message };
      }
    };
    await run("envVars", async () => {
      const required = ["DATABASE_URL"];
      const present = {};
      required.forEach((k) => present[k] = !!process.env[k]);
      const missing = Object.entries(present).filter(([, v]) => !v).map(([k]) => k);
      return { present, missing };
    });
    await run("dbConnection", async () => {
      const users2 = await storageNeon.getUsers();
      return { usersSample: users2.slice(0, 1).map((u) => ({ id: u.id, username: u.username })), totalUsers: users2.length };
    });
    await run("questions", async () => {
      const qs = await storageNeon.getQuestions();
      return { count: qs.length, ids: qs.map((q) => q.id) };
    });
    await run("evaluationsCount", async () => {
      try {
        const evals = await storageNeon.getEvaluations();
        return { count: evals.length };
      } catch (e) {
        throw new Error("Falha ao consultar avalia\xE7\xF5es: " + e.message);
      }
    });
    await run("seedAdminUser", async () => {
      const admin = await storageNeon.getUserByUsername("87999461725");
      return { exists: !!admin };
    });
    const summaryOk = Object.values(checks).every((c) => c.ok);
    res.status(summaryOk ? 200 : 207).json({
      status: summaryOk ? "ok" : "issues",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      totalMs: Date.now() - started,
      nodeEnv: process.env.NODE_ENV,
      checks
    });
  });
  app2.get("/debug/diagnostics", async (req, res) => {
    res.status(400).json({ error: "Use /api/debug/diagnostics" });
  });
  app2.get("/api/debug/status", async (req, res) => {
    const startedAt = Date.now();
    const info = {
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      env: process.env.NODE_ENV,
      commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT || null,
      uptimeSec: Math.round(process.uptime())
    };
    try {
      const users2 = await storageNeon.getUsers();
      let evalCount = 0;
      try {
        const evaluations2 = await storageNeon.getEvaluations();
        evalCount = evaluations2.length;
      } catch (e) {
        info.dbEvaluationsError = e.message;
      }
      info.database = {
        connected: true,
        users: users2.length,
        evaluations: evalCount
      };
    } catch (err) {
      info.database = {
        connected: false,
        error: err.message
      };
      info.status = "degraded";
    }
    try {
      const stack = app2._router?.stack || [];
      const routes2 = stack.filter((l) => l.route && l.route.path && l.route.methods).map((l) => ({
        path: l.route.path,
        methods: Object.keys(l.route.methods)
      })).filter((r) => r.path.startsWith("/api"));
      info.routes = routes2;
    } catch (e) {
      info.routesError = e.message;
    }
    info.latencyMs = Date.now() - startedAt;
    res.status(info.status === "ok" ? 200 : 503).json(info);
  });
  app2.post("/api/auth/login", async (req, res) => {
    console.log("DEBUG: Login endpoint hit with", req.body);
    try {
      const { username, password, remember } = loginSchema.parse(req.body);
      console.log("DEBUG: Parsed request data:", { username, remember });
      let user;
      try {
        user = await storageNeon.getUserByUsername(username);
        console.log("DEBUG: User search result:", user ? "User found" : "User not found");
        if (!user || user.password !== password) {
          console.log("DEBUG: Authentication failed");
          return res.status(401).json({
            success: false,
            error: "Credenciais inv\xE1lidas"
          });
        }
      } catch (dbError) {
        console.error("DEBUG: Database error:", dbError);
        return res.status(500).json({
          success: false,
          error: "Erro interno no servidor"
        });
      }
      const token = `token-${user.id}`;
      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            role: user.role,
            cargo: user.cargo
          }
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: "Dados inv\xE1lidos"
      });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    res.json({ success: true });
  });
  app2.get("/api/auth/me", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Token n\xE3o fornecido" });
    }
    const userId = token.replace("token-", "");
    const user = await storageNeon.getUserById(userId);
    if (!user) {
      return res.status(401).json({ error: "Token inv\xE1lido" });
    }
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      cargo: user.cargo
    });
  });
  app2.get("/api/users/admin", async (req, res) => {
    try {
      const users2 = await storageNeon.getUsers();
      res.json(users2);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar usu\xE1rios" });
    }
  });
  app2.get("/api/users/team", async (req, res) => {
    try {
      const users2 = await storageNeon.getUsers();
      const teamMembers = users2.filter((u) => u.role === "colaborador" && u.active).map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        cargo: u.cargo
      }));
      res.json(teamMembers);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar equipe" });
    }
  });
  app2.post("/api/users", async (req, res) => {
    try {
      const validation = createUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Dados inv\xE1lidos",
          details: validation.error.errors
        });
      }
      const userData = {
        ...validation.data,
        permission: validation.data.permission || "Colaborador",
        active: validation.data.active ?? true,
        cargo: validation.data.cargo || null,
        cpf: validation.data.cpf || null
      };
      const user = await storageNeon.createUser(userData);
      res.status(201).json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        cargo: user.cargo
      });
    } catch (error) {
      res.status(400).json({ error: "Dados de usu\xE1rio inv\xE1lidos" });
    }
  });
  app2.put("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const user = await storageNeon.updateUser(id, updates);
      res.json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        active: user.active,
        cargo: user.cargo
      });
    } catch (error) {
      res.status(400).json({ error: "Erro ao atualizar usu\xE1rio" });
    }
  });
  app2.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storageNeon.deleteUser(id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Erro ao excluir usu\xE1rio" });
    }
  });
  app2.get("/api/evaluations", async (req, res) => {
    try {
      const { dateFrom, dateTo, evaluator, evaluated, status } = req.query;
      const filters = {};
      if (dateFrom) filters.dateFrom = String(dateFrom);
      if (dateTo) filters.dateTo = String(dateTo);
      if (evaluator) filters.evaluator = String(evaluator);
      if (evaluated) filters.evaluated = String(evaluated);
      if (status) filters.status = String(status);
      const evaluations2 = await storageNeon.getEvaluations(filters);
      res.json(evaluations2);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar avalia\xE7\xF5es" });
    }
  });
  app2.post("/api/evaluations", async (req, res) => {
    try {
      console.log("POST /api/evaluations - Received data:", JSON.stringify(req.body, null, 2));
      const evaluationData = {
        ...insertEvaluationSchema.parse(req.body),
        status: req.body.status || "queued"
      };
      console.log("POST /api/evaluations - Parsed data:", JSON.stringify(evaluationData, null, 2));
      const evaluation = await storageNeon.createEvaluation(evaluationData);
      res.status(201).json(evaluation);
    } catch (error) {
      console.error("POST /api/evaluations - Validation error:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
      res.status(400).json({ error: "Dados de avalia\xE7\xE3o inv\xE1lidos" });
    }
  });
  app2.get("/api/evaluations/stats", async (req, res) => {
    try {
      const evaluations2 = await storageNeon.getEvaluations();
      const totalEvaluations = evaluations2.length;
      const uniqueEvaluated = new Set(evaluations2.map((e) => e.evaluated)).size;
      const averageScore = evaluations2.length > 0 ? evaluations2.reduce((sum, e) => sum + e.score, 0) / evaluations2.length : 0;
      res.json({
        totalEvaluations,
        uniqueEvaluated,
        averageScore: Number(averageScore.toFixed(2))
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao calcular estat\xEDsticas" });
    }
  });
  app2.get("/api/reports/dashboard", async (req, res) => {
    try {
      const evaluations2 = await storageNeon.getEvaluations();
      const users2 = await storageNeon.getUsers();
      res.json({
        evaluations: evaluations2.length,
        users: users2.length
        // Additional dashboard metrics...
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar relat\xF3rio" });
    }
  });
  app2.get("/api/reports/export", async (req, res) => {
    try {
      const { format } = req.query;
      const evaluations2 = await storageNeon.getEvaluations();
      if (format === "csv") {
        const csvHeaders = ["id", "createdAt", "evaluator", "evaluated", "score"];
        const csvRows = evaluations2.map(
          (e) => [e.id, e.createdAt, e.evaluator, e.evaluated, e.score].join(",")
        );
        const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=evaluations.csv");
        res.send(csvContent);
      } else {
        res.json(evaluations2);
      }
    } catch (error) {
      res.status(500).json({ error: "Erro ao exportar dados" });
    }
  });
  app2.get("/api/reports/alerts", async (req, res) => {
    try {
      const evaluations2 = await storageNeon.getEvaluations();
      const threshold = 0.3;
      const alerts = evaluations2.filter((e) => e.score < threshold).map((e) => ({
        id: e.id,
        evaluated: e.evaluated,
        score: e.score,
        dateRef: e.dateRef
      }));
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar alertas" });
    }
  });
  app2.use("/api", (req, res, next) => {
    if (res.headersSent) return next();
    try {
      const stack = app2._router?.stack || [];
      const routes2 = stack.filter((l) => l.route && l.route.path && l.route.methods).map((l) => ({ path: l.route.path, methods: Object.keys(l.route.methods) })).filter((r) => r.path.startsWith("/api"));
      res.status(404).json({
        error: "api_not_found",
        message: "Nenhuma rota /api correspondente",
        requested: req.path,
        registeredCount: routes2.length,
        sample: routes2.slice(0, 10)
      });
    } catch (e) {
      res.status(404).json({ error: "api_not_found", requested: req.path });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    console.warn(`Build directory not found: ${distPath}, trying alternative paths...`);
    const altPaths = [
      path2.resolve(import.meta.dirname, "public"),
      path2.resolve(import.meta.dirname, "..", "public")
    ];
    for (const altPath of altPaths) {
      if (fs.existsSync(altPath)) {
        console.log(`Using alternative build path: ${altPath}`);
        app2.use(express.static(altPath));
        app2.use("*", (_req, res) => {
          res.sendFile(path2.resolve(altPath, "index.html"));
        });
        return;
      }
    }
    throw new Error(
      `Could not find any build directory. Make sure to build the client first.`
    );
  }
  console.log(`Serving static files from: ${distPath}`);
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import path3 from "path";
var app = null;
async function createApp() {
  if (app) {
    return app;
  }
  app = express2();
  app.use(cors({
    origin: function(origin, callback) {
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        "https://ponto2.ecoexpedicao.site",
        "http://localhost:5173",
        "http://localhost:4173"
      ];
      const allowedPatterns = [
        /^https:\/\/.*\.vercel\.app$/,
        /^https:\/\/acompanhamento-.*\.vercel\.app$/
      ];
      const isAllowed = allowedOrigins.includes(origin) || allowedPatterns.some((pattern) => pattern.test(origin));
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
    preflightContinue: false,
    optionsSuccessStatus: 204
  }));
  app.use(express2.json({ limit: "10mb" }));
  app.use(express2.urlencoded({ extended: true, limit: "10mb" }));
  app.use((req, res, next) => {
    res.setTimeout(25e3, () => {
      res.status(408).json({ message: "Request timeout" });
    });
    next();
  });
  app.use("/api", (req, res, next) => {
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
      "Last-Modified": (/* @__PURE__ */ new Date()).toUTCString(),
      "ETag": Math.random().toString()
    });
    next();
  });
  app.use((req, res, next) => {
    const start = Date.now();
    const path4 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path4.startsWith("/api")) {
        let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "\u2026";
        }
        log(logLine);
      }
    });
    next();
  });
  await registerRoutes(app);
  app.use((error, req, res, next) => {
    console.error("Global error:", error);
    res.status(500).json({
      message: "Internal server error",
      ...process.env.NODE_ENV === "development" && { error: error.message }
    });
  });
  if (process.env.NODE_ENV === "production") {
    const distPath = path3.join(__dirname, "../client/dist");
    app.use(express2.static(distPath));
    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api")) {
        res.sendFile(path3.join(distPath, "index.html"));
      } else {
        res.status(404).json({ message: "API endpoint not found" });
      }
    });
  }
  return app;
}
async function handler(req, res) {
  const expressApp = await createApp();
  return expressApp(req, res);
}
if (process.env.NODE_ENV !== "production") {
  createApp().then((app2) => {
    const PORT = process.env.PORT || 3001;
    const server = app2.listen(PORT, () => {
      log(`Server running on port ${PORT}`);
    });
    if (process.env.NODE_ENV === "development") {
      setupVite(app2, server);
    } else {
      serveStatic(app2);
    }
  }).catch(console.error);
}
export {
  handler as default
};
