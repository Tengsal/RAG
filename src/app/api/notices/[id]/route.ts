import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Category, Notice } from "@/lib/models";
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id); if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid notice id" }, { status: 400 });
  try { await connectToDatabase(); const notice = await Notice.findOne({ id }).lean(); if (!notice) return NextResponse.json({ error: "Notice not found" }, { status: 404 }); const category = notice.categoryId == null ? null : await Category.findOne({ id: notice.categoryId }).lean(); return NextResponse.json({ id: notice.id, title: notice.title, content: notice.content, priority: notice.priority, isPinned: notice.isPinned, categoryId: notice.categoryId, categoryName: category?.name ?? null, deadline: notice.deadline, publishedAt: notice.publishedAt, createdAt: notice.createdAt }); }
  catch (error) { console.error("Failed to get notice:", error); return NextResponse.json({ error: "Database unavailable" }, { status: 503 }); }
}
