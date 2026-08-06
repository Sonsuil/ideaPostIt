import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    
    const existing = db.prepare('SELECT * FROM folders WHERE id = ?').get(id) as any;
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const name = data.name !== undefined ? data.name : existing.name;
    const pos_x = data.pos_x !== undefined ? data.pos_x : existing.pos_x;
    const pos_y = data.pos_y !== undefined ? data.pos_y : existing.pos_y;
    const is_locked = data.is_locked !== undefined ? data.is_locked : existing.is_locked;

    const stmt = db.prepare(`
      UPDATE folders 
      SET name = ?, pos_x = ?, pos_y = ?, is_locked = ?
      WHERE id = ?
    `);
    stmt.run(name, pos_x, pos_y, is_locked ? 1 : 0, id);
    
    return NextResponse.json({ id: Number(id), name, pos_x, pos_y, is_locked });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const existing = db.prepare('SELECT * FROM folders WHERE id = ?').get(id) as any;
    if (existing?.is_locked) {
      return NextResponse.json({ error: 'Cannot delete a locked folder' }, { status: 403 });
    }

    const url = new URL(request.url);
    const deletePostits = url.searchParams.get('deletePostits') === 'true';

    if (deletePostits) {
      const stmtPostits = db.prepare('DELETE FROM postits WHERE folder_id = ?');
      stmtPostits.run(id);
    }

    const stmt = db.prepare('DELETE FROM folders WHERE id = ?');
    stmt.run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}
