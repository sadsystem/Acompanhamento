var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";

// server/storageNeon.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  evaluations: () => evaluations,
  insertEvaluationSchema: () => insertEvaluationSchema,
  insertQuestionSchema: () => insertQuestionSchema,
  insertRouteSchema: () => insertRouteSchema,
  insertTeamSchema: () => insertTeamSchema,
  insertUserSchema: () => insertUserSchema,
  insertVehicleSchema: () => insertVehicleSchema,
  questions: () => questions,
  routes: () => routes,
  teams: () => teams,
  users: () => users,
  vehicles: () => vehicles
});
import { pgTable, text, varchar, boolean, timestamp, real, json, integer } from "drizzle-orm/pg-core";
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
  routeId: varchar("route_id").references(() => routes.id),
  // Link direto com a rota
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
var vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().$defaultFn(() => randomUUID()),
  plate: text("plate").notNull(),
  model: text("model"),
  year: integer("year"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var routes = pgTable("routes", {
  id: varchar("id").primaryKey().$defaultFn(() => randomUUID()),
  city: text("city").notNull(),
  cities: json("cities").notNull(),
  // string[] - lista completa das cidades
  teamId: varchar("team_id").references(() => teams.id),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id),
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
  id: true,
  createdAt: true
  // Server will generate this automatically
});
var insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertVehicleSchema = createInsertSchema(vehicles).omit({
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
var StorageNeon = class _StorageNeon {
  db;
  static instance;
  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for Neon database connection");
    }
    const databaseUrl = process.env.DATABASE_URL;
    console.log(`\u{1F517} Connecting to Neon: ${databaseUrl.split("@")[0]}@***`);
    const neonClient = neon(databaseUrl);
    this.db = drizzle(neonClient, { schema: schema_exports });
    console.log("\u2705 Neon database connection initialized");
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
  async getUserByCpf(cpf) {
    const result = await this.db.select().from(users).where(eq(users.cpf, cpf));
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
    console.log("=== STORAGE UPDATE USER DEBUG ===");
    console.log("User ID:", id);
    console.log("Updates received:", JSON.stringify(updates, null, 2));
    try {
      if (!id || id.trim() === "") {
        throw new Error("User ID is required");
      }
      const excludedFields = ["id", "createdAt"];
      const cleanUpdates = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== void 0 && value !== null && !excludedFields.includes(key)) {
          if (key === "createdAt" && typeof value === "string") {
            cleanUpdates[key] = new Date(value);
          } else {
            cleanUpdates[key] = value;
          }
        }
      });
      console.log("Clean updates:", JSON.stringify(cleanUpdates, null, 2));
      if (cleanUpdates.password) {
        console.log("Hashing password...");
        cleanUpdates.password = await bcrypt.hash(cleanUpdates.password, 10);
      }
      console.log("Executing update query...");
      const result = await this.db.update(users).set(cleanUpdates).where(eq(users.id, id)).returning();
      console.log("Query result length:", result.length);
      if (result.length === 0) {
        throw new Error(`User with id ${id} not found`);
      }
      console.log("User updated successfully:", result[0].id);
      return result[0];
    } catch (error) {
      console.error("=== STORAGE UPDATE USER ERROR ===");
      console.error("Error details:", error);
      console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace");
      throw error;
    }
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
      if (filters.routeId) {
        conditions.push(eq(evaluations.routeId, filters.routeId));
      }
      if (conditions.length > 0) {
        const result2 = await this.db.select().from(evaluations).where(and(...conditions)).orderBy(desc(evaluations.createdAt));
        return result2;
      }
    }
    const result = await query.orderBy(desc(evaluations.createdAt));
    return result;
  }
  async createEvaluation(evaluation) {
    console.log("=== CREATING EVALUATION DEBUG ===");
    console.log("Input evaluation data:", JSON.stringify(evaluation, null, 2));
    const evaluationData = {
      ...evaluation,
      id: randomUUID2(),
      createdAt: /* @__PURE__ */ new Date()
    };
    console.log("Final evaluation data to insert:", JSON.stringify(evaluationData, null, 2));
    const result = await this.db.insert(evaluations).values(evaluationData).returning();
    console.log("Evaluation created successfully:", JSON.stringify(result[0], null, 2));
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
    console.log("=== STORAGE CREATE TEAM DEBUG ===");
    console.log("Input team data:", JSON.stringify(team, null, 2));
    console.log("Team ID provided:", team.id);
    const teamData = {
      ...team,
      id: team.id || randomUUID2(),
      // Use provided ID or generate new one
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    console.log("Final team data to insert:", JSON.stringify(teamData, null, 2));
    const result = await this.db.insert(teams).values(teamData).returning();
    console.log("Team created with final ID:", result[0].id);
    return result[0];
  }
  async updateTeam(id, updates) {
    console.log("=== UPDATING TEAM DEBUG ===");
    console.log("Team ID:", id);
    console.log("Raw updates:", JSON.stringify(updates, null, 2));
    const cleanUpdates = { ...updates };
    delete cleanUpdates.createdAt;
    delete cleanUpdates.updatedAt;
    console.log("Clean updates:", JSON.stringify(cleanUpdates, null, 2));
    const result = await this.db.update(teams).set({ ...cleanUpdates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(teams.id, id)).returning();
    console.log("Team updated successfully:", JSON.stringify(result[0], null, 2));
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
    console.log("=== STORAGE CREATE ROUTE DEBUG ===");
    console.log("Input route data:", JSON.stringify(route, null, 2));
    const routeData = {
      ...route,
      cities: Array.isArray(route.cities) ? route.cities : JSON.parse(route.cities),
      id: route.id || randomUUID2(),
      // Use provided ID or generate new one
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    console.log("Final route data to insert:", JSON.stringify(routeData, null, 2));
    try {
      const result = await this.db.insert(routes).values(routeData).returning();
      console.log("Route inserted successfully:", JSON.stringify(result[0], null, 2));
      return result[0];
    } catch (dbError) {
      console.error("Database error in createRoute:", dbError);
      throw dbError;
    }
  }
  async updateRoute(id, updates) {
    console.log("=== UPDATING ROUTE DEBUG ===");
    console.log("Route ID:", id);
    console.log("Raw updates:", JSON.stringify(updates, null, 2));
    const cleanUpdates = { ...updates };
    delete cleanUpdates.createdAt;
    delete cleanUpdates.updatedAt;
    console.log("Clean updates:", JSON.stringify(cleanUpdates, null, 2));
    const result = await this.db.update(routes).set({ ...cleanUpdates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(routes.id, id)).returning();
    console.log("Route updated successfully:", JSON.stringify(result[0], null, 2));
    return result[0];
  }
  async deleteRoute(id) {
    await this.db.delete(routes).where(eq(routes.id, id));
  }
  // Vehicles management
  async getVehicles() {
    const result = await this.db.select().from(vehicles).orderBy(desc(vehicles.createdAt));
    return result;
  }
  async createVehicle(vehicle) {
    const vehicleData = {
      ...vehicle,
      id: randomUUID2(),
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    const result = await this.db.insert(vehicles).values(vehicleData).returning();
    return result[0];
  }
  async updateVehicle(id, updates) {
    const result = await this.db.update(vehicles).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(vehicles.id, id)).returning();
    return result[0];
  }
  async deleteVehicle(id) {
    await this.db.delete(vehicles).where(eq(vehicles.id, id));
  }
  // Health check with database connectivity test
  async healthCheck() {
    const startTime = Date.now();
    try {
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
import bcrypt2 from "bcryptjs";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";
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
  cargo: z.string().nullable().optional(),
  cpf: z.string().nullable().optional(),
  permission: z.string().default("Colaborador"),
  // Ensure permission is always set
  active: z.boolean().default(true)
  // Ensure active is always boolean
});
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      cb(null, true);
    } else {
      cb(new Error("Only XLSX files are allowed!"), false);
    }
  }
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
      const healthResult = await storageNeon.healthCheck();
      res.json({
        status: healthResult.status,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        database: healthResult.database,
        responseTime: `${healthResult.responseTime}ms`,
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
  app2.get("/api/debug/admin", async (req, res) => {
    try {
      const users2 = await storageNeon.getUsers();
      const admin = await storageNeon.getUserByUsername("87999461725");
      res.json({
        totalUsers: users2.length,
        adminExists: !!admin,
        adminData: admin ? {
          id: admin.id,
          username: admin.username,
          displayName: admin.displayName,
          role: admin.role,
          active: admin.active,
          hasPassword: !!admin.password,
          passwordLength: admin.password?.length || 0
        } : null,
        allUsernames: users2.map((u) => u.username)
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
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
        if (!user) {
          console.log("DEBUG: User not found");
          return res.status(401).json({
            success: false,
            error: "Login ou senha incorretos"
          });
        }
        const passwordMatch = await bcrypt2.compare(password, user.password);
        console.log("DEBUG: Password match:", passwordMatch);
        if (!passwordMatch) {
          console.log("DEBUG: Password authentication failed");
          return res.status(401).json({
            success: false,
            error: "Login ou senha incorretos"
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
  app2.post("/api/users/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (data.length <= 1) {
        return res.status(400).json({ error: "Arquivo vazio ou sem dados v\xE1lidos" });
      }
      const headers = data[0];
      const expectedHeaders = ["NOME", "CPF", "TELEFONE", "SENHA", "CARGO"];
      const headerMismatch = expectedHeaders.some(
        (expected, index) => !headers[index] || headers[index].toString().toUpperCase() !== expected
      );
      if (headerMismatch) {
        return res.status(400).json({
          error: `Formato de cabe\xE7alho incorreto. Esperado: ${expectedHeaders.join(", ")}. Encontrado: ${headers.join(", ")}`
        });
      }
      const rows = data.slice(1);
      const results = {
        success: 0,
        errors: [],
        imported: [],
        duplicates: []
      };
      console.log(`[IMPORT] Starting bulk user import. Total rows to process: ${rows.filter((row) => row && row.some((cell) => cell && cell.toString().trim())).length}`);
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2;
        if (!row || row.every((cell) => !cell || cell.toString().trim() === "")) {
          continue;
        }
        if (row.length < 5) {
          results.errors.push(`Linha ${rowNumber}: Dados insuficientes (necess\xE1rio 5 colunas: NOME, CPF, TELEFONE, SENHA, CARGO)`);
          continue;
        }
        const [displayName, cpf, phone, password, cargo] = row;
        if (!displayName || !cpf || !phone || !password || !cargo) {
          results.errors.push(`Linha ${rowNumber}: Campos obrigat\xF3rios em branco - Nome: ${displayName || "vazio"}, CPF: ${cpf || "vazio"}, Telefone: ${phone || "vazio"}, Senha: ${password || "vazio"}, Cargo: ${cargo || "vazio"}`);
          continue;
        }
        try {
          const cleanName = String(displayName).trim();
          const cleanCpf = String(cpf).replace(/\D/g, "");
          const cleanPhone = String(phone).replace(/\D/g, "");
          const cleanPassword = String(password).trim();
          const cleanCargo = String(cargo).trim();
          if (cleanPhone.length < 10 || cleanPhone.length > 11) {
            results.errors.push(`Linha ${rowNumber}: Telefone inv\xE1lido (${phone}). Deve ter 10 ou 11 d\xEDgitos.`);
            continue;
          }
          let formattedPhone = cleanPhone;
          if (cleanPhone.length === 10) {
            formattedPhone = cleanPhone.slice(0, 2) + "9" + cleanPhone.slice(2);
          }
          if (cleanCpf.length !== 11) {
            results.errors.push(`Linha ${rowNumber}: CPF inv\xE1lido (${cpf}). Deve ter 11 d\xEDgitos.`);
            continue;
          }
          const validCargos = ["Motorista", "Ajudante", "ADM"];
          if (!validCargos.includes(cleanCargo)) {
            results.errors.push(`Linha ${rowNumber}: Cargo inv\xE1lido (${cleanCargo}). Valores aceitos: ${validCargos.join(", ")}`);
            continue;
          }
          const userData = {
            displayName: cleanName,
            cpf: cleanCpf || null,
            // Handle as null instead of undefined
            phone: formattedPhone,
            password: cleanPassword,
            cargo: cleanCargo || null,
            // Handle as null instead of undefined  
            permission: cleanCargo === "ADM" ? "ADM" : "Colaborador",
            // Always set permission
            role: cleanCargo === "ADM" ? "admin" : "colaborador",
            active: true,
            username: formattedPhone
            // Add username field that was missing
          };
          const validation = createUserSchema.safeParse(userData);
          if (!validation.success) {
            results.errors.push(`Linha ${rowNumber}: Dados inv\xE1lidos - ${validation.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`);
            continue;
          }
          const existingUserByPhone = await storageNeon.getUserByUsername(formattedPhone);
          const existingUserByCpf = await storageNeon.getUserByCpf(cleanCpf);
          if (existingUserByPhone) {
            results.duplicates.push(`Linha ${rowNumber}: \u274C DUPLICATA - Usu\xE1rio com telefone ${phone} j\xE1 existe (Nome atual: ${existingUserByPhone.displayName})`);
            console.log(`[IMPORT] Duplicate phone detected: ${formattedPhone} for user ${cleanName}`);
            continue;
          }
          if (existingUserByCpf) {
            results.duplicates.push(`Linha ${rowNumber}: \u274C DUPLICATA - Usu\xE1rio com CPF ${cpf} j\xE1 existe (Nome atual: ${existingUserByCpf.displayName})`);
            console.log(`[IMPORT] Duplicate CPF detected: ${cleanCpf} for user ${cleanName}`);
            continue;
          }
          const cleanValidationData = {
            ...validation.data,
            cargo: validation.data.cargo || null,
            cpf: validation.data.cpf || null
          };
          await storageNeon.createUser(cleanValidationData);
          results.success++;
          results.imported.push(`\u2705 ${cleanName} (${phone})`);
          console.log(`[IMPORT] Successfully created user: ${cleanName} with phone ${formattedPhone}`);
        } catch (error) {
          console.error(`Error importing user from row ${rowNumber}:`, error);
          results.errors.push(`Linha ${rowNumber}: Erro interno - ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        }
      }
      const totalProcessed = rows.filter((row) => row && row.some((cell) => cell && cell.toString().trim())).length;
      const response = {
        imported: results.success,
        total_processed: totalProcessed,
        success_list: results.imported,
        errors: results.errors,
        duplicates: results.duplicates,
        duplicates_count: results.duplicates.length
      };
      console.log(`[IMPORT] Import completed. Success: ${results.success}, Duplicates: ${results.duplicates.length}, Errors: ${results.errors.length}`);
      if (results.errors.length > 0 || results.duplicates.length > 0) {
        response.message = `Importa\xE7\xE3o processada: ${results.success} usu\xE1rio(s) criado(s) com sucesso. ${results.duplicates.length} duplicata(s) ignorada(s) (n\xE3o foram adicionadas). ${results.errors.length} erro(s) encontrado(s).`;
      } else {
        response.message = `\u2705 Importa\xE7\xE3o bem-sucedida! ${results.success} usu\xE1rio(s) criado(s) sem duplicatas ou erros.`;
      }
      if (results.duplicates.length > 0) {
        response.duplicate_warning = `\u26A0\uFE0F IMPORTANTE: ${results.duplicates.length} usu\xE1rio(s) n\xE3o foram adicionados pois j\xE1 existem no sistema (mesmo CPF ou telefone). Cada usu\xE1rio \xE9 \xFAnico no sistema.`;
      }
      res.json(response);
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({
        error: "Erro ao processar arquivo de importa\xE7\xE3o",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  app2.put("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      console.log("=== UPDATE USER DEBUG ===");
      console.log("User ID:", id);
      console.log("Updates received:", JSON.stringify(updates, null, 2));
      if (!id || id.trim() === "") {
        return res.status(400).json({ error: "ID do usu\xE1rio \xE9 obrigat\xF3rio" });
      }
      const cleanUpdates = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== void 0 && value !== null && value !== "") {
          cleanUpdates[key] = value;
        }
      });
      console.log("Clean updates to be sent:", JSON.stringify(cleanUpdates, null, 2));
      const user = await storageNeon.updateUser(id, cleanUpdates);
      console.log("User updated successfully:", user.id);
      res.json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        active: user.active,
        cargo: user.cargo,
        permission: user.permission,
        cpf: user.cpf,
        phone: user.phone
      });
    } catch (error) {
      console.error("=== UPDATE USER ERROR ===");
      console.error("Error details:", error);
      console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace");
      res.status(400).json({
        error: "Erro ao atualizar usu\xE1rio",
        details: error instanceof Error ? error.message : String(error)
      });
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
      const { dateFrom, dateTo, evaluator, evaluated, status, routeId } = req.query;
      const filters = {};
      if (dateFrom) filters.dateFrom = String(dateFrom);
      if (dateTo) filters.dateTo = String(dateTo);
      if (evaluator) filters.evaluator = String(evaluator);
      if (evaluated) filters.evaluated = String(evaluated);
      if (status) filters.status = String(status);
      if (routeId) filters.routeId = String(routeId);
      const evaluations2 = await storageNeon.getEvaluations(filters);
      res.json(evaluations2);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar avalia\xE7\xF5es" });
    }
  });
  app2.post("/api/evaluations", async (req, res) => {
    try {
      console.log("POST /api/evaluations - Received data:", JSON.stringify(req.body, null, 2));
      const { createdAt, id, ...cleanData } = req.body;
      console.log("POST /api/evaluations - Clean data:", JSON.stringify(cleanData, null, 2));
      const requiredFields = ["dateRef", "evaluator", "evaluated", "answers", "score"];
      for (const field of requiredFields) {
        if (!(field in cleanData)) {
          return res.status(400).json({ error: `Campo obrigat\xF3rio ausente: ${field}` });
        }
      }
      const evaluationData = {
        ...cleanData,
        status: cleanData.status || "queued",
        routeId: cleanData.routeId || null
        // Incluir routeId (opcional para compatibilidade)
      };
      console.log("POST /api/evaluations - Parsed data:", JSON.stringify(evaluationData, null, 2));
      const evaluation = await storageNeon.createEvaluation(evaluationData);
      res.status(201).json(evaluation);
    } catch (error) {
      console.error("POST /api/evaluations - Error:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
      }
      if (error && typeof error === "object" && "issues" in error) {
        console.error("Validation issues:", error.issues);
      }
      res.status(400).json({ error: "Erro ao criar avalia\xE7\xE3o" });
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
  app2.get("/api/teams", async (req, res) => {
    try {
      const teams2 = await storageNeon.getTeams();
      res.json(teams2);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Erro ao buscar equipes" });
    }
  });
  app2.post("/api/teams", async (req, res) => {
    try {
      const team = await storageNeon.createTeam(req.body);
      res.status(201).json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(400).json({ error: "Erro ao criar equipe" });
    }
  });
  app2.put("/api/teams/:id", async (req, res) => {
    try {
      const team = await storageNeon.updateTeam(req.params.id, req.body);
      res.json(team);
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(400).json({ error: "Erro ao atualizar equipe" });
    }
  });
  app2.delete("/api/teams/:id", async (req, res) => {
    try {
      await storageNeon.deleteTeam(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(400).json({ error: "Erro ao excluir equipe" });
    }
  });
  app2.get("/api/routes", async (req, res) => {
    try {
      const routes2 = await storageNeon.getRoutes();
      res.json(routes2);
    } catch (error) {
      console.error("Error fetching routes:", error);
      res.status(500).json({ error: "Erro ao buscar rotas" });
    }
  });
  app2.post("/api/routes", async (req, res) => {
    try {
      console.log("=== CREATING ROUTE DEBUG ===");
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      if (!req.body.city || !req.body.cities || !req.body.startDate || !req.body.status) {
        return res.status(400).json({
          error: "Campos obrigat\xF3rios ausentes",
          required: ["city", "cities", "startDate", "status"]
        });
      }
      if (!Array.isArray(req.body.cities)) {
        return res.status(400).json({
          error: "Campo 'cities' deve ser um array",
          received: typeof req.body.cities
        });
      }
      const route = await storageNeon.createRoute(req.body);
      console.log("Route created successfully:", JSON.stringify(route, null, 2));
      res.status(201).json(route);
    } catch (error) {
      console.error("Error creating route - DETAILED:", error);
      console.error("Error message:", error instanceof Error ? error.message : "Unknown error");
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
      res.status(400).json({ error: "Erro ao criar rota", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app2.put("/api/routes/:id", async (req, res) => {
    try {
      const route = await storageNeon.updateRoute(req.params.id, req.body);
      res.json(route);
    } catch (error) {
      console.error("Error updating route:", error);
      res.status(400).json({ error: "Erro ao atualizar rota" });
    }
  });
  app2.delete("/api/routes/:id", async (req, res) => {
    try {
      await storageNeon.deleteRoute(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting route:", error);
      res.status(400).json({ error: "Erro ao excluir rota" });
    }
  });
  app2.get("/api/vehicles", async (req, res) => {
    try {
      const vehicles2 = await storageNeon.getVehicles();
      res.json(vehicles2);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      res.status(500).json({ error: "Erro ao buscar ve\xEDculos" });
    }
  });
  app2.post("/api/vehicles", async (req, res) => {
    try {
      const vehicle = await storageNeon.createVehicle(req.body);
      res.status(201).json(vehicle);
    } catch (error) {
      console.error("Error creating vehicle:", error);
      res.status(400).json({ error: "Erro ao criar ve\xEDculo" });
    }
  });
  app2.put("/api/vehicles/:id", async (req, res) => {
    try {
      const vehicle = await storageNeon.updateVehicle(req.params.id, req.body);
      res.json(vehicle);
    } catch (error) {
      console.error("Error updating vehicle:", error);
      res.status(400).json({ error: "Erro ao atualizar ve\xEDculo" });
    }
  });
  app2.delete("/api/vehicles/:id", async (req, res) => {
    try {
      await storageNeon.deleteVehicle(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      res.status(400).json({ error: "Erro ao excluir ve\xEDculo" });
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
}

// server/index.ts
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
var app = null;
async function createApp() {
  if (app) {
    return app;
  }
  app = express();
  app.use(cors({
    origin: function(origin, callback) {
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        "http://localhost:3002",
        "https://localhost:3002",
        "http://localhost:3001",
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
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
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
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path2.startsWith("/api")) {
        let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
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
    const distPath = path.join(__dirname, "../client/dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api")) {
        res.sendFile(path.join(distPath, "index.html"));
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
  createApp().then(async (app2) => {
    const PORT = process.env.PORT || 3001;
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
      root: path.join(__dirname, "../client"),
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "../client/src"),
          "@shared": path.resolve(__dirname, "../shared")
        }
      }
    });
    app2.use(vite.middlewares);
    const server = app2.listen(PORT, () => {
      log(`Server running on port ${PORT}`);
    });
  }).catch(console.error);
}
export {
  handler as default
};
