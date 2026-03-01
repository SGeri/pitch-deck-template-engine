'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { DataSourceInput, WorkflowMetadata } from '@/lib/workflows/types';
import { ArrowLeft, FileText, Sparkles, Type } from 'lucide-react';

interface ReviewStepProps {
    metadata: WorkflowMetadata;
    dataSources: DataSourceInput[];
    onBack: () => void;
    onConfirm: () => void;
    isGenerating: boolean;
}

const MAX_PREVIEW_LENGTH = 300;

export function ReviewStep({
    metadata,
    dataSources,
    onBack,
    onConfirm,
    isGenerating,
}: ReviewStepProps) {
    const totalMarkers = metadata.slides.reduce(
        (sum, s) => sum + s.markers.length,
        0,
    );

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <h3 className="text-base font-semibold">{metadata.name}</h3>
                <p className="text-muted-foreground text-sm">
                    {metadata.slides.length} slides, {totalMarkers} AI-generated
                    fields
                </p>
            </div>

            <Separator />

            <div className="flex flex-col gap-4">
                <h4 className="text-sm font-medium">
                    Data Sources ({dataSources.length})
                </h4>
                {dataSources.map((ds, index) => {
                    const isFile = ds.type === 'file';
                    const preview = isFile
                        ? `File: ${ds.fileName ?? 'unknown'}`
                        : ds.content.length > MAX_PREVIEW_LENGTH
                          ? `${ds.content.slice(0, MAX_PREVIEW_LENGTH)}...`
                          : ds.content;

                    return (
                        <div
                            key={ds.id}
                            className="flex flex-col gap-1.5"
                        >
                            <div className="flex items-center gap-2">
                                {isFile ? (
                                    <FileText className="text-muted-foreground size-3.5" />
                                ) : (
                                    <Type className="text-muted-foreground size-3.5" />
                                )}
                                <span className="text-sm font-medium">
                                    Source #{index + 1}
                                </span>
                                <Badge variant="outline">
                                    {isFile ? ds.fileName ?? 'file' : 'text'}
                                </Badge>
                            </div>
                            <pre className="bg-muted text-muted-foreground max-h-40 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
                                {preview}
                            </pre>
                        </div>
                    );
                })}
            </div>

            <Separator />

            <div className="flex justify-between">
                <Button
                    variant="outline"
                    onClick={onBack}
                    disabled={isGenerating}
                >
                    <ArrowLeft className="size-4" />
                    Back
                </Button>
                <Button onClick={onConfirm} disabled={isGenerating}>
                    <Sparkles className="size-4" />
                    {isGenerating ? 'Generating...' : 'Generate Presentation'}
                </Button>
            </div>
        </div>
    );
}
