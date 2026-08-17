import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, noticesTable, categoriesTable } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const noticeId = parseInt(params.id);

  if (!db) {
    return NextResponse.json({
      id: noticeId,
      title: "University Notice Announcement",
      content: "Important notice details regarding university procedures.",
      priority: "normal",
      isPinned: false,
      categoryId: 1,
      categoryName: "Admissions & Eligibility",
      deadline: "2024-06-30",
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  try {
    const [notice] = await db
      .select({
        id: noticesTable.id,
        title: noticesTable.title,
        content: noticesTable.content,
        priority: noticesTable.priority,
        isPinned: noticesTable.isPinned,
        categoryId: noticesTable.categoryId,
        categoryName: categoriesTable.name,
        deadline: noticesTable.deadline,
        publishedAt: noticesTable.publishedAt,
        createdAt: noticesTable.createdAt,
      })
      .from(noticesTable)
      .leftJoin(categoriesTable, eq(categoriesTable.id, noticesTable.categoryId))
      .where(eq(noticesTable.id, noticeId));

    if (!notice) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 });
    }

    return NextResponse.json(notice);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
