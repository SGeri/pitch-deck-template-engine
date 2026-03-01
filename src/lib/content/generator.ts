import { generateText } from 'ai';

import { aiModel } from '@/lib/ai';
import type { ReplacementEntry } from '@/lib/slides/types';
import type {
    ChartMarkerDefinition,
    DataSourceInput,
    MarkerDefinition,
    WorkflowMetadata,
} from '@/lib/workflows/types';

import { parseFileContent } from './file-parser';

export interface GeneratedTextContent {
    type: 'text';
    slideNumber: number;
    marker: string;
    value: string;
}

export interface GeneratedChartContent {
    type: 'chart';
    slideNumber: number;
    elementId: string;
    value: string;
}

export type GeneratedContent = GeneratedTextContent | GeneratedChartContent;

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

function isChartMarker(marker: MarkerDefinition): marker is ChartMarkerDefinition {
    return marker.type === 'chart';
}

export async function generateAllContent(
    metadata: WorkflowMetadata,
    dataSources: DataSourceInput[],
): Promise<GeneratedContent[]> {
    const dataSourceContent = await assembleDataSourceContent(dataSources);

    const tasks = metadata.slides.flatMap((slide) =>
        slide.markers.map((marker) => ({
            slideNumber: slide.slideNumber,
            marker,
        })),
    );

    const results = await Promise.all(
        tasks.map(async (task) => {
            const value = await generateMarkerContent(
                metadata.generalContext,
                dataSourceContent,
                task.marker.prompt,
            );

            if (isChartMarker(task.marker)) {
                return {
                    type: 'chart' as const,
                    slideNumber: task.slideNumber,
                    elementId: task.marker.elementId,
                    value,
                };
            }

            return {
                type: 'text' as const,
                slideNumber: task.slideNumber,
                marker: task.marker.marker,
                value,
            };
        }),
    );

    return results;
}

function parseChartBars(raw: string): number[] {
    return raw
        .split(',')
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !Number.isNaN(n));
}

export function assembleReplacements(
    generatedContent: GeneratedContent[],
): ReplacementEntry[] {
    return generatedContent.map((item): ReplacementEntry => {
        if (item.type === 'chart') {
            return {
                visualType: 'chart' as const,
                slideNumber: item.slideNumber,
                elementId: item.elementId,
                bars: parseChartBars(item.value),
            };
        }

        return {
            visualType: 'textBox' as const,
            slideNumber: item.slideNumber,
            replacementMarker: item.marker,
            value: item.value,
        };
    });
}
