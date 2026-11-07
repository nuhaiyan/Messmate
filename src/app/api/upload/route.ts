import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import path from 'path';
import fs from 'fs/promises';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in to upload files.' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const uploadType = (formData.get('type') as string) || 'asset';

    // Permission Check: Any authenticated member can upload their own profile avatar.
    // General assets and mess branding uploads are restricted to Managers and Admins.
    const isManagement = session.isPrimaryAdmin || session.isAdmin || session.isManager;
    if (uploadType !== 'avatar' && !isManagement) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only Managers and Admins can upload general assets.' },
        { status: 403 }
      );
    }

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { success: false, error: 'No file provided.' },
        { status: 400 }
      );
    }

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds maximum limit of 5MB.' },
        { status: 400 }
      );
    }

    // Validate file type
    const validMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!validMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file format. Please upload PNG, JPG, WEBP, or SVG.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/uploads
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(file.name) || (file.type === 'image/png' ? '.png' : file.type === 'image/webp' ? '.webp' : '.jpg');
    const safeBase = file.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const fileName = `${uploadType}-${Date.now()}-${safeBase}${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'File upload failed.' },
      { status: 500 }
    );
  }
}
