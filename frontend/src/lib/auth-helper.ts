import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cs-manager-jwt-secret-2026-production';

export function getUser(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET) as any;
  } catch {
    return null;
  }
}

export function unauthorized() {
  return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
}
