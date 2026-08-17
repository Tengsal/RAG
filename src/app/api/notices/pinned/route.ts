import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db, noticesTable, categoriesTable } from "@/lib/db";

export const dynamic = 'force-dynamic';

const mockPinnedNotices = [
  {
    id: 1,
    title: "End-Semester Final Exam Schedule Released",
    content: "The final exam schedule for Spring Semester 2024 has been published. All students must download their admit cards from the portal.",
    priority: "urgent" as const,
    isPinned: true,
    categoryId: 4,
    categoryName: "Examinations & Grading",
    deadline: "2024-05-15",
    publishedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  },
  {
    id: 2,
    title: "Merit Scholarship Applications Open",
    content: "Eligible undergraduate students scoring above 90% CGPA can submit scholarship applications before the deadline.",
    priority: "high" as const,
    isPinned: true,
    categoryId: 2,
    categoryName: "Fees & Scholarships",
    deadline: "2024-06-01",
    publishedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  },
];

export async function GET() {
  if (!db) {
    return NextResponse.json(mockPinnedNotices);
  }

  try {
    const notices = await db
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
      .where(eq(noticesTable.isPinned, true))
      .orderBy(desc(noticesTable.publishedAt));

    return NextResponse.json(notices.length > 0 ? notices : mockPinnedNotices);
  } catch (error) {
    return NextResponse.json(mockPinnedNotices);
  }
}
