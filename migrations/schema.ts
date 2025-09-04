import { pgTable, varchar, text, real, boolean, unique, timestamp, json, foreignKey, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const questions = pgTable("questions", {
	id: varchar().primaryKey().notNull(),
	text: text().notNull(),
	order: real().notNull(),
	goodWhenYes: boolean("good_when_yes").notNull(),
	requireReasonWhen: text("require_reason_when").notNull(),
});

export const users = pgTable("users", {
	id: varchar().primaryKey().notNull(),
	username: text().notNull(),
	phone: text().notNull(),
	password: text().notNull(),
	displayName: text("display_name").notNull(),
	role: text().notNull(),
	permission: text().default('Colaborador').notNull(),
	active: boolean().default(true).notNull(),
	cargo: text(),
	cpf: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_username_unique").on(table.username),
]);

export const teams = pgTable("teams", {
	id: varchar().primaryKey().notNull(),
	driverUsername: text("driver_username").notNull(),
	assistants: json().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const routes = pgTable("routes", {
	id: varchar().primaryKey().notNull(),
	city: text().notNull(),
	cities: json().notNull(),
	teamId: varchar("team_id"),
	startDate: text("start_date").notNull(),
	endDate: text("end_date"),
	status: text().default('formation').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	vehicleId: varchar("vehicle_id"),
}, (table) => [
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "routes_team_id_teams_id_fk"
		}),
	foreignKey({
			columns: [table.vehicleId],
			foreignColumns: [vehicles.id],
			name: "routes_vehicle_id_vehicles_id_fk"
		}),
]);

export const vehicles = pgTable("vehicles", {
	id: varchar().primaryKey().notNull(),
	plate: text().notNull(),
	model: text(),
	year: integer(),
	active: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const evaluations = pgTable("evaluations", {
	id: varchar().primaryKey().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	dateRef: text("date_ref").notNull(),
	evaluator: text().notNull(),
	evaluated: text().notNull(),
	answers: json().notNull(),
	score: real().notNull(),
	status: text().default('queued').notNull(),
	routeId: varchar("route_id"),
}, (table) => [
	foreignKey({
			columns: [table.routeId],
			foreignColumns: [routes.id],
			name: "evaluations_route_id_routes_id_fk"
		}),
]);
