import {
    Automizer,
    ModifyChartHelper,
    ModifyTableHelper,
    ModifyTextHelper,
} from 'pptx-automizer';
import PptxGenJS from 'pptxgenjs';

import type {
    ChartReplacement,
    MatrixValue,
    ReplacementEntry,
    TableReplacement,
    TextReplacement,
} from './types';

type VisualType = 'textBox' | 'table' | 'chart';

const TEMPLATE_NAME = 'sourceTemplate';
const ALLOWED_VISUAL_TYPES = new Set<string>(['chart', 'table', 'textBox']);

function getTextReplacementForSlide(
    text: string,
    slideNumber: number,
    replacements: ReplacementEntry[],
): TextReplacement | undefined {
    return replacements.find(
        (item): item is TextReplacement =>
            item.visualType === 'textBox' &&
            item.slideNumber === slideNumber &&
            text.includes(item.replacementMarker),
    );
}

function getNonTextReplacement(
    elementId: string,
    slideNumber: number,
    visualType: VisualType,
    replacements: ReplacementEntry[],
): TableReplacement | ChartReplacement | undefined {
    return replacements.find(
        (item): item is TableReplacement | ChartReplacement =>
            item.visualType !== 'textBox' &&
            item.slideNumber === slideNumber &&
            item.elementId === elementId &&
            item.visualType === visualType,
    );
}

function toElementId(
    slideNumber: number,
    element: { id?: string; creationId?: string; name: string },
): string {
    return element.id || element.creationId || `${slideNumber}:${element.name}`;
}

function mapMatrixToTableData(matrix: MatrixValue[][]) {
    return {
        body: matrix.map((values, rowIndex) => ({
            label: `row-${rowIndex + 1}`,
            values,
        })),
    };
}

function mapBarsToChartData(bars: number[]) {
    return {
        series: [{ label: 'Series 1' }],
        categories: bars.map((value, index) => ({
            label: `Bar ${index + 1}`,
            values: [value],
        })),
    };
}

export interface GeneratePresentationOptions {
    templatePath: string;
    replacements: ReplacementEntry[];
    outputDir: string;
    outputFileName: string;
}

export async function generatePresentation({
    templatePath,
    replacements,
    outputDir,
    outputFileName,
}: GeneratePresentationOptions): Promise<string> {
    const automizer = new Automizer({
        templateDir: '.',
        outputDir,
        removeExistingSlides: true,
        cleanup: true,
        pptxGenJs: new PptxGenJS(),
    });

    const presentation = automizer
        .loadRoot(templatePath)
        .load(templatePath, TEMPLATE_NAME);

    const info = await presentation.getInfo();
    const sourceSlides = info.slidesByTemplate(TEMPLATE_NAME);

    let totalApplied = 0;

    for (const sourceSlide of sourceSlides) {
        const targetElements = sourceSlide.elements.filter((element) =>
            ALLOWED_VISUAL_TYPES.has(element.visualType),
        );

        presentation.addSlide(TEMPLATE_NAME, sourceSlide.number, (slide) => {
            for (const element of targetElements) {
                const visualType = element.visualType as VisualType;
                const selector = element.name;

                if (visualType === 'textBox') {
                    const currentText = element.getText().join('\n');
                    const replacement = getTextReplacementForSlide(
                        currentText,
                        sourceSlide.number,
                        replacements,
                    );
                    if (!replacement) continue;

                    slide.modifyElement(selector, [
                        ModifyTextHelper.setText(replacement.value),
                    ]);
                    totalApplied += 1;
                    continue;
                }

                const elementId = toElementId(sourceSlide.number, element);
                const replacement = getNonTextReplacement(
                    elementId,
                    sourceSlide.number,
                    visualType,
                    replacements,
                );
                if (!replacement) continue;

                if (replacement.visualType === 'table') {
                    slide.modifyElement(selector, [
                        ModifyTableHelper.setTable(
                            mapMatrixToTableData(replacement.matrix),
                        ),
                    ]);
                    totalApplied += 1;
                    continue;
                }

                slide.modifyElement(selector, [
                    ModifyChartHelper.setChartData(
                        mapBarsToChartData(replacement.bars),
                    ),
                ]);
                totalApplied += 1;
            }
        });
    }

    const summary = await presentation.write(outputFileName);
    console.log(
        `Slides engine: wrote "${outputFileName}" with ${totalApplied} replacement(s).`,
        summary,
    );

    return outputFileName;
}
