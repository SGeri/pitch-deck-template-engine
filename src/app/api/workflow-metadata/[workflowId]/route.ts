import { readFile } from 'node:fs/promises';

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

    const raw = await readFile(entry.metadataPath, 'utf-8');

    return new NextResponse(raw, {
        headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${workflowId}-metadata.json"`,
        },
    });
}
