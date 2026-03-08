ALTER TABLE "knowledge_items" ADD COLUMN "updated_by_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "knowledge_items" ADD COLUMN "updated_by_user_id" text;--> statement-breakpoint
ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_updated_by_agent_id_agents_id_fk" FOREIGN KEY ("updated_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;