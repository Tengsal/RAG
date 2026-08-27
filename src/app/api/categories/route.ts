import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Category, KnowledgeDocument } from "@/lib/models";
export const dynamic = "force-dynamic";
export async function GET() {
  try { await connectToDatabase(); const categories = await Category.find().sort({ id: 1 }).lean(); const counts = await KnowledgeDocument.aggregate([{ $group: { _id: "$categoryId", count: { $sum: 1 } } }]); const byId = new Map(counts.map((x) => [x._id as number, x.count as number])); return NextResponse.json(categories.map((x) => ({ id: x.id, name: x.name, icon: x.icon, description: x.description, documentCount: byId.get(x.id) ?? 0 }))); }
  catch (error) { console.error("Failed to get categories:", error); return NextResponse.json({ error: "Database unavailable" }, { status: 503 }); }
}
