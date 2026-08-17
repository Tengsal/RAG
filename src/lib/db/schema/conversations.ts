import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  categoryId: integer("category_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Conversation = typeof conversationsTable.$inferSelect;
