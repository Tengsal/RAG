import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db, noticesTable, categoriesTable } from "@/lib/db";

export const dynamic = 'force-dynamic';

const mockNotices = [
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
  {
    id: 3,
    title: "Summer Internship Orientation Workshop",
    content: "Placement cell is hosting an orientation workshop for 3rd year students regarding summer industry internships.",
    priority: "normal" as const,
    isPinned: false,
    categoryId: 3,
    categoryName: "Curriculum & Courses",
    deadline: "2024-05-20",
    publishedAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
  },
];

export async function GET() {
  if (!db) {
    return NextResponse.json(mockNotices);
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
      .orderBy(desc(noticesTable.publishedAt));

    return NextResponse.json(notices.length > 0 ? notices : mockNotices);
  } catch (error) {
    return NextResponse.json(mockNotices);
  }
}
