import { relations } from "drizzle-orm/relations";
import { teams, routes, vehicles, evaluations } from "./schema";

export const routesRelations = relations(routes, ({one, many}) => ({
	team: one(teams, {
		fields: [routes.teamId],
		references: [teams.id]
	}),
	vehicle: one(vehicles, {
		fields: [routes.vehicleId],
		references: [vehicles.id]
	}),
	evaluations: many(evaluations),
}));

export const teamsRelations = relations(teams, ({many}) => ({
	routes: many(routes),
}));

export const vehiclesRelations = relations(vehicles, ({many}) => ({
	routes: many(routes),
}));

export const evaluationsRelations = relations(evaluations, ({one}) => ({
	route: one(routes, {
		fields: [evaluations.routeId],
		references: [routes.id]
	}),
}));