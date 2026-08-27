import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Bookmark, Conversation, Message } from "@/lib/models";

export const dynamic = "force-dynamic";
const asConversation = (item: any) => ({ id: item.id, title: item.title, categoryId: item.categoryId, createdAt: item.createdAt, updatedAt: item.updatedAt });
const asMessage = (item: any) => ({ id: item.id, conversationId: item.conversationId, role: item.role, content: item.content, confidence: item.confidence ?? null, sources: item.sources ?? null, followUpQuestions: item.followUpQuestions ?? null, clarificationOptions: item.clarificationOptions ?? null, createdAt: item.createdAt });

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  try {
    await connectToDatabase();
    const conversation = await Conversation.findOne({ id }).lean();
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    const messages = await Message.find({ conversationId: id }).sort({ createdAt: 1, id: 1 }).lean();
    return NextResponse.json({ ...asConversation(conversation), messages: messages.map(asMessage) });
  } catch (error) { console.error("Failed to get conversation:", error); return NextResponse.json({ error: "Database unavailable" }, { status: 503 }); }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const body = await request.json();
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  try {
    await connectToDatabase();
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) set.title = body.title;
    if (body.categoryId !== undefined) set.categoryId = body.categoryId ?? null;
    const conversation = await Conversation.findOneAndUpdate({ id }, { $set: set }, { new: true }).lean();
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    return NextResponse.json({ ...asConversation(conversation), messageCount: await Message.countDocuments({ conversationId: id }) });
  } catch (error) { console.error("Failed to update conversation:", error); return NextResponse.json({ error: "Database unavailable" }, { status: 503 }); }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  try {
    await connectToDatabase();
    const deleted = await Conversation.findOneAndDelete({ id }).lean();
    if (!deleted) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    await Promise.all([Message.deleteMany({ conversationId: id }), Bookmark.deleteMany({ conversationId: id })]);
    return new NextResponse(null, { status: 204 });
  } catch (error) { console.error("Failed to delete conversation:", error); return NextResponse.json({ error: "Database unavailable" }, { status: 503 }); }
}
