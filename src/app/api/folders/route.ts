import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const board_id = searchParams.get('board_id') || 'erp';
    const folders = db.prepare('SELECT * FROM folders WHERE board_id = ? ORDER BY created_at ASC').all(board_id);
    return NextResponse.json(folders);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, board_id = 'erp' } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const stmt = db.prepare('INSERT INTO folders (name, board_id) VALUES (?, ?)');
    const result = stmt.run(name, board_id);
    
    return NextResponse.json({ id: result.lastInsertRowid, name, board_id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}
