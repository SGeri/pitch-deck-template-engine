export type MatrixValue = string | number;

export type TextReplacement = {
    visualType: 'textBox';
    slideNumber: number;
    replacementMarker: string;
    value: string;
};

export type TableReplacement = {
    visualType: 'table';
    slideNumber: number;
    elementId: string;
    matrix: MatrixValue[][];
};

export type ChartReplacement = {
    visualType: 'chart';
    slideNumber: number;
    elementId: string;
    values: number[];
    isExtended?: boolean;
    labels?: string[];
};

export type ReplacementEntry =
    | TextReplacement
    | TableReplacement
    | ChartReplacement;
