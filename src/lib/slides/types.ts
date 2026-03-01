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
    bars: number[];
};

export type ReplacementEntry =
    | TextReplacement
    | TableReplacement
    | ChartReplacement;
