import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  pageCount: integer("page_count").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Document = typeof documentsTable.$inferSelect;
