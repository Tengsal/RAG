import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Category, Notice } from "@/lib/models";
export const dynamic = "force-dynamic";
export async function GET() {
  try { await connectToDatabase(); const [notices, categories] = await Promise.all([Notice.find({ isPinned: true }).sort({ publishedAt: -1 }).lean(), Category.find().lean()]); const names = new Map(categories.map((x) => [x.id, x.name])); return NextResponse.json(notices.map((x) => ({ id: x.id, title: x.title, content: x.content, priority: x.priority, isPinned: x.isPinned, categoryId: x.categoryId, categoryName: x.categoryId == null ? null : names.get(x.categoryId) ?? null, deadline: x.deadline, publishedAt: x.publishedAt, createdAt: x.createdAt }))); }
  catch (error) { console.error("Failed to get pinned notices:", error); return NextResponse.json({ error: "Database unavailable" }, { status: 503 }); }
}
