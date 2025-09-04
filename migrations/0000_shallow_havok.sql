-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "questions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"order" real NOT NULL,
	"good_when_yes" boolean NOT NULL,
	"require_reason_when" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"phone" text NOT NULL,
	"password" text NOT NULL,
	"display_name" text NOT NULL,
	"role" text NOT NULL,
	"permission" text DEFAULT 'Colaborador' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"cargo" text,
	"cpf" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" varchar PRIMARY KEY NOT NULL,
	"driver_username" text NOT NULL,
	"assistants" json NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" varchar PRIMARY KEY NOT NULL,
	"city" text NOT NULL,
	"cities" json NOT NULL,
	"team_id" varchar,
	"start_date" text NOT NULL,
	"end_date" text,
	"status" text DEFAULT 'formation' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"vehicle_id" varchar
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" varchar PRIMARY KEY NOT NULL,
	"plate" text NOT NULL,
	"model" text,
	"year" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" varchar PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"date_ref" text NOT NULL,
	"evaluator" text NOT NULL,
	"evaluated" text NOT NULL,
	"answers" json NOT NULL,
	"score" real NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"route_id" varchar
);
--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;
*/