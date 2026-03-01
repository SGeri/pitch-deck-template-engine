import path from 'node:path';

import type { WorkflowRegistryEntry } from './types';

const ROOT_DIR = process.cwd();

export const WORKFLOW_REGISTRY: WorkflowRegistryEntry[] = [
    {
        id: 'mol-quarterly',
        name: 'MOL Quarterly Report',
        description:
            'AI-generated quarterly results presentation for MOL Group covering financials, safety KPIs, and upstream operations.',
        templatePath: path.join(
            ROOT_DIR,
            'workflows',
            'mol-quarterly',
            'Dummy_Report_with_MOL_Slides_v2.5.pptx',
        ),
        metadataPath: path.join(
            ROOT_DIR,
            'workflows',
            'mol-quarterly',
            'metadata.json',
        ),
    },
];
