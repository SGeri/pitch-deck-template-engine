'use server';

import { readFile } from 'node:fs/promises';

import { WORKFLOW_REGISTRY } from '@/lib/workflows/registry';
import type { WorkflowMetadata, WorkflowSummary } from '@/lib/workflows/types';

export async function getWorkflows(): Promise<WorkflowSummary[]> {
    return WORKFLOW_REGISTRY.map((entry) => ({
        id: entry.id,
        name: entry.name,
        description: entry.description,
    }));
}

export async function getWorkflowMetadata(
    workflowId: string,
): Promise<WorkflowMetadata> {
    const entry = WORKFLOW_REGISTRY.find((w) => w.id === workflowId);
    if (!entry) {
        throw new Error(`Workflow "${workflowId}" not found in registry.`);
    }

    const raw = await readFile(entry.metadataPath, 'utf-8');
    return JSON.parse(raw) as WorkflowMetadata;
}
