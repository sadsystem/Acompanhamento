import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, real, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull(), // "admin" | "colaborador"
  active: boolean("active").notNull().default(true),
  cargo: text("cargo"), // "Motorista" | "Ajudante" | "Gestor"
  cpf: text("cpf"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Questions table
export const questions = pgTable("questions", {
  id: varchar("id").primaryKey(),
  text: text("text").notNull(),
  order: real("order").notNull(),
  goodWhenYes: boolean("good_when_yes").notNull(),
  requireReasonWhen: text("require_reason_when").notNull(), // "yes" | "no" | "never"
});

// Evaluations table
export const evaluations = pgTable("evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").notNull(),
  dateRef: text("date_ref").notNull(), // YYYY-MM-DD
  evaluator: text("evaluator").notNull(),
  evaluated: text("evaluated").notNull(),
  answers: json("answers").notNull(), // Answer[]
  score: real("score").notNull(),
  status: text("status").notNull().default("queued"), // "queued" | "synced"
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions);

export const insertEvaluationSchema = createInsertSchema(evaluations).omit({
  id: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type Evaluation = typeof evaluations.$inferSelect;
export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;

// Additional types for frontend
export type Role = "admin" | "colaborador";

export type Answer = {
  questionId: string;
  value: boolean;
  reason?: string;
};

export type Session = {
  username: string;
  token?: string;
};

export type EvaluationFilters = {
  dateFrom?: string;
  dateTo?: string;
  evaluator?: string;
  evaluated?: string;
  status?: string;
};
