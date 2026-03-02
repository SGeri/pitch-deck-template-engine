import path from 'node:path';

import {
    Automizer,
    ModifyChartHelper,
    ModifyTableHelper,
    ModifyTextHelper,
} from 'pptx-automizer';
import PptxGenJS from 'pptxgenjs';

const TEMPLATE_NAME = 'demoTemplate';
const SOURCE_FILE =
    'workflows/mol-quarterly/Dummy_Report_with_MOL_Slides_v4.pptx';
const OUTPUT_FILE = 'demo2.replaced.pptx';
const ALLOWED_VISUAL_TYPES = new Set<string>(['chart', 'table', 'textBox']);

type VisualType = 'textBox' | 'table' | 'chart';
type MatrixValue = string | number;

type TextReplacement = {
    visualType: 'textBox';
    replacementMarker: string;
    value: string;
};

type TableReplacement = {
    visualType: 'table';
    elementId: string;
    matrix: MatrixValue[][];
};

type ChartReplacement = {
    visualType: 'chart';
    elementId: string;
    values: number[];
    isExtended?: boolean;
    labels?: string[];
};

type ReplacementEntry = TextReplacement | TableReplacement | ChartReplacement;

type ReplacementData = {
    items: ReplacementEntry[];
};

const REPLACEMENTS: ReplacementData = {
    items: [
        {
            visualType: 'textBox',
            replacementMarker: '[1]',
            value: 'Quarterly Business Review',
        },
        {
            visualType: 'textBox',
            replacementMarker: '[2]',
            value: 'Q1 2026',
        },
        {
            visualType: 'textBox',
            replacementMarker: '[3]',
            value: 'Revenue Table',
        },
        {
            visualType: 'textBox',
            replacementMarker: '[4]',
            value: 'Revenue Chart',
        },
        {
            visualType: 'table',
            elementId: '308E7D9A-FECB-4270-5900-079F5D52F981',
            matrix: [
                ['Region', 'Q1', 'Q2'],
                ['North', 120, 140],
                ['South', 98, 115],
                ['West', 130, 150],
            ],
        },
        {
            visualType: 'chart',
            elementId: 'EC90D3EF-7833-E7B6-6628-3A749A1911CA',
            values: [100, 200, 150, 120],
        },
    ],
};

const toElementId = (
    slideNumber: number,
    element: { id?: string; creationId?: string; name: string },
): string => {
    return element.id || element.creationId || `${slideNumber}:${element.name}`;
};

const toElementSelector = (element: { name: string }) => {
    return element.name;
};

const mapMatrixToTableData = (matrix: MatrixValue[][]) => {
    return {
        body: matrix.map((values, rowIndex) => ({
            label: `row-${rowIndex + 1}`,
            values,
        })),
    };
};

const mapCategoriesToChartData = (
    values: number[],
    labels?: string[],
) => {
    return {
        series: [{ label: 'Series 1' }],
        categories: values.map((value, index) => ({
            label: labels?.[index] ?? `Category ${index + 1}`,
            values: [value],
        })),
    };
};

const getTextReplacementByMarker = (text: string) => {
    return REPLACEMENTS.items.find(
        (item) =>
            item.visualType === 'textBox' &&
            text.includes(item.replacementMarker),
    ) as TextReplacement | undefined;
};

const getNonTextReplacement = (elementId: string, visualType: VisualType) => {
    return REPLACEMENTS.items.find(
        (item) =>
            item.visualType !== 'textBox' &&
            item.elementId === elementId &&
            item.visualType === visualType,
    ) as TableReplacement | ChartReplacement | undefined;
};

const run = async () => {
    const rootDir = process.cwd();
    const sourcePath = path.join(rootDir, SOURCE_FILE);

    const automizer = new Automizer({
        templateDir: rootDir,
        outputDir: rootDir,
        removeExistingSlides: true,
        cleanup: true,
        pptxGenJs: new PptxGenJS(),
    });

    const presentation = automizer
        .loadRoot(sourcePath)
        .load(sourcePath, TEMPLATE_NAME);

    const info = await presentation.getInfo();
    const sourceSlides = info.slidesByTemplate(TEMPLATE_NAME);

    console.log(
        `Processing "${SOURCE_FILE}" across ${sourceSlides.length} slide(s)...`,
    );

    let totalSupportedElements = 0;
    let totalAppliedReplacements = 0;

    for (const sourceSlide of sourceSlides) {
        if (sourceSlide.number !== 3) continue;

        const targetElements = sourceSlide.elements.filter((element) =>
            ALLOWED_VISUAL_TYPES.has(element.visualType),
        );

        presentation.addSlide(TEMPLATE_NAME, sourceSlide.number, (slide) => {
            for (const element of targetElements) {
                const visualType = element.visualType as VisualType;
                const selector = toElementSelector(element);

                if (visualType === 'textBox') {
                    const currentText = element.getText().join('\n');
                    const replacement = getTextReplacementByMarker(currentText);
                    if (!replacement) continue;

                    slide.modifyElement(selector, [
                        ModifyTextHelper.setText(replacement.value),
                    ]);
                    totalAppliedReplacements += 1;
                    continue;
                }

                const elementId = toElementId(sourceSlide.number, element);
                const replacement = getNonTextReplacement(
                    elementId,
                    visualType,
                );
                if (!replacement) continue;

                if (replacement.visualType === 'table') {
                    slide.modifyElement(selector, [
                        ModifyTableHelper.setTable(
                            mapMatrixToTableData(replacement.matrix),
                        ),
                    ]);
                    totalAppliedReplacements += 1;
                    continue;
                }

                const chartData = mapCategoriesToChartData(
                    replacement.values,
                    replacement.labels,
                );
                const chartModifier = replacement.isExtended
                    ? ModifyChartHelper.setExtendedChartData(chartData)
                    : ModifyChartHelper.setChartData(chartData);

                slide.modifyElement(selector, [chartModifier]);
                totalAppliedReplacements += 1;
            }
        });

        if (!targetElements.length) {
            continue;
        }

        console.log(`\nSlide ${sourceSlide.number}: ${sourceSlide.info.name}`);

        for (const element of targetElements) {
            totalSupportedElements += 1;

            const text = element.hasTextBody ? element.getText() : [];
            const paragraphs = element.hasTextBody
                ? element.getParagraphs()
                : [];
            const paragraphGroups = element.hasTextBody
                ? element.getParagraphGroups()
                : [];

            const details = {
                id: toElementId(sourceSlide.number, element),
                name: element.name,
                creationId: element.creationId,
                type: element.type,
                visualType: element.visualType,
                nameIdx: element.nameIdx,
                hasTextBody: element.hasTextBody,
                position: element.position,
                altText: element.getAltText(),
                placeholder: element.getPlaceholderInfo(),
                text,
                paragraphs,
                paragraphGroups,
            };

            console.log(JSON.stringify(details, null, 2));
        }
    }

    const summary = await presentation.write(OUTPUT_FILE);
    console.log(`\nOutput written to "${OUTPUT_FILE}".`);
    console.log(JSON.stringify(summary, null, 2));
    console.log(
        `\nFound ${totalSupportedElements} supported element(s) and applied ${totalAppliedReplacements} replacement(s).`,
    );
};

run().catch((error: unknown) => {
    console.error('Failed to inspect presentation:', error);
    process.exitCode = 1;
});
