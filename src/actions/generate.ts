'use server';

import { mkdir, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';

import {
    assembleReplacements,
    generateAllContent,
} from '@/lib/content/generator';
import { getGeneratedOutputDir } from '@/lib/runtime/paths';
import { generatePresentation } from '@/lib/slides/engine';
import { WORKFLOW_REGISTRY } from '@/lib/workflows/registry';
import type { DataSourceInput } from '@/lib/workflows/types';

import { getWorkflowMetadata } from './workflows';

const OUTPUT_DIR = getGeneratedOutputDir();

export interface GenerationResult {
    filename: string;
    fileBase64: string;
}

export async function generatePresentationAction(
    workflowId: string,
    dataSources: DataSourceInput[],
): Promise<GenerationResult> {
    const entry = WORKFLOW_REGISTRY.find((w) => w.id === workflowId);
    if (!entry) {
        throw new Error(`Workflow "${workflowId}" not found in registry.`);
    }

    const metadata = await getWorkflowMetadata(workflowId);

    console.log(
        `Starting content generation for "${metadata.name}" with ${metadata.slides.reduce((sum, s) => sum + s.markers.length, 0)} markers...`,
    );

    const generatedContent = await generateAllContent(metadata, dataSources);
    const replacements = assembleReplacements(generatedContent);

    await mkdir(OUTPUT_DIR, { recursive: true });

    const timestamp = Date.now();
    const outputFileName = `${workflowId}-${timestamp}.pptx`;

    await generatePresentation({
        templatePath: entry.templatePath,
        replacements,
        outputDir: OUTPUT_DIR,
        outputFileName,
    });

    const outputPath = path.join(OUTPUT_DIR, outputFileName);
    const fileBuffer = await readFile(outputPath);
    const fileBase64 = fileBuffer.toString('base64');

    // Best-effort cleanup of ephemeral output file.
    await unlink(outputPath).catch(() => undefined);

    return {
        filename: outputFileName,
        fileBase64,
    };
}
