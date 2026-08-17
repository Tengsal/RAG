import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, bookmarksTable } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const bookmarkId = parseInt(params.id);

  if (!db) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const [deleted] = await db
      .delete(bookmarksTable)
      .where(eq(bookmarksTable.id, bookmarkId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return new NextResponse(null, { status: 204 });
  }
}
