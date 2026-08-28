import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Conversation, Message, nextId } from "@/lib/models";
import { askRag, mapRagToMessage } from "@/lib/rag-api";

export const dynamic = "force-dynamic";
const asMessage = (message: any) => ({ id: message.id, conversationId: message.conversationId, role: message.role, content: message.content, confidence: message.confidence ?? null, sources: message.sources ?? null, followUpQuestions: message.followUpQuestions ?? null, clarificationOptions: message.clarificationOptions ?? null, createdAt: message.createdAt });

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const conversationId = Number(params.id);
  if (!Number.isInteger(conversationId)) return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  try {
    await connectToDatabase();
    return NextResponse.json((await Message.find({ conversationId }).sort({ createdAt: 1, id: 1 }).lean()).map(asMessage));
  } catch (error) {
    console.error("Failed to get messages:", error);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const conversationId = Number(params.id);
  const { content } = await request.json();
  if (!Number.isInteger(conversationId) || !content) return NextResponse.json({ error: "Content is required" }, { status: 400 });
  try {
    await connectToDatabase();
    if (!await Conversation.exists({ id: conversationId })) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    let aiMessage: any;
    try {
      const ragData = await askRag(content);
      console.log("[messages] RAG RESPONSE:", ragData);
      aiMessage = mapRagToMessage(ragData, conversationId, 0);
    } catch (error) {
      console.error("[messages] RAG backend call failed:", error);
      aiMessage = { id: 0, conversationId, role: "assistant", content: "Sorry, I couldn't reach the university knowledge service right now. Please try again in a moment.", confidence: null, status: "REFUSE", intent: "error", confidenceScore: null, sources: null, followUpQuestions: null, clarificationOptions: null, createdAt: new Date() };
    }
    await Message.create({ id: await nextId("messages"), conversationId, role: "user", content, confidence: null, sources: null, followUpQuestions: null, clarificationOptions: null });
    const saved = await Message.create({ id: await nextId("messages"), conversationId, role: "assistant", content: aiMessage.content, confidence: aiMessage.confidence ?? null, sources: aiMessage.sources ?? null, followUpQuestions: aiMessage.followUpQuestions ?? null, clarificationOptions: aiMessage.clarificationOptions ?? null });
    await Conversation.updateOne({ id: conversationId }, { $set: { updatedAt: new Date() } });
    return NextResponse.json({ ...asMessage(saved), status: aiMessage.status, intent: aiMessage.intent, confidenceScore: aiMessage.confidenceScore }, { status: 201 });
  } catch (error) {
    console.error("Failed to save chat messages:", error);
    return NextResponse.json({ error: "Failed to save messages", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
