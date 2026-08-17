import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, bookmarksTable, conversationsTable } from "@/lib/db";

export const dynamic = 'force-dynamic';

let memoryBookmarks: Array<{ id: number; conversationId: number; conversationTitle: string; createdAt: string }> = [
  {
    id: 1,
    conversationId: 101,
    conversationTitle: "Admission Requirements for B.Tech Computer Science",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 2,
    conversationId: 102,
    conversationTitle: "Fee Payment Installment Policy & Scholarships",
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
];

export async function GET() {
  if (!db) {
    return NextResponse.json(memoryBookmarks);
  }

  try {
    const bookmarks = await db
      .select({
        id: bookmarksTable.id,
        conversationId: bookmarksTable.conversationId,
        conversationTitle: conversationsTable.title,
        createdAt: bookmarksTable.createdAt,
      })
      .from(bookmarksTable)
      .leftJoin(conversationsTable, eq(conversationsTable.id, bookmarksTable.conversationId))
      .orderBy(bookmarksTable.createdAt);

    const formatted = bookmarks.map((b: { id: number; conversationId: number; conversationTitle: string | null; createdAt: Date }) => ({
      ...b,
      conversationTitle: b.conversationTitle ?? "Deleted Conversation",
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    return NextResponse.json(memoryBookmarks);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    if (!db) {
      const newBookmark = {
        id: Date.now(),
        conversationId: Number(conversationId),
        conversationTitle: `Conversation #${conversationId}`,
        createdAt: new Date().toISOString(),
      };
      memoryBookmarks.unshift(newBookmark);
      return NextResponse.json(newBookmark, { status: 201 });
    }

    const [convo] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, conversationId));

    if (!convo) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const [bookmark] = await db
      .insert(bookmarksTable)
      .values({ conversationId })
      .returning();

    return NextResponse.json({
      id: bookmark.id,
      conversationId: bookmark.conversationId,
      conversationTitle: convo.title,
      createdAt: bookmark.createdAt,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
