import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Category, KnowledgeDocument } from "@/lib/models";
const asDocument = (x: any, names: Map<number, string>) => ({ id: x.id, categoryId: x.categoryId, categoryName: x.categoryId == null ? null : names.get(x.categoryId) ?? null, title: x.title, description: x.description, pageCount: x.pageCount, createdAt: x.createdAt });
export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get("categoryId"); const search = request.nextUrl.searchParams.get("search");
  if (categoryId !== null && !Number.isInteger(Number(categoryId))) return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
  try { await connectToDatabase(); const filter: Record<string, unknown> = {}; if (categoryId !== null) filter.categoryId = Number(categoryId); if (search) filter.$or = [{ title: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }]; const [documents, categories] = await Promise.all([KnowledgeDocument.find(filter).sort({ title: 1 }).lean(), Category.find().lean()]); const names = new Map(categories.map((x) => [x.id, x.name])); return NextResponse.json(documents.map((x) => asDocument(x, names))); }
  catch (error) { console.error("Failed to get documents:", error); return NextResponse.json({ error: "Database unavailable" }, { status: 503 }); }
}
