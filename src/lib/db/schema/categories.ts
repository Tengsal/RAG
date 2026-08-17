import { pgTable, text, serial } from "drizzle-orm/pg-core";

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("BookOpen"),
  description: text("description").notNull().default(""),
});

export type Category = typeof categoriesTable.$inferSelect;
