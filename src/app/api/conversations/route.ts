import { NextRequest, NextResponse } from "next/server";
import { eq, desc, sql } from "drizzle-orm";
import { db, conversationsTable, messagesTable } from "@/lib/db";

export const dynamic = 'force-dynamic';

// Memory storage fallback
let memoryConversations: Array<any> = [
  {
    id: 1,
    title: "Computer Science Eligibility & Fees",
    categoryId: 1,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    messageCount: 4,
    messages: [
      {
        id: 1,
        conversationId: 1,
        role: "user",
        content: "What are the admission requirements for Computer Science?",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 2,
        conversationId: 1,
        role: "assistant",
        content: "## Admission Requirements for B.Tech Computer Science\n\n- Minimum 60% aggregate in 10+2 with Physics, Chemistry, and Mathematics.\n- Valid score in University Entrance Examination or JEE Main.\n- Submission of Class X & XII mark sheets, entrance scorecard, and identity proof.",
        confidence: "high",
        sources: [
          {
            id: 1,
            documentId: 1,
            documentName: "Undergraduate Prospectus 2024-25",
            pageNumber: 12,
            lineStart: 40,
            lineEnd: 55,
            snippet: "B.Tech CS candidates must possess 60%+ in aggregate with PCM and clear JEE/University entrance exam.",
            retrievalScore: 0.94,
          },
        ],
        followUpQuestions: [
          "What is the fee structure for this course?",
          "Are scholarships available for CS students?",
        ],
        createdAt: new Date(Date.now() - 3600000 * 2 + 1000).toISOString(),
      },
    ],
  },
];

export async function GET() {
  if (!db) {
    return NextResponse.json(memoryConversations);
  }

  try {
    const conversations = await db
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
      .orderBy(desc(conversationsTable.updatedAt));

    return NextResponse.json(conversations.length > 0 ? conversations : memoryConversations);
  } catch (error) {
    return NextResponse.json(memoryConversations);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, categoryId } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!db) {
      const newConvo = {
        id: Date.now(),
        title,
        categoryId: categoryId ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
        messages: [],
      };
      memoryConversations.unshift(newConvo);
      return NextResponse.json(newConvo, { status: 201 });
    }

    const [convo] = await db
      .insert(conversationsTable)
      .values({ title, categoryId: categoryId ?? null })
      .returning();

    return NextResponse.json({ ...convo, messageCount: 0, messages: [] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
