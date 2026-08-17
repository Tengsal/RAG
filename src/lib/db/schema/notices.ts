import { pgTable, text, serial, timestamp, integer, boolean, date } from "drizzle-orm/pg-core";

export const noticesTable = pgTable("notices", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  priority: text("priority").notNull().default("normal"), // "urgent" | "high" | "normal"
  isPinned: boolean("is_pinned").notNull().default(false),
  categoryId: integer("category_id"),
  deadline: date("deadline", { mode: "string" }),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Notice = typeof noticesTable.$inferSelect;
