import { pgTable, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const bookmarksTable = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Bookmark = typeof bookmarksTable.$inferSelect;
