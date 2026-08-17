import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, categoriesTable, documentsTable } from "@/lib/db";

export const dynamic = 'force-dynamic';

const mockCategories = [
  { id: 1, name: "Admissions & Eligibility", icon: "graduation-cap", description: "Information on entry criteria, required documents, and application procedures.", documentCount: 12 },
  { id: 2, name: "Fees & Scholarships", icon: "dollar-sign", description: "Tuition structures, payment schedules, financial aid, and merit scholarships.", documentCount: 8 },
  { id: 3, name: "Curriculum & Courses", icon: "book-open", description: "Course syllabi, credit distribution, electives, and department regulations.", documentCount: 24 },
  { id: 4, name: "Examinations & Grading", icon: "file-text", description: "Exam schedules, evaluation patterns, re-evaluation rules, and GPA criteria.", documentCount: 15 },
  { id: 5, name: "Faculty & Departments", icon: "users", description: "Department heads, professor contact information, and research areas.", documentCount: 10 },
  { id: 6, name: "Campus Life & Housing", icon: "briefcase", description: "Hostel rules, library facilities, sports complex, and student council.", documentCount: 9 },
];

export async function GET() {
  if (!db) {
    return NextResponse.json(mockCategories);
  }

  try {
    const categories = await db
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
      .orderBy(categoriesTable.id);

    return NextResponse.json(categories.length > 0 ? categories : mockCategories);
  } catch (error) {
    return NextResponse.json(mockCategories);
  }
}
