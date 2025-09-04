import type { Express } from "express";
import { storageNeon } from "./storageNeon";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { insertUserSchema, insertEvaluationSchema, type Role } from "@shared/schema";
import multer from "multer";
import * as XLSX from "xlsx";

let seedInitialized = false;

// Ensure seed data exists (only once per cold start)
const ensureSeedData = async () => {
  if (!seedInitialized) {
    try {
      await storageNeon.seedInitialData();
      seedInitialized = true;
    } catch (error) {
      console.error('Seed initialization error:', error);
      // Don't throw - let the app continue
    }
  }
};

// Authentication endpoints
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

const createUserSchema = insertUserSchema.extend({
  cargo: z.string().nullable().optional(),
  cpf: z.string().nullable().optional(), 
  permission: z.string().default("Colaborador"), // Ensure permission is always set
  active: z.boolean().default(true), // Ensure active is always boolean
});

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Only XLSX files are allowed!'), false);
    }
  }
});

export async function registerRoutes(app: Express): Promise<void> {
  // Middleware to ensure seed data (optimized for serverless)
  app.use('/api', async (req, res, next) => {
    try {
      await ensureSeedData();
      next();
    } catch (error) {
      console.error('Seed middleware error:', error);
      next(); // Continue anyway
    }
  });
  
  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      // Use optimized health check
      const healthResult = await storageNeon.healthCheck();
      
      res.json({
        status: healthResult.status,
        timestamp: new Date().toISOString(),
        database: healthResult.database,
        responseTime: `${healthResult.responseTime}ms`,
        environment: process.env.NODE_ENV || "development"
      });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(503).json({
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Rotas alternativas (sem prefixo) para depuração de roteamento em produção
  app.get("/health", (req, res) => {
    res.json({ status: "ok", alt: true, path: "/health" });
  });

    // Questions public endpoint (read-only) - facilita comparar frontend vs backend
  app.get("/api/questions", async (_req, res) => {
    try {
      const qs = await storageNeon.getQuestions();
      res.json(qs);
    } catch (error) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.get("/questions", async (_req, res) => {
    try { const qs = await storageNeon.getQuestions(); res.json(qs); } catch { res.status(500).json({ error: "Erro" }); }
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
      const users = await storageNeon.getUsers();
      return { usersSample: users.slice(0, 1).map(u => ({ id: u.id, username: u.username })), totalUsers: users.length };
    });

    await run("questions", async () => {
      const qs = await storageNeon.getQuestions();
      return { count: qs.length, ids: qs.map(q => q.id) };
    });

    await run("evaluationsCount", async () => {
      try {
        const evals = await storageNeon.getEvaluations();
        return { count: evals.length };
      } catch (e: any) {
        throw new Error("Falha ao consultar avaliações: " + e.message);
      }
    });

    await run("seedAdminUser", async () => {
      const admin = await storageNeon.getUserByUsername("87999461725");
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
      const users = await storageNeon.getUsers();
      let evalCount = 0;
      try {
        const evaluations = await storageNeon.getEvaluations();
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
  
  // TEMPORARY DEBUG - Remove after fixing login
  app.get("/api/debug/admin", async (req, res) => {
    try {
      const users = await storageNeon.getUsers();
      const admin = await storageNeon.getUserByUsername("87999461725");
      
      res.json({
        totalUsers: users.length,
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
        allUsernames: users.map(u => u.username)
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });
  
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    console.log("DEBUG: Login endpoint hit with", req.body); // Test log visibility
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

        // Check password using bcrypt
        const passwordMatch = await bcrypt.compare(password, user.password);
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
    const user = await storageNeon.getUserById(userId);
    
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
      const users = await storageNeon.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  });

  app.get("/api/users/team", async (req, res) => {
    try {
      const users = await storageNeon.getUsers();
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
      const validation = createUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Dados inválidos", 
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
        cargo: user.cargo,
      });
    } catch (error) {
      res.status(400).json({ error: "Dados de usuário inválidos" });
    }
  });

  // Import users from XLSX
  app.post("/api/users/import", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      // Parse XLSX file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (data.length <= 1) {
        return res.status(400).json({ error: "Arquivo vazio ou sem dados válidos" });
      }

      // Verify header format
      const headers = data[0] as string[];
      const expectedHeaders = ['NOME', 'CPF', 'TELEFONE', 'SENHA', 'CARGO'];
      const headerMismatch = expectedHeaders.some((expected, index) => 
        !headers[index] || headers[index].toString().toUpperCase() !== expected
      );

      if (headerMismatch) {
        return res.status(400).json({ 
          error: `Formato de cabeçalho incorreto. Esperado: ${expectedHeaders.join(', ')}. Encontrado: ${headers.join(', ')}` 
        });
      }

      // Skip header row, process data rows
      const rows = data.slice(1) as any[][];
      const results = { 
        success: 0, 
        errors: [] as string[],
        imported: [] as string[],
        duplicates: [] as string[]
      };

      console.log(`[IMPORT] Starting bulk user import. Total rows to process: ${rows.filter(row => row && row.some(cell => cell && cell.toString().trim())).length}`);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // +2 because we skipped header and arrays are 0-indexed

        // Skip empty rows
        if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
          continue;
        }

        if (row.length < 5) {
          results.errors.push(`Linha ${rowNumber}: Dados insuficientes (necessário 5 colunas: NOME, CPF, TELEFONE, SENHA, CARGO)`);
          continue;
        }

        const [displayName, cpf, phone, password, cargo] = row;

        // Validate required fields
        if (!displayName || !cpf || !phone || !password || !cargo) {
          results.errors.push(`Linha ${rowNumber}: Campos obrigatórios em branco - Nome: ${displayName || 'vazio'}, CPF: ${cpf || 'vazio'}, Telefone: ${phone || 'vazio'}, Senha: ${password || 'vazio'}, Cargo: ${cargo || 'vazio'}`);
          continue;
        }

        try {
          // Clean and format data
          const cleanName = String(displayName).trim();
          const cleanCpf = String(cpf).replace(/\D/g, ''); // Remove formatting from CPF
          const cleanPhone = String(phone).replace(/\D/g, ''); // Remove formatting from phone
          const cleanPassword = String(password).trim();
          const cleanCargo = String(cargo).trim();

          // Validate phone format (Brazilian format)
          if (cleanPhone.length < 10 || cleanPhone.length > 11) {
            results.errors.push(`Linha ${rowNumber}: Telefone inválido (${phone}). Deve ter 10 ou 11 dígitos.`);
            continue;
          }

          // Ensure mobile format (11 digits)
          let formattedPhone = cleanPhone;
          if (cleanPhone.length === 10) {
            // Add digit 9 for mobile if missing (legacy format)
            formattedPhone = cleanPhone.slice(0, 2) + '9' + cleanPhone.slice(2);
          }

          // Validate CPF format
          if (cleanCpf.length !== 11) {
            results.errors.push(`Linha ${rowNumber}: CPF inválido (${cpf}). Deve ter 11 dígitos.`);
            continue;
          }

          // Validate cargo
          const validCargos = ['Motorista', 'Ajudante', 'ADM'];
          if (!validCargos.includes(cleanCargo)) {
            results.errors.push(`Linha ${rowNumber}: Cargo inválido (${cleanCargo}). Valores aceitos: ${validCargos.join(', ')}`);
            continue;
          }

          const userData = {
            displayName: cleanName,
            cpf: cleanCpf || null, // Handle as null instead of undefined
            phone: formattedPhone,
            password: cleanPassword,
            cargo: cleanCargo || null, // Handle as null instead of undefined  
            permission: cleanCargo === 'ADM' ? 'ADM' : 'Colaborador', // Always set permission
            role: (cleanCargo === 'ADM' ? 'admin' : 'colaborador') as Role,
            active: true,
            username: formattedPhone // Add username field that was missing
          };

          // Validate user data with schema
          const validation = createUserSchema.safeParse(userData);
          if (!validation.success) {
            results.errors.push(`Linha ${rowNumber}: Dados inválidos - ${validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
            continue;
          }

          // Check if user already exists (by phone or CPF) - CRITICAL: Prevent duplicates
          const existingUserByPhone = await storageNeon.getUserByUsername(formattedPhone);
          const existingUserByCpf = await storageNeon.getUserByCpf(cleanCpf);
          
          if (existingUserByPhone) {
            results.duplicates.push(`Linha ${rowNumber}: ❌ DUPLICATA - Usuário com telefone ${phone} já existe (Nome atual: ${existingUserByPhone.displayName})`);
            console.log(`[IMPORT] Duplicate phone detected: ${formattedPhone} for user ${cleanName}`);
            continue;
          }
          
          if (existingUserByCpf) {
            results.duplicates.push(`Linha ${rowNumber}: ❌ DUPLICATA - Usuário com CPF ${cpf} já existe (Nome atual: ${existingUserByCpf.displayName})`);
            console.log(`[IMPORT] Duplicate CPF detected: ${cleanCpf} for user ${cleanName}`);
            continue;
          }

          // SAFE TO CREATE - No duplicates found
          // Transform data to match expected types
          const cleanValidationData = {
            ...validation.data,
            cargo: validation.data.cargo || null,
            cpf: validation.data.cpf || null
          };
          await storageNeon.createUser(cleanValidationData);
          results.success++;
          results.imported.push(`✅ ${cleanName} (${phone})`);
          console.log(`[IMPORT] Successfully created user: ${cleanName} with phone ${formattedPhone}`);

        } catch (error) {
          console.error(`Error importing user from row ${rowNumber}:`, error);
          results.errors.push(`Linha ${rowNumber}: Erro interno - ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

      // Generate comprehensive response
      const totalProcessed = rows.filter(row => row && row.some(cell => cell && cell.toString().trim())).length;
      const response: any = {
        imported: results.success,
        total_processed: totalProcessed,
        success_list: results.imported,
        errors: results.errors,
        duplicates: results.duplicates,
        duplicates_count: results.duplicates.length
      };

      console.log(`[IMPORT] Import completed. Success: ${results.success}, Duplicates: ${results.duplicates.length}, Errors: ${results.errors.length}`);

      if (results.errors.length > 0 || results.duplicates.length > 0) {
        response.message = `Importação processada: ${results.success} usuário(s) criado(s) com sucesso. ${results.duplicates.length} duplicata(s) ignorada(s) (não foram adicionadas). ${results.errors.length} erro(s) encontrado(s).`;
      } else {
        response.message = `✅ Importação bem-sucedida! ${results.success} usuário(s) criado(s) sem duplicatas ou erros.`;
      }

      // Additional safety message about duplicates
      if (results.duplicates.length > 0) {
        response.duplicate_warning = `⚠️ IMPORTANTE: ${results.duplicates.length} usuário(s) não foram adicionados pois já existem no sistema (mesmo CPF ou telefone). Cada usuário é único no sistema.`;
      }

      res.json(response);

    } catch (error) {
      console.error('Import error:', error);
      res.status(500).json({ 
        error: "Erro ao processar arquivo de importação",
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      console.log('=== UPDATE USER DEBUG ===');
      console.log('User ID:', id);
      console.log('Updates received:', JSON.stringify(updates, null, 2));
      
      // Validate required fields
      if (!id || id.trim() === '') {
        return res.status(400).json({ error: "ID do usuário é obrigatório" });
      }

      // Remove undefined/null values and validate
      const cleanUpdates: any = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          cleanUpdates[key] = value;
        }
      });

      console.log('Clean updates to be sent:', JSON.stringify(cleanUpdates, null, 2));

      const user = await storageNeon.updateUser(id, cleanUpdates);
      console.log('User updated successfully:', user.id);
      
      res.json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        active: user.active,
        cargo: user.cargo,
        permission: user.permission,
        cpf: user.cpf,
        phone: user.phone,
      });
    } catch (error) {
      console.error('=== UPDATE USER ERROR ===');
      console.error('Error details:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(400).json({ 
        error: "Erro ao atualizar usuário", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storageNeon.deleteUser(id);
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
      
      const evaluations = await storageNeon.getEvaluations(filters);
      res.json(evaluations);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar avaliações" });
    }
  });

  app.post("/api/evaluations", async (req, res) => {
    try {
      console.log("POST /api/evaluations - Received data:", JSON.stringify(req.body, null, 2));
      
      // Remove any createdAt from request body - server will generate it
      const { createdAt, id, ...cleanData } = req.body;
      console.log("POST /api/evaluations - Clean data:", JSON.stringify(cleanData, null, 2));
      
      // Manual validation instead of using insertEvaluationSchema
      const requiredFields = ['dateRef', 'evaluator', 'evaluated', 'answers', 'score'];
      for (const field of requiredFields) {
        if (!(field in cleanData)) {
          return res.status(400).json({ error: `Campo obrigatório ausente: ${field}` });
        }
      }
      
      const evaluationData = {
        ...cleanData,
        status: cleanData.status || "queued"
      };
      console.log("POST /api/evaluations - Parsed data:", JSON.stringify(evaluationData, null, 2));
      
      const evaluation = await storageNeon.createEvaluation(evaluationData);
      
      res.status(201).json(evaluation);
    } catch (error) {
      console.error("POST /api/evaluations - Error:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
      }
      if (error && typeof error === 'object' && 'issues' in error) {
        console.error("Validation issues:", (error as any).issues);
      }
      res.status(400).json({ error: "Erro ao criar avaliação" });
    }
  });

  app.get("/api/evaluations/stats", async (req, res) => {
    try {
      const evaluations = await storageNeon.getEvaluations();
      
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
      const evaluations = await storageNeon.getEvaluations();
      const users = await storageNeon.getUsers();
      
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
      const evaluations = await storageNeon.getEvaluations();
      
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
      const evaluations = await storageNeon.getEvaluations();
      
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

  // Teams routes
  app.get("/api/teams", async (req, res) => {
    try {
      const teams = await storageNeon.getTeams();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Erro ao buscar equipes" });
    }
  });

  app.post("/api/teams", async (req, res) => {
    try {
      const team = await storageNeon.createTeam(req.body);
      res.status(201).json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(400).json({ error: "Erro ao criar equipe" });
    }
  });

  app.put("/api/teams/:id", async (req, res) => {
    try {
      const team = await storageNeon.updateTeam(req.params.id, req.body);
      res.json(team);
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(400).json({ error: "Erro ao atualizar equipe" });
    }
  });

  app.delete("/api/teams/:id", async (req, res) => {
    try {
      await storageNeon.deleteTeam(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(400).json({ error: "Erro ao excluir equipe" });
    }
  });

  // Routes routes
  app.get("/api/routes", async (req, res) => {
    try {
      const routes = await storageNeon.getRoutes();
      res.json(routes);
    } catch (error) {
      console.error("Error fetching routes:", error);
      res.status(500).json({ error: "Erro ao buscar rotas" });
    }
  });

  app.post("/api/routes", async (req, res) => {
    try {
      console.log("=== CREATING ROUTE DEBUG ===");
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      
      // Validate required fields
      if (!req.body.city || !req.body.cities || !req.body.startDate || !req.body.status) {
        return res.status(400).json({ 
          error: "Campos obrigatórios ausentes", 
          required: ["city", "cities", "startDate", "status"] 
        });
      }

      // Ensure cities is an array
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

  app.put("/api/routes/:id", async (req, res) => {
    try {
      const route = await storageNeon.updateRoute(req.params.id, req.body);
      res.json(route);
    } catch (error) {
      console.error("Error updating route:", error);
      res.status(400).json({ error: "Erro ao atualizar rota" });
    }
  });

  app.delete("/api/routes/:id", async (req, res) => {
    try {
      await storageNeon.deleteRoute(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting route:", error);
      res.status(400).json({ error: "Erro ao excluir rota" });
    }
  });

  // Vehicles routes
  app.get("/api/vehicles", async (req, res) => {
    try {
      const vehicles = await storageNeon.getVehicles();
      res.json(vehicles);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      res.status(500).json({ error: "Erro ao buscar veículos" });
    }
  });

  app.post("/api/vehicles", async (req, res) => {
    try {
      const vehicle = await storageNeon.createVehicle(req.body);
      res.status(201).json(vehicle);
    } catch (error) {
      console.error("Error creating vehicle:", error);
      res.status(400).json({ error: "Erro ao criar veículo" });
    }
  });

  app.put("/api/vehicles/:id", async (req, res) => {
    try {
      const vehicle = await storageNeon.updateVehicle(req.params.id, req.body);
      res.json(vehicle);
    } catch (error) {
      console.error("Error updating vehicle:", error);
      res.status(400).json({ error: "Erro ao atualizar veículo" });
    }
  });

  app.delete("/api/vehicles/:id", async (req, res) => {
    try {
      await storageNeon.deleteVehicle(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      res.status(400).json({ error: "Erro ao excluir veículo" });
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

  // Routes registered successfully
}
