import { aiModel } from '@/lib/ai';
import type { ReplacementEntry } from '@/lib/slides/types';
import type { DataSourceInput, WorkflowMetadata } from '@/lib/workflows/types';
import { generateText } from 'ai';

export interface GeneratedContent {
    slideNumber: number;
    marker: string;
    value: string;
}

function assembleDataSourceContent(dataSources: DataSourceInput[]): string {
    return dataSources
        .map((ds) => ds.content)
        .filter(Boolean)
        .join('\n\n---\n\n');
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
    const dataSourceContent = assembleDataSourceContent(dataSources);

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
