import path from 'node:path';

type FileParser = (content: string) => Promise<string>;

const FILE_PARSERS: Record<string, FileParser> = {
    '.txt': async (content) => content,

    '.pdf': async () => {
        throw new Error(
            'PDF parsing is not yet implemented. Please convert to .txt first.',
        );
    },

    '.xlsx': async () => {
        throw new Error(
            'XLSX parsing is not yet implemented. Please convert to .txt first.',
        );
    },

    '.docx': async () => {
        throw new Error(
            'Word document parsing is not yet implemented. Please convert to .txt first.',
        );
    },
};

export const SUPPORTED_FILE_EXTENSIONS = Object.keys(FILE_PARSERS);

export async function parseFileContent(
    content: string,
    fileName: string,
): Promise<string> {
    const ext = path.extname(fileName).toLowerCase();
    const parser = FILE_PARSERS[ext];

    if (!parser) {
        throw new Error(
            `Unsupported file type "${ext}". Supported: ${SUPPORTED_FILE_EXTENSIONS.join(', ')}`,
        );
    }

    return parser(content);
}
