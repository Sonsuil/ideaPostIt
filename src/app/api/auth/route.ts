import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { boardId, password } = await request.json();

    if (!boardId || !password) {
      return NextResponse.json({ error: 'Board ID and password are required' }, { status: 400 });
    }

    const passwordsFilePath = path.join(process.cwd(), 'board-passwords.json');
    
    if (!fs.existsSync(passwordsFilePath)) {
      // If no file exists, just let everyone in (or throw error)
      return NextResponse.json({ success: true });
    }

    const passwordsData = fs.readFileSync(passwordsFilePath, 'utf8');
    const passwords = JSON.parse(passwordsData);

    const correctPassword = passwords[boardId];

    // If there is no specific password set for this board, allow access
    if (!correctPassword) {
      return NextResponse.json({ success: true });
    }

    if (password === correctPassword) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: '잘못된 비밀번호입니다.' }, { status: 401 });
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
