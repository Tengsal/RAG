import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Category, KnowledgeDocument } from "@/lib/models";
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id); if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
  try { await connectToDatabase(); const document = await KnowledgeDocument.findOne({ id }).lean(); if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 }); const category = document.categoryId == null ? null : await Category.findOne({ id: document.categoryId }).lean(); return NextResponse.json({ id: document.id, categoryId: document.categoryId, categoryName: category?.name ?? null, title: document.title, description: document.description, pageCount: document.pageCount, createdAt: document.createdAt }); }
  catch (error) { console.error("Failed to get document:", error); return NextResponse.json({ error: "Database unavailable" }, { status: 503 }); }
}
