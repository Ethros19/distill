ALTER TABLE "signals" ADD COLUMN "status" varchar(20) DEFAULT 'new' NOT NULL;--> statement-breakpoint
CREATE INDEX "signals_status_idx" ON "signals" USING btree ("status");