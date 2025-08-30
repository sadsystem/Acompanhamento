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
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    console.log("DEBUG: Login endpoint hit"); // Test log visibility
    try {
      const { username, password, remember } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ 
          success: false, 
          error: "Credenciais inválidas" 
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
