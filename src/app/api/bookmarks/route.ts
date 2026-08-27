import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Bookmark, Conversation, nextId } from "@/lib/models";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await connectToDatabase();
    const bookmarks = await Bookmark.find().sort({ createdAt: -1 }).lean();
    const conversations = await Conversation.find({ id: { $in: bookmarks.map((item) => item.conversationId) } }).lean();
    const titles = new Map(conversations.map((item) => [item.id, item.title]));
    return NextResponse.json(bookmarks.map((item) => ({ id: item.id, conversationId: item.conversationId, conversationTitle: titles.get(item.conversationId) ?? "Deleted Conversation", createdAt: item.createdAt })));
  } catch (error) { console.error("Failed to get bookmarks:", error); return NextResponse.json({ error: "Database unavailable" }, { status: 503 }); }
}
export async function POST(request: NextRequest) {
  const { conversationId } = await request.json();
  if (!Number.isInteger(Number(conversationId))) return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
  try {
    await connectToDatabase();
    const conversation = await Conversation.findOne({ id: Number(conversationId) }).lean();
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    const bookmark = await Bookmark.create({ id: await nextId("bookmarks"), conversationId: conversation.id });
    return NextResponse.json({ id: bookmark.id, conversationId: bookmark.conversationId, conversationTitle: conversation.title, createdAt: bookmark.createdAt }, { status: 201 });
  } catch (error) { console.error("Failed to create bookmark:", error); return NextResponse.json({ error: "Database unavailable" }, { status: 503 }); }
}
