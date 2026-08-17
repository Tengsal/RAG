import { NextResponse } from "next/server";
import { eq, desc, sql } from "drizzle-orm";
import { db, conversationsTable, messagesTable } from "@/lib/db";

export const dynamic = 'force-dynamic';

const mockRecent = [
  {
    id: 1,
    title: "Computer Science Eligibility & Fees",
    categoryId: 1,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    messageCount: 4,
  },
];

export async function GET() {
  if (!db) {
    return NextResponse.json(mockRecent);
  }

  try {
    const conversations = await db
      .select({
        id: conversationsTable.id,
        title: conversationsTable.title,
        categoryId: conversationsTable.categoryId,
        createdAt: conversationsTable.createdAt,
        updatedAt: conversationsTable.updatedAt,
        messageCount: sql<number>`cast(count(${messagesTable.id}) as integer)`,
      })
      .from(conversationsTable)
      .leftJoin(messagesTable, eq(messagesTable.conversationId, conversationsTable.id))
      .groupBy(conversationsTable.id)
      .orderBy(desc(conversationsTable.updatedAt))
      .limit(5);

    return NextResponse.json(conversations.length > 0 ? conversations : mockRecent);
  } catch (error) {
    return NextResponse.json(mockRecent);
  }
}
