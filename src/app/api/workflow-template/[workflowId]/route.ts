import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { WORKFLOW_REGISTRY } from '@/lib/workflows/registry';
import { NextResponse } from 'next/server';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ workflowId: string }> },
) {
    const { workflowId } = await params;

    const entry = WORKFLOW_REGISTRY.find((w) => w.id === workflowId);
    if (!entry) {
        return NextResponse.json(
            { error: 'Workflow not found.' },
            { status: 404 },
        );
    }

    try {
        await stat(entry.templatePath);
    } catch {
        return NextResponse.json(
            { error: 'Template file not found.' },
            { status: 404 },
        );
    }

    const buffer = await readFile(entry.templatePath);
    const filename = path.basename(entry.templatePath);

    return new NextResponse(buffer, {
        headers: {
            'Content-Type':
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': String(buffer.length),
        },
    });
}
