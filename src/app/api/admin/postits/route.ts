import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('board_id');

    let postits;
    if (boardId && boardId !== 'all') {
      postits = db.prepare('SELECT * FROM postits WHERE board_id = ? ORDER BY created_at DESC').all(boardId);
    } else {
      postits = db.prepare('SELECT * FROM postits ORDER BY created_at DESC').all();
    }

    // Attach comments for each postit
    const postitsWithComments = postits.map((p: any) => {
      const comments = db.prepare('SELECT * FROM comments WHERE postit_id = ? ORDER BY created_at ASC').all(p.id);
      return { ...p, comments };
    });

    return NextResponse.json(postitsWithComments);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
