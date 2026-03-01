import path from 'node:path';

import { Automizer } from 'pptx-automizer';
import PptxGenJS from 'pptxgenjs';

const TEMPLATE_NAME = 'demoTemplate';
const SOURCE_FILE = 'demo2.pptx';
const ALLOWED_VISUAL_TYPES = new Set(['chart', 'diagram', 'table', 'textBox']);

const run = async () => {
    const rootDir = process.cwd();
    const sourcePath = path.join(rootDir, SOURCE_FILE);

    const automizer = new Automizer({
        templateDir: rootDir,
        outputDir: rootDir,
        pptxGenJs: new PptxGenJS(),
    });

    const presentation = automizer
        .loadRoot(sourcePath)
        .load(sourcePath, TEMPLATE_NAME);

    const info = await presentation.getInfo();
    const slides = info.slidesByTemplate(TEMPLATE_NAME);

    console.log(
        `Scanning "${SOURCE_FILE}" across ${slides.length} slide(s)...`,
    );

    let totalMatches = 0;

    for (const slide of slides) {
        const targetElements = slide.elements.filter((element) =>
            ALLOWED_VISUAL_TYPES.has(element.visualType),
        );

        if (!targetElements.length) {
            continue;
        }

        console.log(`\nSlide ${slide.number}: ${slide.info.name}`);

        for (const element of targetElements) {
            totalMatches += 1;

            const text = element.hasTextBody ? element.getText() : [];
            const paragraphs = element.hasTextBody
                ? element.getParagraphs()
                : [];
            const paragraphGroups = element.hasTextBody
                ? element.getParagraphGroups()
                : [];

            const details = {
                id: element.id,
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

    console.log(
        `\nFound ${totalMatches} matching element(s) of visual types: ${Array.from(ALLOWED_VISUAL_TYPES).join(', ')}.`,
    );
};

run().catch((error: unknown) => {
    console.error('Failed to inspect presentation:', error);
    process.exitCode = 1;
});
