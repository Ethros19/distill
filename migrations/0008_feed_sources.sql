CREATE TABLE "feed_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar(100) NOT NULL,
	"url" text NOT NULL,
	"category" varchar(50),
	"polling_interval" integer DEFAULT 60 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_polled_at" timestamp with time zone,
	"last_error" text
);
--> statement-breakpoint
ALTER TABLE "inputs" ADD COLUMN "feed_source_id" uuid;--> statement-breakpoint
ALTER TABLE "inputs" ADD COLUMN "feed_url" text;--> statement-breakpoint
ALTER TABLE "inputs" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "feed_sources_url_idx" ON "feed_sources" USING btree ("url");--> statement-breakpoint
CREATE INDEX "feed_sources_enabled_idx" ON "feed_sources" USING btree ("enabled");--> statement-breakpoint
ALTER TABLE "inputs" ADD CONSTRAINT "inputs_feed_source_id_feed_sources_id_fk" FOREIGN KEY ("feed_source_id") REFERENCES "public"."feed_sources"("id") ON DELETE no action ON UPDATE no action;
