'use client';

import type { GenerationResult } from '@/actions/generate';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, CheckCircle2, Download, RotateCcw } from 'lucide-react';

function downloadPptxFromBase64(filename: string, fileBase64: string): void {
    const binary = atob(fileBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });
    const blobUrl = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

interface GenerationStepProps {
    isGenerating: boolean;
    result: GenerationResult | null;
    error: Error | null;
    onRetry: () => void;
    onReset: () => void;
}

export function GenerationStep({
    isGenerating,
    result,
    error,
    onRetry,
    onReset,
}: GenerationStepProps) {
    if (isGenerating) {
        return (
            <div className="flex flex-col items-center gap-4 py-12">
                <Spinner className="size-8 text-primary" />
                <div className="text-center">
                    <p className="text-base font-medium">
                        Generating presentation...
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                        AI is writing content for each slide. This may take a
                        minute.
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center gap-4 py-12">
                <AlertCircle className="text-destructive size-8" />
                <div className="text-center">
                    <p className="text-base font-medium">Generation failed</p>
                    <p className="text-muted-foreground mt-1 max-w-md text-sm">
                        {error.message}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={onReset}>
                        <RotateCcw className="size-4" />
                        Start Over
                    </Button>
                    <Button onClick={onRetry}>Retry</Button>
                </div>
            </div>
        );
    }

    if (result) {
        return (
            <div className="flex flex-col items-center gap-4 py-12">
                <CheckCircle2 className="size-8 text-green-600" />
                <div className="text-center">
                    <p className="text-base font-medium">
                        Presentation generated
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Your slides are ready to download.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={onReset}>
                        <RotateCcw className="size-4" />
                        Start Over
                    </Button>
                    <Button
                        type="button"
                        onClick={() =>
                            downloadPptxFromBase64(
                                result.filename,
                                result.fileBase64,
                            )
                        }
                    >
                        <Download className="size-4" />
                        Download PPTX
                    </Button>
                </div>
            </div>
        );
    }

    return null;
}
