import { NextRequest, NextResponse } from "next/server";
import { eq, ilike, and, type SQL } from "drizzle-orm";
import { db, documentsTable, categoriesTable } from "@/lib/db";

const mockDocuments = [
  { id: 1, categoryId: 1, categoryName: "Admissions & Eligibility", title: "Undergraduate Prospectus 2024-25", description: "Comprehensive guide to undergraduate programs, entry requirements, and admission guidelines.", pageCount: 45, createdAt: new Date().toISOString() },
  { id: 2, categoryId: 1, categoryName: "Admissions & Eligibility", title: "Postgraduate Admission Policy", description: "Detailed criteria and procedure for M.Tech, MCA, and Ph.D. admissions.", pageCount: 28, createdAt: new Date().toISOString() },
  { id: 3, categoryId: 2, categoryName: "Fees & Scholarships", title: "Official Tuition & Hostel Fee Structure", description: "Annual fee breakup for all courses including tuition, development, and hostel fees.", pageCount: 14, createdAt: new Date().toISOString() },
  { id: 4, categoryId: 2, categoryName: "Fees & Scholarships", title: "Merit-cum-Means Scholarship Guidelines", description: "Eligibility criteria, application deadlines, and renewal norms for financial scholarships.", pageCount: 8, createdAt: new Date().toISOString() },
  { id: 5, categoryId: 3, categoryName: "Curriculum & Courses", title: "B.Tech Computer Science Curriculum Manual", description: "Semester-wise course structure, credit distribution, and elective offerings.", pageCount: 62, createdAt: new Date().toISOString() },
  { id: 6, categoryId: 4, categoryName: "Examinations & Grading", title: "University Examination Ordinance", description: "Rules governing end-semester exams, internal assessment, re-evaluation, and grading scale.", pageCount: 36, createdAt: new Date().toISOString() },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryIdParam = searchParams.get("categoryId");
  const searchParam = searchParams.get("search");

  const categoryId = categoryIdParam ? parseInt(categoryIdParam) : null;

  if (!db) {
    let filtered = mockDocuments;
    if (categoryId) {
      filtered = filtered.filter((d) => d.categoryId === categoryId);
    }
    if (searchParam) {
      const q = searchParam.toLowerCase();
      filtered = filtered.filter((d) => d.title.toLowerCase().includes(q) || (d.description && d.description.toLowerCase().includes(q)));
    }
    return NextResponse.json(filtered);
  }

  try {
    const conditions: SQL[] = [];
    if (categoryId != null) {
      conditions.push(eq(documentsTable.categoryId, categoryId));
    }
    if (searchParam) {
      conditions.push(ilike(documentsTable.title, `%${searchParam}%`));
    }

    const docs = await db
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
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(documentsTable.title);

    return NextResponse.json(docs.length > 0 ? docs : mockDocuments);
  } catch (error) {
    return NextResponse.json(mockDocuments);
  }
}
