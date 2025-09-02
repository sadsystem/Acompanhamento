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

  // Diagnostics token (optional). If set, requests must include ?token=VALUE
  const diagnosticsToken = process.env.DIAGNOSTICS_TOKEN;
  const requireToken = (req: any, res: any, next: any) => {
    if (!diagnosticsToken) return next();
    if (req.query.token === diagnosticsToken) return next();
    return res.status(401).json({ error: "Unauthorized diagnostics" });
  };
  
  // Quick diagnostics endpoint aggregating health info and simple DB probes
  app.get('/api/diagnostics', requireToken, async (req, res) => {
    const started = Date.now();
    const result: any = {
      timestamp: new Date().toISOString(),
      uptimeSec: process.uptime(),
      nodeEnv: process.env.NODE_ENV,
      version: process.env.APP_VERSION || 'unknown',
      checks: [] as any[],
    };

    // Helper to run timed check
    const timed = async (name: string, fn: () => Promise<any>) => {
      const t0 = Date.now();
      try {
        const data = await fn();
        result.checks.push({ name, ok: true, ms: Date.now() - t0, data });
      } catch (err: any) {
        result.checks.push({ name, ok: false, ms: Date.now() - t0, error: err?.message || String(err) });
      }
    };

    await timed('users.count', async () => ({ count: (await storage.getUsers()).length }));
    await timed('questions.count', async () => ({ count: (await storage.getQuestions()).length }));
    await timed('evaluations.count', async () => ({ count: (await storage.getEvaluations()).length }));

    // Quick login simulation (admin user) WITHOUT password exposure
    await timed('admin.user.exists', async () => {
      const adminCandidates = (await storage.getUsers()).filter(u => u.role === 'admin');
      return { admins: adminCandidates.map(a => ({ id: a.id, username: a.username })) };
    });

    result.totalMs = Date.now() - started;
    res.json(result);
  });

  // Lightweight DB ping (returns only OK + latency). Useful for synthetic monitoring.
  app.get('/api/diagnostics/ping-db', requireToken, async (_req, res) => {
    const t0 = Date.now();
    try {
      // Small operation: fetch 1 user if exists
      await storage.getUsers();
      return res.json({ ok: true, ms: Date.now() - t0 });
    } catch (e: any) {
      return res.status(500).json({ ok: false, ms: Date.now() - t0, error: e?.message || String(e) });
    }
  });

  // Simple HTML diagnostic page (no framework) to visualize probes quickly
  app.get('/diag', async (req, res) => {
    const tokenParam = diagnosticsToken ? `?token=${diagnosticsToken}` : '';
    const html = `<!DOCTYPE html><html lang="pt-br"><head><meta charset="utf-8"/><title>Diagnóstico</title><style>body{font-family:system-ui,Arial,sans-serif;padding:20px;background:#f5f7fa}pre{background:#222;color:#0f0;padding:12px;overflow:auto;max-height:60vh}button{margin-right:8px;margin-bottom:8px;padding:8px 14px;cursor:pointer}#status.ok{color:green}#status.fail{color:#b00}</style></head><body>
    <h1>Diagnóstico do Sistema</h1>
    <p>Env: <strong>${process.env.NODE_ENV}</strong></p>
    <div>
      <button onclick="run('health','/api/health')">/api/health</button>
      <button onclick="run('diag','/api/diagnostics${tokenParam}')">/api/diagnostics</button>
      <button onclick="run('ping','/api/diagnostics/ping-db${tokenParam}')">Ping DB</button>
    </div>
    <h3>Resultado (<span id="status">aguardando</span>)</h3>
    <pre id="output">Clique em um botão para iniciar...</pre>
    <script>
      async function run(label, url){
        const out = document.getElementById('output');
        const status = document.getElementById('status');
        out.textContent = 'Carregando '+label+'...';
        status.className=''; status.textContent='executando';
        const t0=performance.now();
        try { const res= await fetch(url+'?_t='+Date.now(), {cache:'no-store'}); const txt = await res.text(); const ms=(performance.now()-t0).toFixed(1); status.textContent=res.ok?'ok':'falhou'; status.className=res.ok?'ok':'fail'; out.textContent = 'HTTP '+res.status+' em '+ms+'ms\n\n'+txt; }
        catch(e){ status.textContent='erro'; status.className='fail'; out.textContent=String(e); }
      }
    </script>
    </body></html>`;
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(html);
  });
  
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV
    });
  });
  // Alias sem o prefixo /api para casos de rewrites inconsistentes em ambientes serverless
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      note: 'alias route'
    });
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

  const httpServer = createServer(app);
  return httpServer;
}
