import {
    type GenerationResult,
    generatePresentationAction,
} from '@/actions/generate';
import { getWorkflowMetadata, getWorkflows } from '@/actions/workflows';
import type { DataSourceInput } from '@/lib/workflows/types';
import { useMutation, useQuery } from '@tanstack/react-query';

export function useWorkflows() {
    return useQuery({
        queryKey: ['workflows'],
        queryFn: () => getWorkflows(),
    });
}

export function useWorkflowMetadata(workflowId: string | null) {
    return useQuery({
        queryKey: ['workflow-metadata', workflowId],
        queryFn: () => getWorkflowMetadata(workflowId!),
        enabled: !!workflowId,
    });
}

export function useGeneratePresentation() {
    return useMutation<
        GenerationResult,
        Error,
        { workflowId: string; dataSources: DataSourceInput[] }
    >({
        mutationFn: ({ workflowId, dataSources }) =>
            generatePresentationAction(workflowId, dataSources),
    });
}
