import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Bookmark } from "@/lib/models";
export const dynamic = "force-dynamic";
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid bookmark id" }, { status: 400 });
  try { await connectToDatabase(); if (!await Bookmark.findOneAndDelete({ id }).lean()) return NextResponse.json({ error: "Bookmark not found" }, { status: 404 }); return new NextResponse(null, { status: 204 }); }
  catch (error) { console.error("Failed to delete bookmark:", error); return NextResponse.json({ error: "Database unavailable" }, { status: 503 }); }
}
