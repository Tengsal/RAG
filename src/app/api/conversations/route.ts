import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Conversation, Message, nextId } from "@/lib/models";

export const dynamic = "force-dynamic";

const asConversation = (conversation: { id: number; title: string; categoryId: number | null; createdAt: Date; updatedAt: Date }, messageCount = 0) => ({
  id: conversation.id, title: conversation.title, categoryId: conversation.categoryId,
  createdAt: conversation.createdAt, updatedAt: conversation.updatedAt, messageCount,
});

export async function GET() {
  try {
    await connectToDatabase();
    const conversations = await Conversation.find().sort({ updatedAt: -1 }).lean();
    const counts = await Message.aggregate([{ $match: { conversationId: { $in: conversations.map((item) => item.id) } } }, { $group: { _id: "$conversationId", count: { $sum: 1 } } }]);
    const countById = new Map(counts.map((item) => [item._id as number, item.count as number]));
    return NextResponse.json(conversations.map((item) => asConversation(item, countById.get(item.id) ?? 0)));
  } catch (error) {
    console.error("Failed to list conversations:", error);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, categoryId } = await request.json();
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    await connectToDatabase();
    const conversation = await Conversation.create({ id: await nextId("conversations"), title, categoryId: categoryId ?? null });
    return NextResponse.json({ ...asConversation(conversation, 0), messages: [] }, { status: 201 });
  } catch (error) {
    console.error("Failed to create conversation:", error);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
