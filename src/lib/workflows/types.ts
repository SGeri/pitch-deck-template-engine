export interface TextMarkerDefinition {
    type?: 'text';
    marker: string;
    prompt: string;
}

export interface ChartMarkerDefinition {
    type: 'chart';
    elementId: string;
    prompt: string;
    isExtended?: boolean;
    labels?: string[];
}

export type MarkerDefinition = TextMarkerDefinition | ChartMarkerDefinition;

export interface SlideDefinition {
    slideNumber: number;
    markers: MarkerDefinition[];
}

export interface DataSourceDefinition {
    id: string;
    label: string;
    description: string;
    type: 'textarea' | 'file';
    required: boolean;
    acceptedFileTypes?: string[];
}

export interface WorkflowMetadata {
    name: string;
    description: string;
    generalContext: string;
    dataSources: DataSourceDefinition[];
    slides: SlideDefinition[];
}

export interface WorkflowRegistryEntry {
    id: string;
    name: string;
    description: string;
    templatePath: string;
    metadataPath: string;
}

export interface DataSourceInput {
    id: string;
    type: 'textarea' | 'file';
    content: string;
    fileName?: string;
}

export interface WorkflowSummary {
    id: string;
    name: string;
    description: string;
}
