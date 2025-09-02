import type { Express } from "express";
import { createServer, type Server } from "http";
import { SupabaseStorage } from "./supabaseStorage";

const storage = new SupabaseStorage();
import { z } from "zod";
import { insertUserSchema, insertEvaluationSchema } from "@shared/schema";

// Authentication endpoints
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

const createUserSchema = insertUserSchema.extend({
  cargo: z.string().optional(),
  cpf: z.string().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Supabase storage and seed data
  await storage.seedInitialData();
  
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV
    });
  });
  // Rotas alternativas (sem prefixo) para depuração de roteamento em produção
  app.get("/health", (req, res) => {
    res.json({ status: "ok", alt: true, path: "/health" });
  });

  // Questions public endpoint (read-only) - facilita comparar frontend vs backend
  app.get("/api/questions", async (_req, res) => {
    try {
      const qs = await storage.getQuestions();
      res.json(qs);
    } catch (e) {
      res.status(500).json({ error: "Erro ao buscar perguntas" });
    }
  });
  app.get("/questions", async (_req, res) => {
    try { const qs = await storage.getQuestions(); res.json(qs); } catch { res.status(500).json({ error: "Erro" }); }
  });

  // Diagnostics endpoint (NÃO deixar em produção aberta permanentemente; proteger depois)
  app.get("/api/debug/diagnostics", async (req, res) => {
    const started = Date.now();
    const checks: Record<string, any> = {};

    // Helper
    const run = async (name: string, fn: () => Promise<any>) => {
      const t0 = Date.now();
      try {
        const data = await fn();
        checks[name] = { ok: true, ms: Date.now() - t0, ...data };
      } catch (err: any) {
        checks[name] = { ok: false, ms: Date.now() - t0, error: err.message };
      }
    };

    await run("envVars", async () => {
      const required = ["DATABASE_URL"];
      const present: Record<string, boolean> = {};
      required.forEach(k => present[k] = !!process.env[k]);
      const missing = Object.entries(present).filter(([, v]) => !v).map(([k]) => k);
      return { present, missing };
    });

    await run("dbConnection", async () => {
      // usa getUsers simples para testar conexão
      const users = await storage.getUsers();
      return { usersSample: users.slice(0, 1).map(u => ({ id: u.id, username: u.username })), totalUsers: users.length };
    });

    await run("questions", async () => {
      const qs = await storage.getQuestions();
      return { count: qs.length, ids: qs.map(q => q.id) };
    });

    await run("evaluationsCount", async () => {
      try {
        const evals = await storage.getEvaluations();
        return { count: evals.length };
      } catch (e: any) {
        throw new Error("Falha ao consultar avaliações: " + e.message);
      }
    });

    await run("seedAdminUser", async () => {
      const admin = await storage.getUserByUsername("87999461725");
      return { exists: !!admin };
    });

    // Resultado consolidado
    const summaryOk = Object.values(checks).every((c: any) => c.ok);
    res.status(summaryOk ? 200 : 207).json({
      status: summaryOk ? "ok" : "issues",
      timestamp: new Date().toISOString(),
      totalMs: Date.now() - started,
      nodeEnv: process.env.NODE_ENV,
      checks,
    });
  });
  app.get("/debug/diagnostics", async (req, res) => {
    res.status(400).json({ error: "Use /api/debug/diagnostics" });
  });

  // Debug / diagnostic endpoint (NÃO EXPOR PUBLICAMENTE EM PRODUÇÃO SEM RESTRIÇÃO)
  // Retorna informações de ambiente, status de banco e rotas registradas.
  app.get("/api/debug/status", async (req, res) => {
    const startedAt = Date.now();
    const info: any = {
      status: "ok",
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT || null,
      uptimeSec: Math.round(process.uptime()),
    };

    // Teste básico de banco
    try {
      const users = await storage.getUsers();
      let evalCount = 0;
      try {
        const evaluations = await storage.getEvaluations();
        evalCount = evaluations.length;
      } catch (e) {
        // ignorar erro de evaluations separado
        info.dbEvaluationsError = (e as Error).message;
      }
      info.database = {
        connected: true,
        users: users.length,
        evaluations: evalCount,
      };
    } catch (err) {
      info.database = {
        connected: false,
        error: (err as Error).message,
      };
      info.status = "degraded";
    }

    // Lista superficial de rotas (somente métodos e paths) - evita expor implementações
    try {
      // @ts-ignore acesso interno do express
      const stack = (app as any)._router?.stack || [];
      const routes = stack
        .filter((l: any) => l.route && l.route.path && l.route.methods)
        .map((l: any) => ({
          path: l.route.path,
          methods: Object.keys(l.route.methods),
        }))
        .filter((r: any) => r.path.startsWith("/api"));
      info.routes = routes;
    } catch (e) {
      info.routesError = (e as Error).message;
    }

    info.latencyMs = Date.now() - startedAt;

    // NUNCA incluir dados sensíveis (senha, connection string etc.)
    res.status(info.status === "ok" ? 200 : 503).json(info);
  });
  
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    console.log("DEBUG: Login endpoint hit with", req.body); // Test log visibility
    try {
      const { username, password, remember } = loginSchema.parse(req.body);
      console.log("DEBUG: Parsed request data:", { username, remember });
      
      let user;
      try {
        user = await storage.getUserByUsername(username);
        console.log("DEBUG: User search result:", user ? "User found" : "User not found");
        
        if (!user || user.password !== password) {
          console.log("DEBUG: Authentication failed");
          return res.status(401).json({ 
            success: false, 
            error: "Credenciais inválidas" 
          });
        }
      } catch (dbError) {
        console.error("DEBUG: Database error:", dbError);
        return res.status(500).json({ 
          success: false, 
          error: "Erro interno no servidor" 
        });
      }
      
      // In a real app, generate JWT token here
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
            cargo: user.cargo,
          }
        }
      });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: "Dados inválidos" 
      });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    // In a real app, invalidate JWT token
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req, res) => {
    // In a real app, verify JWT token from Authorization header
    const token = req.headers.authorization?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ error: "Token não fornecido" });
    }
    
    // Mock token validation - extract user ID
    const userId = token.replace("token-", "");
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(401).json({ error: "Token inválido" });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      cargo: user.cargo,
    });
  });

  // Users routes
  app.get("/api/users/admin", async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  });

  app.get("/api/users/team", async (req, res) => {
    try {
      const users = await storage.getUsers();
      const teamMembers = users
        .filter(u => u.role === "colaborador" && u.active)
        .map(u => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          cargo: u.cargo,
        }));
      
      res.json(teamMembers);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar equipe" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = createUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      
      res.status(201).json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        cargo: user.cargo,
      });
    } catch (error) {
      res.status(400).json({ error: "Dados de usuário inválidos" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const user = await storage.updateUser(id, updates);
      res.json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        active: user.active,
        cargo: user.cargo,
      });
    } catch (error) {
      res.status(400).json({ error: "Erro ao atualizar usuário" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Erro ao excluir usuário" });
    }
  });

  // Evaluations routes
  app.get("/api/evaluations", async (req, res) => {
    try {
      const { dateFrom, dateTo, evaluator, evaluated, status } = req.query;
      
      const filters: any = {};
      if (dateFrom) filters.dateFrom = String(dateFrom);
      if (dateTo) filters.dateTo = String(dateTo);
      if (evaluator) filters.evaluator = String(evaluator);
      if (evaluated) filters.evaluated = String(evaluated);
      if (status) filters.status = String(status);
      
      const evaluations = await storage.getEvaluations(filters);
      res.json(evaluations);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar avaliações" });
    }
  });

  app.post("/api/evaluations", async (req, res) => {
    try {
      console.log("POST /api/evaluations - Received data:", JSON.stringify(req.body, null, 2));
      
      const evaluationData = insertEvaluationSchema.parse(req.body);
      console.log("POST /api/evaluations - Parsed data:", JSON.stringify(evaluationData, null, 2));
      
      const evaluation = await storage.createEvaluation(evaluationData);
      
      res.status(201).json(evaluation);
    } catch (error) {
      console.error("POST /api/evaluations - Validation error:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
      res.status(400).json({ error: "Dados de avaliação inválidos" });
    }
  });

  app.get("/api/evaluations/stats", async (req, res) => {
    try {
      const evaluations = await storage.getEvaluations();
      
      // Calculate basic stats
      const totalEvaluations = evaluations.length;
      const uniqueEvaluated = new Set(evaluations.map(e => e.evaluated)).size;
      const averageScore = evaluations.length > 0 
        ? evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length 
        : 0;
      
      res.json({
        totalEvaluations,
        uniqueEvaluated,
        averageScore: Number(averageScore.toFixed(2)),
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao calcular estatísticas" });
    }
  });

  // Reports routes
  app.get("/api/reports/dashboard", async (req, res) => {
    try {
      const evaluations = await storage.getEvaluations();
      const users = await storage.getUsers();
      
      // This would contain dashboard data aggregation logic
      res.json({
        evaluations: evaluations.length,
        users: users.length,
        // Additional dashboard metrics...
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar relatório" });
    }
  });

  app.get("/api/reports/export", async (req, res) => {
    try {
      const { format } = req.query;
      const evaluations = await storage.getEvaluations();
      
      if (format === "csv") {
        // Generate CSV content
        const csvHeaders = ["id", "createdAt", "evaluator", "evaluated", "score"];
        const csvRows = evaluations.map(e => 
          [e.id, e.createdAt, e.evaluator, e.evaluated, e.score].join(",")
        );
        const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
        
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=evaluations.csv");
        res.send(csvContent);
      } else {
        res.json(evaluations);
      }
    } catch (error) {
      res.status(500).json({ error: "Erro ao exportar dados" });
    }
  });

  app.get("/api/reports/alerts", async (req, res) => {
    try {
      const evaluations = await storage.getEvaluations();
      
      // Calculate alerts based on threshold
      const threshold = 0.3;
      const alerts = evaluations
        .filter(e => e.score < threshold)
        .map(e => ({
          id: e.id,
          evaluated: e.evaluated,
          score: e.score,
          dateRef: e.dateRef,
        }));
      
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar alertas" });
    }
  });

  // 404 handler específico para API (deve ficar após TODAS as rotas acima)
  app.use('/api', (req, res, next) => {
    if (res.headersSent) return next();
    try {
      // @ts-ignore
      const stack = (app as any)._router?.stack || [];
      const routes = stack
        .filter((l: any) => l.route && l.route.path && l.route.methods)
        .map((l: any) => ({ path: l.route.path, methods: Object.keys(l.route.methods) }))
        .filter((r: any) => r.path.startsWith('/api'));
      res.status(404).json({
        error: 'api_not_found',
        message: 'Nenhuma rota /api correspondente',
        requested: req.path,
        registeredCount: routes.length,
        sample: routes.slice(0, 10),
      });
    } catch (e: any) {
      res.status(404).json({ error: 'api_not_found', requested: req.path });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
