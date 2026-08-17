import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  role: text("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  confidence: text("confidence"), // "high" | "medium" | "low" | null
  sources: jsonb("sources").$type<Array<{
    id: number;
    documentId: number;
    documentName: string;
    pageNumber: number;
    lineStart?: number | null;
    lineEnd?: number | null;
    snippet: string;
    retrievalScore: number;
  }>>(),
  followUpQuestions: jsonb("follow_up_questions").$type<string[]>(),
  clarificationOptions: jsonb("clarification_options").$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Message = typeof messagesTable.$inferSelect;
