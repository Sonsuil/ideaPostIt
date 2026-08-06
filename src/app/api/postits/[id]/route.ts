import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    
    // Check if postit exists
    const existing = db.prepare('SELECT * FROM postits WHERE id = ?').get(id) as any;
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const content = data.content !== undefined ? data.content : existing.content;
    const color = data.color !== undefined ? data.color : existing.color;
    const folder_id = data.folder_id !== undefined ? data.folder_id : existing.folder_id;
    const pos_x = data.pos_x !== undefined ? data.pos_x : existing.pos_x;
    const pos_y = data.pos_y !== undefined ? data.pos_y : existing.pos_y;
    const is_locked = data.is_locked !== undefined ? data.is_locked : existing.is_locked;

    const stmt = db.prepare(`
      UPDATE postits 
      SET content = ?, color = ?, folder_id = ?, pos_x = ?, pos_y = ?, is_locked = ?
      WHERE id = ?
    `);
    stmt.run(content, color, folder_id, pos_x, pos_y, is_locked ? 1 : 0, id);
    
    return NextResponse.json({ id: Number(id), content, color, folder_id, pos_x, pos_y, is_locked });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update postit' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = db.prepare('SELECT * FROM postits WHERE id = ?').get(id) as any;
    if (existing?.is_locked) {
      return NextResponse.json({ error: 'Cannot delete a locked postit' }, { status: 403 });
    }

    const stmt = db.prepare('DELETE FROM postits WHERE id = ?');
    stmt.run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete postit' }, { status: 500 });
  }
}
