CREATE TABLE "inputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" varchar(50) NOT NULL,
	"contributor" text NOT NULL,
	"raw_content" text NOT NULL,
	"summary" text,
	"type" varchar(50),
	"themes" jsonb,
	"urgency" smallint,
	"confidence" real,
	"content_hash" varchar(64),
	"status" varchar(20) DEFAULT 'unprocessed' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" varchar(64) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"synthesis_id" uuid NOT NULL,
	"statement" text NOT NULL,
	"reasoning" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"suggested_action" text,
	"themes" jsonb,
	"strength" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "syntheses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"input_count" integer NOT NULL,
	"signal_count" integer NOT NULL,
	"digest_markdown" text,
	"trigger" varchar(20) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_synthesis_id_syntheses_id_fk" FOREIGN KEY ("synthesis_id") REFERENCES "public"."syntheses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inputs_content_hash_idx" ON "inputs" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "inputs_status_idx" ON "inputs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inputs_created_at_idx" ON "inputs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "signals_synthesis_id_idx" ON "signals" USING btree ("synthesis_id");