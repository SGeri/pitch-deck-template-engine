import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

const OUTPUT_DIR = path.join(process.cwd(), 'generated');
const SAFE_FILENAME = /^[\w-]+\.pptx$/;

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ filename: string }> },
) {
    const { filename } = await params;

    if (!SAFE_FILENAME.test(filename)) {
        return NextResponse.json(
            { error: 'Invalid filename.' },
            { status: 400 },
        );
    }

    const filePath = path.join(OUTPUT_DIR, filename);

    try {
        await stat(filePath);
    } catch {
        return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }

    const buffer = await readFile(filePath);

    return new NextResponse(buffer, {
        headers: {
            'Content-Type':
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': String(buffer.length),
        },
    });
}
