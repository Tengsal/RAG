import { NextResponse } from "next/server";
import { eq, desc, sql } from "drizzle-orm";
import { db, conversationsTable, messagesTable, documentsTable, categoriesTable, noticesTable } from "@/lib/db";

export const dynamic = 'force-dynamic';

const mockCategories = [
  { id: 1, name: "Admissions & Eligibility", icon: "graduation-cap", description: "Information on entry criteria, required documents, and application procedures.", documentCount: 12 },
  { id: 2, name: "Fees & Scholarships", icon: "dollar-sign", description: "Tuition structures, payment schedules, financial aid, and merit scholarships.", documentCount: 8 },
  { id: 3, name: "Curriculum & Courses", icon: "book-open", description: "Course syllabi, credit distribution, electives, and department regulations.", documentCount: 24 },
  { id: 4, name: "Examinations & Grading", icon: "file-text", description: "Exam schedules, evaluation patterns, re-evaluation rules, and GPA criteria.", documentCount: 15 },
  { id: 5, name: "Faculty & Departments", icon: "users", description: "Department heads, professor contact information, and research areas.", documentCount: 10 },
  { id: 6, name: "Campus Life & Housing", icon: "briefcase", description: "Hostel rules, library facilities, sports complex, and student council.", documentCount: 9 },
];

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
    return NextResponse.json({
      totalConversations: 14,
      totalMessages: 86,
      totalDocuments: 78,
      recentConversations: [],
      categoryBreakdown: mockCategories,
      pinnedNotices: mockPinnedNotices,
    });
  }

  try {
    const [[{ totalConversations }], [{ totalMessages }], [{ totalDocuments }]] = await Promise.all([
      db.select({ totalConversations: sql<number>`cast(count(*) as integer)` }).from(conversationsTable),
      db.select({ totalMessages: sql<number>`cast(count(*) as integer)` }).from(messagesTable),
      db.select({ totalDocuments: sql<number>`cast(count(*) as integer)` }).from(documentsTable),
    ]);

    const [recentConversations, categoryBreakdown, pinnedNotices] = await Promise.all([
      db
        .select({
          id: conversationsTable.id,
          title: conversationsTable.title,
          categoryId: conversationsTable.categoryId,
          createdAt: conversationsTable.createdAt,
          updatedAt: conversationsTable.updatedAt,
          messageCount: sql<number>`cast(count(${messagesTable.id}) as integer)`,
        })
        .from(conversationsTable)
        .leftJoin(messagesTable, eq(messagesTable.conversationId, conversationsTable.id))
        .groupBy(conversationsTable.id)
        .orderBy(desc(conversationsTable.updatedAt))
        .limit(5),

      db
        .select({
          id: categoriesTable.id,
          name: categoriesTable.name,
          icon: categoriesTable.icon,
          description: categoriesTable.description,
          documentCount: sql<number>`cast(count(${documentsTable.id}) as integer)`,
        })
        .from(categoriesTable)
        .leftJoin(documentsTable, sql`${documentsTable.categoryId} = ${categoriesTable.id}`)
        .groupBy(categoriesTable.id)
        .orderBy(categoriesTable.id),

      db
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
        .orderBy(desc(noticesTable.publishedAt))
        .limit(3),
    ]);

    return NextResponse.json({
      totalConversations: totalConversations || 0,
      totalMessages: totalMessages || 0,
      totalDocuments: totalDocuments || 0,
      recentConversations,
      categoryBreakdown: categoryBreakdown.length > 0 ? categoryBreakdown : mockCategories,
      pinnedNotices: pinnedNotices.length > 0 ? pinnedNotices : mockPinnedNotices,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard, falling back to mock data:", error);
    return NextResponse.json({
      totalConversations: 14,
      totalMessages: 86,
      totalDocuments: 78,
      recentConversations: [],
      categoryBreakdown: mockCategories,
      pinnedNotices: mockPinnedNotices,
    });
  }
}
