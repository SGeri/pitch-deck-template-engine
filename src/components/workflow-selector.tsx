'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkflowMetadata, useWorkflows } from '@/hooks/use-workflows';
import { ArrowRight, Download, FileText, Presentation } from 'lucide-react';

interface WorkflowSelectorProps {
    selectedId: string | null;
    onSelect: (id: string) => void;
    onNext: () => void;
}

export function WorkflowSelector({
    selectedId,
    onSelect,
    onNext,
}: WorkflowSelectorProps) {
    const { data: workflows, isLoading: loadingWorkflows } = useWorkflows();
    const { data: metadata, isLoading: loadingMetadata } =
        useWorkflowMetadata(selectedId);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <Label htmlFor="workflow-select">Workflow Template</Label>
                {loadingWorkflows ? (
                    <Skeleton className="h-9 w-full" />
                ) : (
                    <Select
                        value={selectedId ?? undefined}
                        onValueChange={onSelect}
                    >
                        <SelectTrigger id="workflow-select" className="w-full">
                            <SelectValue placeholder="Select a workflow..." />
                        </SelectTrigger>
                        <SelectContent>
                            {workflows?.map((w) => (
                                <SelectItem key={w.id} value={w.id}>
                                    {w.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {selectedId && (
                <>
                    <Separator />

                    {loadingMetadata ? (
                        <div className="flex flex-col gap-3">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    ) : metadata ? (
                        <div className="flex flex-col gap-4">
                            <div>
                                <h3 className="text-base font-semibold">
                                    {metadata.name}
                                </h3>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    {metadata.description}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">
                                    {metadata.slides.length} slide
                                    {metadata.slides.length !== 1 ? 's' : ''}
                                </Badge>
                                <Badge variant="secondary">
                                    {metadata.slides.reduce(
                                        (sum, s) => sum + s.markers.length,
                                        0,
                                    )}{' '}
                                    markers
                                </Badge>
                                <Badge variant="secondary">
                                    {metadata.dataSources.length} data source
                                    {metadata.dataSources.length !== 1
                                        ? 's'
                                        : ''}
                                </Badge>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={`/api/workflow-template/${selectedId}`}
                                        download
                                    >
                                        <Presentation className="size-4" />
                                        Download Template
                                        <Download className="size-3" />
                                    </a>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={`/api/workflow-metadata/${selectedId}`}
                                        download
                                    >
                                        <FileText className="size-4" />
                                        Download Metadata
                                        <Download className="size-3" />
                                    </a>
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </>
            )}

            <div className="flex justify-end">
                <Button onClick={onNext} disabled={!selectedId || !metadata}>
                    Next
                    <ArrowRight className="size-4" />
                </Button>
            </div>
        </div>
    );
}
