import { pgTable, text, varchar, boolean, timestamp, real, json, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { randomUUID } from "crypto";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().$defaultFn(() => randomUUID()),
  username: text("username").notNull().unique(), // Now phone number for login
  phone: text("phone").notNull(), // Phone in format: (87) 9 XXXX-XXXX
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull(), // "admin" | "colaborador" | "gestor"
  permission: text("permission").notNull().default("Colaborador"), // "ADM" | "Colaborador" | "Gestor"
  active: boolean("active").notNull().default(true),
  cargo: text("cargo"), // "Motorista" | "Ajudante" | "ADM"
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
  id: varchar("id").primaryKey().$defaultFn(() => randomUUID()),
  createdAt: timestamp("created_at").notNull(),
  dateRef: text("date_ref").notNull(), // YYYY-MM-DD
  evaluator: text("evaluator").notNull(),
  evaluated: text("evaluated").notNull(),
  answers: json("answers").notNull(), // Answer[]
  score: real("score").notNull(),
  status: text("status").notNull().default("queued"), // "queued" | "synced"
});

// Teams table
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().$defaultFn(() => randomUUID()),
  driverUsername: text("driver_username").notNull(),
  assistants: json("assistants").notNull(), // string[] - usernames of assistants (max 2)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vehicles table
export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().$defaultFn(() => randomUUID()),
  plate: text("plate").notNull(),
  model: text("model"),
  year: integer("year"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Routes table
export const routes = pgTable("routes", {
  id: varchar("id").primaryKey().$defaultFn(() => randomUUID()),
  city: text("city").notNull(),
  cities: json("cities").notNull(), // string[] - lista completa das cidades
  teamId: varchar("team_id").references(() => teams.id),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id),
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date"), // YYYY-MM-DD when route is finished
  status: text("status").notNull().default("formation"), // "formation" | "active" | "completed"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions);

export const insertEvaluationSchema = createInsertSchema(evaluations).omit({
  id: true,
  createdAt: true, // Server will generate this automatically
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRouteSchema = createInsertSchema(routes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type Evaluation = typeof evaluations.$inferSelect;
export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

export type Route = typeof routes.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;

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
