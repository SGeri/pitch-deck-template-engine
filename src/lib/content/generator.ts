import { generateText } from 'ai';

import { aiModel } from '@/lib/ai';
import type { ReplacementEntry } from '@/lib/slides/types';
import type {
    DataSourceInput,
    WorkflowMetadata,
} from '@/lib/workflows/types';

import { parseFileContent } from './file-parser';

export interface GeneratedContent {
    slideNumber: number;
    marker: string;
    value: string;
}

async function resolveDataSourceContent(
    ds: DataSourceInput,
): Promise<string> {
    if (ds.type === 'file' && ds.fileName) {
        return parseFileContent(ds.content, ds.fileName);
    }
    return ds.content;
}

async function assembleDataSourceContent(
    dataSources: DataSourceInput[],
): Promise<string> {
    const resolved = await Promise.all(
        dataSources.map(resolveDataSourceContent),
    );
    return resolved.filter(Boolean).join('\n\n---\n\n');
}

async function generateMarkerContent(
    generalContext: string,
    dataSourceContent: string,
    markerPrompt: string,
): Promise<string> {
    const { text } = await generateText({
        model: aiModel,
        system: generalContext,
        messages: [
            {
                role: 'user',
                content: `${dataSourceContent}\n\n---\n\nINSTRUCTIONS:\n${markerPrompt}`,
            },
        ],
    });

    return text.trim();
}

export async function generateAllContent(
    metadata: WorkflowMetadata,
    dataSources: DataSourceInput[],
): Promise<GeneratedContent[]> {
    const dataSourceContent = await assembleDataSourceContent(dataSources);

    const tasks = metadata.slides.flatMap((slide) =>
        slide.markers.map((marker) => ({
            slideNumber: slide.slideNumber,
            marker: marker.marker,
            prompt: marker.prompt,
        })),
    );

    const results = await Promise.all(
        tasks.map(async (task) => {
            const value = await generateMarkerContent(
                metadata.generalContext,
                dataSourceContent,
                task.prompt,
            );
            return {
                slideNumber: task.slideNumber,
                marker: task.marker,
                value,
            };
        }),
    );

    return results;
}

export function assembleReplacements(
    generatedContent: GeneratedContent[],
): ReplacementEntry[] {
    return generatedContent.map((item) => ({
        visualType: 'textBox' as const,
        slideNumber: item.slideNumber,
        replacementMarker: item.marker,
        value: item.value,
    }));
}
