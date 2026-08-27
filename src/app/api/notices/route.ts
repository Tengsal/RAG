import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Category, Notice } from "@/lib/models";
const asNotice = (x: any, names: Map<number, string>) => ({ id: x.id, title: x.title, content: x.content, priority: x.priority, isPinned: x.isPinned, categoryId: x.categoryId, categoryName: x.categoryId == null ? null : names.get(x.categoryId) ?? null, deadline: x.deadline, publishedAt: x.publishedAt, createdAt: x.createdAt });
export const dynamic = "force-dynamic";
export async function GET() {
  try { await connectToDatabase(); const [notices, categories] = await Promise.all([Notice.find().sort({ publishedAt: -1 }).lean(), Category.find().lean()]); return NextResponse.json(notices.map((x) => asNotice(x, new Map(categories.map((c) => [c.id, c.name]))))); }
  catch (error) { console.error("Failed to get notices:", error); return NextResponse.json({ error: "Database unavailable" }, { status: 503 }); }
}
