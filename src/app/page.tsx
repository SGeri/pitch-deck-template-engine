'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    useGeneratePresentation,
    useWorkflowMetadata,
} from '@/hooks/use-workflows';
import type { DataSourceInput } from '@/lib/workflows/types';
import { Presentation } from 'lucide-react';
import { useState } from 'react';

import { DataSourcesStep } from '../components/data-sources-step';
import { GenerationStep } from '../components/generation-step';
import { ReviewStep } from '../components/review-step';
import { WorkflowSelector } from '../components/workflow-selector';

const STEPS = [
    'Select Workflow',
    'Data Sources',
    'Review',
    'Generate',
] as const;

export default function HomePage() {
    const [step, setStep] = useState(0);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
        null,
    );
    const [dataSources, setDataSources] = useState<DataSourceInput[]>([]);

    const { data: metadata } = useWorkflowMetadata(selectedWorkflowId);
    const generation = useGeneratePresentation();

    const handleConfirmGenerate = () => {
        if (!selectedWorkflowId) return;
        setStep(3);
        generation.mutate({
            workflowId: selectedWorkflowId,
            dataSources,
        });
    };

    const handleRetry = () => {
        if (!selectedWorkflowId) return;
        generation.mutate({
            workflowId: selectedWorkflowId,
            dataSources,
        });
    };

    const handleReset = () => {
        setStep(0);
        setSelectedWorkflowId(null);
        setDataSources([]);
        generation.reset();
    };

    return (
        <div className="flex min-h-svh items-start justify-center bg-background p-6 pt-12 md:pt-20">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <Presentation className="size-5" />
                        </div>
                        <div>
                            <CardTitle>Slides Generator</CardTitle>
                            <CardDescription>
                                AI-powered presentation builder
                            </CardDescription>
                        </div>
                    </div>

                    <StepIndicator currentStep={step} />
                </CardHeader>

                <CardContent>
                    {step === 0 && (
                        <WorkflowSelector
                            selectedId={selectedWorkflowId}
                            onSelect={(id) => {
                                setSelectedWorkflowId(id);
                                setDataSources([]);
                                generation.reset();
                            }}
                            onNext={() => setStep(1)}
                        />
                    )}

                    {step === 1 && metadata && (
                        <DataSourcesStep
                            definitions={metadata.dataSources}
                            initialValues={dataSources}
                            onBack={() => setStep(0)}
                            onNext={(ds) => {
                                setDataSources(ds);
                                setStep(2);
                            }}
                        />
                    )}

                    {step === 2 && metadata && (
                        <ReviewStep
                            metadata={metadata}
                            dataSources={dataSources}
                            onBack={() => setStep(1)}
                            onConfirm={handleConfirmGenerate}
                            isGenerating={generation.isPending}
                        />
                    )}

                    {step === 3 && (
                        <GenerationStep
                            isGenerating={generation.isPending}
                            result={generation.data ?? null}
                            error={generation.error}
                            onRetry={handleRetry}
                            onReset={handleReset}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function StepIndicator({ currentStep }: { currentStep: number }) {
    return (
        <div className="mt-4 flex gap-1">
            {STEPS.map((label, index) => (
                <div key={label} className="flex flex-1 flex-col gap-1">
                    <div
                        className={`h-1 rounded-full transition-colors ${
                            index <= currentStep ? 'bg-primary' : 'bg-muted'
                        }`}
                    />
                    <span
                        className={`text-xs ${
                            index <= currentStep
                                ? 'text-foreground font-medium'
                                : 'text-muted-foreground'
                        }`}
                    >
                        {label}
                    </span>
                </div>
            ))}
        </div>
    );
}
