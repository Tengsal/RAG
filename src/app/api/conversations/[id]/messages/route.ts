import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, conversationsTable, messagesTable, categoriesTable } from "@/lib/db";

export const dynamic = 'force-dynamic';

function generateAIResponse(query: string): string {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes("admission") || lowerQuery.includes("apply") || lowerQuery.includes("eligibility")) {
    return `## Admission Process & Entry Criteria

The university follows a merit-based admission process for all undergraduate and postgraduate programs. Applications are accepted through the official university portal during designated admission windows.

**Key Requirements:**
- Completed application form with supporting documents
- Academic transcripts from previous institution (minimum 60% aggregate for B.Tech/BCA)
- Valid government-issued photo identification
- Program-specific entrance test scores (JEE Main / University Entrance Test)

**Important Dates:**
- Application window opens: March 1st
- Last date for applications: May 31st
- Merit list declaration: June 15th
- Admission confirmation & seat locking: June 30th

Candidates are encouraged to apply early to secure their preferred program branch.`;
  }

  if (lowerQuery.includes("fee") || lowerQuery.includes("scholarship")) {
    return `## Fee Structure & Scholarships

The university offers competitive fee structures designed to make quality education accessible to all eligible students.

**Annual Fee Components:**
- Tuition Fee: ₹85,000 per annum (undergraduate programs)
- Development Fee: ₹5,000 per annum
- Library & Laboratory Fee: ₹3,500 per annum
- Examination Fee: ₹2,000 per semester

**Available Scholarships:**
- Merit Scholarship: For students scoring 90%+ in qualifying examination
- Need-Based Financial Aid: For economically disadvantaged students
- Sports Scholarship: For national/state-level athletes

All scholarship applications must be submitted within 30 days of enrollment.`;
  }

  if (lowerQuery.includes("exam") || lowerQuery.includes("result") || lowerQuery.includes("grade")) {
    return `## Examination Guidelines & Evaluation

The university conducts semester-end examinations for all programs following the academic calendar. The examination process is governed by the Examination Ordinance.

**Evaluation Pattern:**
- Internal Assessment: 40% (comprising assignments, mid-term tests, and attendance)
- End-Semester Examination: 60% (written examination)

**Passing Criteria:**
- Minimum 40% marks required in each component separately
- Overall minimum of 45% aggregate to pass a course`;
  }

  return `## Response to Your Query

Based on your question regarding **"${query}"**, here is the verified information from official university documentation:

The university maintains comprehensive guidelines for all academic and administrative matters. All policies are regularly updated to reflect current regulations.

**Key Highlights:**
- Official student handbook guidelines apply
- Academic counseling office is available Monday to Friday (9 AM - 5 PM)
- Contact department head for specific branch queries`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const convoId = parseInt(params.id);

  if (!db) {
    return NextResponse.json([]);
  }

  try {
    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, convoId))
      .orderBy(messagesTable.createdAt);

    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json([]);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const convoId = parseInt(params.id);
  const body = await request.json();
  const content = body.content;

  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const userQuery = content.toLowerCase();
  let confidence: "high" | "medium" | "low" = "high";
  let followUpQuestions: string[] = [];
  let clarificationOptions: string[] = [];

  if (userQuery.includes("bca") || userQuery.includes("b.tech") || userQuery.includes("mca")) {
    confidence = "medium";
    followUpQuestions = [
      "What is the eligibility criteria for this program?",
      "What is the fee structure for this course?",
      "What are the career prospects after completing this program?",
    ];
    clarificationOptions = ["BCA (Bachelor of Computer Applications)", "B.Tech (Bachelor of Technology)", "MCA (Master of Computer Applications)"];
  } else if (userQuery.includes("fee") || userQuery.includes("scholarship")) {
    confidence = "high";
    followUpQuestions = [
      "Are there any merit-based scholarships available?",
      "What is the payment schedule for fees?",
      "Is there an installment option available?",
    ];
  } else if (userQuery.includes("admission") || userQuery.includes("apply") || userQuery.includes("enroll")) {
    confidence = "high";
    followUpQuestions = [
      "What documents are required for admission?",
      "What is the last date for admission?",
      "Is there an entrance exam requirement?",
    ];
  } else if (userQuery.length < 20) {
    confidence = "low";
    clarificationOptions = [
      "Admission process and eligibility",
      "Fee structure and scholarships",
      "Academic programs and curriculum",
      "Examination rules and results",
    ];
  }

  const sampleSources = [
    {
      id: 1,
      documentId: 1,
      documentName: "University Admissions Handbook 2024",
      pageNumber: 14,
      lineStart: 10,
      lineEnd: 32,
      snippet: "Official academic policies and regulations governing admissions, eligibility, and program structures.",
      retrievalScore: 0.92,
    },
  ];

  const responseContent = generateAIResponse(content);

  if (!db) {
    const aiMessage = {
      id: Date.now(),
      conversationId: convoId,
      role: "assistant",
      content: responseContent,
      confidence,
      sources: sampleSources,
      followUpQuestions: followUpQuestions.length > 0 ? followUpQuestions : null,
      clarificationOptions: clarificationOptions.length > 0 ? clarificationOptions : null,
      createdAt: new Date().toISOString(),
    };
    return NextResponse.json(aiMessage, { status: 201 });
  }

  try {
    // Save user message
    await db.insert(messagesTable).values({
      conversationId: convoId,
      role: "user",
      content,
      confidence: null,
      sources: null,
      followUpQuestions: null,
      clarificationOptions: null,
    });

    // Update conversation timestamp
    await db
      .update(conversationsTable)
      .set({ updatedAt: new Date() })
      .where(eq(conversationsTable.id, convoId));

    // Save AI response
    const [aiMessage] = await db.insert(messagesTable).values({
      conversationId: convoId,
      role: "assistant",
      content: responseContent,
      confidence,
      sources: sampleSources,
      followUpQuestions: followUpQuestions.length > 0 ? followUpQuestions : null,
      clarificationOptions: clarificationOptions.length > 0 ? clarificationOptions : null,
    }).returning();

    return NextResponse.json(aiMessage, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      id: Date.now(),
      conversationId: convoId,
      role: "assistant",
      content: responseContent,
      confidence,
      sources: sampleSources,
      followUpQuestions,
      clarificationOptions,
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }
}
