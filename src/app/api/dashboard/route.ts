import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Category, Conversation, KnowledgeDocument, Message, Notice } from "@/lib/models";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await connectToDatabase();
    const [totalConversations, totalMessages, totalDocuments, conversations, categories, documentsByCategory, pinnedNotices] = await Promise.all([
      Conversation.countDocuments(), Message.countDocuments(), KnowledgeDocument.countDocuments(), Conversation.find().sort({ updatedAt: -1 }).limit(5).lean(), Category.find().sort({ id: 1 }).lean(), KnowledgeDocument.aggregate([{ $group: { _id: "$categoryId", count: { $sum: 1 } } }]), Notice.find({ isPinned: true }).sort({ publishedAt: -1 }).limit(3).lean(),
    ]);
    const conversationIds = conversations.map((x) => x.id);
    const messageCounts = await Message.aggregate([{ $match: { conversationId: { $in: conversationIds } } }, { $group: { _id: "$conversationId", count: { $sum: 1 } } }]);
    const messagesByConversation = new Map(messageCounts.map((x) => [x._id as number, x.count as number]));
    const documentsById = new Map(documentsByCategory.map((x) => [x._id as number, x.count as number]));
    const names = new Map(categories.map((x) => [x.id, x.name]));
    return NextResponse.json({
      totalConversations, totalMessages, totalDocuments,
      recentConversations: conversations.map((x) => ({ id: x.id, title: x.title, categoryId: x.categoryId, createdAt: x.createdAt, updatedAt: x.updatedAt, messageCount: messagesByConversation.get(x.id) ?? 0 })),
      categoryBreakdown: categories.map((x) => ({ id: x.id, name: x.name, icon: x.icon, description: x.description, documentCount: documentsById.get(x.id) ?? 0 })),
      pinnedNotices: pinnedNotices.map((x) => ({ id: x.id, title: x.title, content: x.content, priority: x.priority, isPinned: x.isPinned, categoryId: x.categoryId, categoryName: x.categoryId == null ? null : names.get(x.categoryId) ?? null, deadline: x.deadline, publishedAt: x.publishedAt, createdAt: x.createdAt })),
    });
  } catch (error) { console.error("Failed to get dashboard:", error); return NextResponse.json({ error: "Database unavailable" }, { status: 503 }); }
}
