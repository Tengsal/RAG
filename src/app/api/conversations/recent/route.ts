import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Conversation, Message } from "@/lib/models";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await connectToDatabase();
    const conversations = await Conversation.find().sort({ updatedAt: -1 }).limit(5).lean();
    const counts = await Message.aggregate([{ $match: { conversationId: { $in: conversations.map((item) => item.id) } } }, { $group: { _id: "$conversationId", count: { $sum: 1 } } }]);
    const byId = new Map(counts.map((item) => [item._id as number, item.count as number]));
    return NextResponse.json(conversations.map((item) => ({ id: item.id, title: item.title, categoryId: item.categoryId, createdAt: item.createdAt, updatedAt: item.updatedAt, messageCount: byId.get(item.id) ?? 0 })));
  } catch (error) { console.error("Failed to get recent conversations:", error); return NextResponse.json({ error: "Database unavailable" }, { status: 503 }); }
}
