import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { adminId, password } = await request.json();

    if (!adminId || !password) {
      return NextResponse.json({ error: 'Admin ID and password are required' }, { status: 400 });
    }

    const passwordsFilePath = path.join(process.cwd(), 'admin-users.json');
    
    if (!fs.existsSync(passwordsFilePath)) {
      return NextResponse.json({ success: false, error: 'Admin users file not found' }, { status: 500 });
    }

    const passwordsData = fs.readFileSync(passwordsFilePath, 'utf8');
    const passwords = JSON.parse(passwordsData);

    const correctPassword = passwords[adminId];

    if (!correctPassword) {
      return NextResponse.json({ success: false, error: '존재하지 않는 관리자 계정입니다.' }, { status: 401 });
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
