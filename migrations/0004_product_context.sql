CREATE TABLE "settings" (
  "key" varchar(50) PRIMARY KEY,
  "value" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
INSERT INTO "settings" ("key", "value") VALUES ('product_context', '');
