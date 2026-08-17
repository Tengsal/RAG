import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, conversationsTable, messagesTable, bookmarksTable } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const convoId = parseInt(params.id);

  if (!db) {
    return NextResponse.json({
      id: convoId,
      title: "Academic Query",
      categoryId: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 1,
          conversationId: convoId,
          role: "assistant",
          content: "Hello! How can I assist you with university admissions, fees, or academic regulations today?",
          confidence: "high",
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }

  try {
    const [convo] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, convoId));

    if (!convo) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, convoId))
      .orderBy(messagesTable.createdAt);

    return NextResponse.json({ ...convo, messages });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const convoId = parseInt(params.id);
  const body = await request.json();

  if (!db) {
    return NextResponse.json({
      id: convoId,
      title: body.title || "Updated Title",
      updatedAt: new Date().toISOString(),
      messageCount: 1,
    });
  }

  try {
    const updateData: Partial<typeof conversationsTable.$inferInsert> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId ?? null;

    const [convo] = await db
      .update(conversationsTable)
      .set(updateData)
      .where(eq(conversationsTable.id, convoId))
      .returning();

    if (!convo) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const [{ messageCount }] = await db
      .select({ messageCount: sql<number>`cast(count(*) as integer)` })
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, convo.id));

    return NextResponse.json({ ...convo, messageCount });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const convoId = parseInt(params.id);

  if (!db) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    await db.delete(messagesTable).where(eq(messagesTable.conversationId, convoId));
    await db.delete(bookmarksTable).where(eq(bookmarksTable.conversationId, convoId));
    const [deleted] = await db
      .delete(conversationsTable)
      .where(eq(conversationsTable.id, convoId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return new NextResponse(null, { status: 204 });
  }
}
