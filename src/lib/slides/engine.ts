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

function normalizeMarkerText(text: string): string {
    return text
        .normalize('NFKC')
        .replace(/\u00A0/g, ' ')
        .replace(/\r/g, '')
        .replace(/\[\s*(\d+)\s*\]/g, '[$1]')
        .trim();
}

function getTextReplacementForSlide(
    text: string,
    slideNumber: number,
    replacements: ReplacementEntry[],
): TextReplacement | undefined {
    const normalizedText = normalizeMarkerText(text);

    return replacements.find(
        (item): item is TextReplacement =>
            item.visualType === 'textBox' &&
            item.slideNumber === slideNumber &&
            normalizedText.includes(normalizeMarkerText(item.replacementMarker)),
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

function mapCategoriesToChartData(values: number[], labels?: string[]) {
    return {
        series: [{ label: 'Series 1' }],
        categories: values.map((value, index) => ({
            label: labels?.[index] ?? `Category ${index + 1}`,
            values: [value],
        })),
    };
}

/**
 * Minimal value-only modifier for chartEx (waterfall / extended) charts.
 * Updates numeric point values in both the chart XML (`cx:numDim`) and the
 * embedded workbook without touching labels, formulas, series structure,
 * table metadata, or any other formatting -- so the original template
 * layout is fully preserved.
 */
function updateExtendedChartValues(
    values: number[],
): ReturnType<typeof ModifyChartHelper.setExtendedChartData> {
    return (_element, chart, workbook) => {
        if (!chart || !workbook) return;

        const numDimElements = chart.getElementsByTagName('cx:numDim');
        for (let d = 0; d < numDimElements.length; d++) {
            const pts = numDimElements[d].getElementsByTagName('cx:pt');
            for (let i = 0; i < pts.length && i < values.length; i++) {
                pts[i].textContent = String(values[i]);
            }
        }

        const rows = workbook.sheet.getElementsByTagName('row');
        let valueIdx = 0;
        for (let r = 0; r < rows.length && valueIdx < values.length; r++) {
            const cells = rows[r].getElementsByTagName('c');
            for (let c = 0; c < cells.length; c++) {
                if (cells[c].getAttribute('t') === 's') continue;
                const v = cells[c].getElementsByTagName('v')[0];
                if (v) {
                    v.textContent = String(values[valueIdx]);
                    valueIdx++;
                }
            }
        }
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
            // Text placeholders can have duplicated shape names on a slide.
            // Modify them by marker-content on target XML, not by selector.
            const textReplacementsForSlide = replacements.filter(
                (item): item is TextReplacement =>
                    item.visualType === 'textBox' &&
                    item.slideNumber === sourceSlide.number,
            );
            if (textReplacementsForSlide.length) {
                slide.modify((doc) => {
                    const shapes = doc.getElementsByTagName('p:sp');
                    for (let i = 0; i < shapes.length; i++) {
                        const shape = shapes.item(i);
                        if (!shape) continue;

                        const textRuns = shape.getElementsByTagName('a:t');
                        if (!textRuns.length) continue;

                        const rawText = Array.from(textRuns)
                            .map((node) => node.textContent ?? '')
                            .join('\n');
                        const replacement = getTextReplacementForSlide(
                            rawText,
                            sourceSlide.number,
                            textReplacementsForSlide,
                        );
                        if (!replacement) continue;

                        ModifyTextHelper.setText(replacement.value)(shape);
                        totalApplied += 1;
                    }
                });
            }

            for (const element of targetElements) {
                const visualType = element.visualType as VisualType;
                const selector = element.name;
                if (visualType === 'textBox') continue;

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

                const chartModifier = replacement.isExtended
                    ? updateExtendedChartValues(replacement.values)
                    : ModifyChartHelper.setChartData(
                          mapCategoriesToChartData(
                              replacement.values,
                              replacement.labels,
                          ),
                      );

                slide.modifyElement(selector, [chartModifier]);
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
