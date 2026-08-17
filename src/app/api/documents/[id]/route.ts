import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, documentsTable, categoriesTable } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const docId = parseInt(params.id);

  if (!db) {
    return NextResponse.json({
      id: docId,
      categoryId: 1,
      categoryName: "Admissions & Eligibility",
      title: `University Document #${docId}`,
      description: "Official university handbook document.",
      pageCount: 20,
      createdAt: new Date().toISOString(),
    });
  }

  try {
    const [doc] = await db
      .select({
        id: documentsTable.id,
        categoryId: documentsTable.categoryId,
        categoryName: categoriesTable.name,
        title: documentsTable.title,
        description: documentsTable.description,
        pageCount: documentsTable.pageCount,
        createdAt: documentsTable.createdAt,
      })
      .from(documentsTable)
      .leftJoin(categoriesTable, eq(categoriesTable.id, documentsTable.categoryId))
      .where(eq(documentsTable.id, docId));

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(doc);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
