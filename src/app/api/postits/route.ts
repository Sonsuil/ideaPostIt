import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const color = searchParams.get('color');
    const folderId = searchParams.get('folder_id');
    const board_id = searchParams.get('board_id') || 'erp';

    let query = 'SELECT * FROM postits';
    const params: any[] = [];
    const conditions: string[] = ['board_id = ?'];
    params.push(board_id);

    if (color) {
      conditions.push('color = ?');
      params.push(color);
    }
    if (folderId) {
      if (folderId === 'null') {
        conditions.push('folder_id IS NULL');
      } else {
        conditions.push('folder_id = ?');
        params.push(folderId);
      }
    }

    query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC';

    const postits = db.prepare(query).all(...params);
    return NextResponse.json(postits);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch postits' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { content, color, folder_id, pos_x, pos_y, board_id = 'erp' } = await request.json();
    if (!content || !color) return NextResponse.json({ error: 'Content and color are required' }, { status: 400 });

    const x = pos_x || 0;
    const y = pos_y || 0;

    const stmt = db.prepare('INSERT INTO postits (content, color, folder_id, pos_x, pos_y, board_id) VALUES (?, ?, ?, ?, ?, ?)');
    const result = stmt.run(content, color, folder_id || null, x, y, board_id);
    
    return NextResponse.json({ id: result.lastInsertRowid, content, color, folder_id: folder_id || null, pos_x: x, pos_y: y, board_id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create postit' }, { status: 500 });
  }
}
