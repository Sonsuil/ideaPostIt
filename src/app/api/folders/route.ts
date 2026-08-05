import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const folders = db.prepare('SELECT * FROM folders ORDER BY created_at ASC').all();
    return NextResponse.json(folders);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const stmt = db.prepare('INSERT INTO folders (name) VALUES (?)');
    const result = stmt.run(name);
    
    return NextResponse.json({ id: result.lastInsertRowid, name }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}
