import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { postit_id, admin_id, content } = await request.json();

    if (!postit_id || !admin_id || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const stmt = db.prepare('INSERT INTO comments (postit_id, admin_id, content) VALUES (?, ?, ?)');
    const info = stmt.run(postit_id, admin_id, content);

    return NextResponse.json({ success: true, id: info.lastInsertRowid });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
