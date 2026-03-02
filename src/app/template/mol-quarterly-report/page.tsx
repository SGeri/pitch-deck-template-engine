'use client';

import type { GenerationResult } from '@/actions/generate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import Sidebar from '@/components/Sidebar';
import {
    useGeneratePresentation,
    useWorkflowMetadata,
} from '@/hooks/use-workflows';
import type { DataSourceInput } from '@/lib/workflows/types';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    AlertCircle,
    CheckCircle2,
    Download,
    FileText,
    FileUp,
    Plus,
    Presentation,
    RotateCcw,
    Sparkles,
    Trash2,
    Type,
} from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

const WORKFLOW_ID = 'mol-quarterly';
const ACCEPTED_FILE_EXTENSIONS = '.txt,.pdf,.xlsx,.docx';

const dataSourceEntrySchema = z
    .object({
        type: z.enum(['textarea', 'file']),
        content: z.string(),
        fileName: z.string().optional(),
    })
    .refine((val) => val.content.trim().length > 0, {
        message: 'Content is required.',
        path: ['content'],
    });

const formSchema = z.object({
    dataSources: z
        .array(dataSourceEntrySchema)
        .min(1, 'Add at least one data source.'),
});

type FormValues = z.infer<typeof formSchema>;

function toId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toDataSourceInputs(values: FormValues): DataSourceInput[] {
    return values.dataSources.map((ds) => ({
        id: toId(),
        type: ds.type,
        content: ds.content,
        fileName: ds.fileName,
    }));
}

async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    setValue: (
        name:
            | `dataSources.${number}.content`
            | `dataSources.${number}.fileName`,
        value: string,
    ) => void,
) {
    const file = e.target.files?.[0];
    if (!file) return;

    setValue(`dataSources.${index}.fileName`, file.name);

    if (file.name.endsWith('.txt')) {
        const text = await file.text();
        setValue(`dataSources.${index}.content`, text);
        return;
    }

    const buffer = await file.arrayBuffer();
    const base64 = btoa(
        new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            '',
        ),
    );
    setValue(`dataSources.${index}.content`, base64);
}

export default function MolQuarterlyReportPage() {
    const { data: metadata, isLoading: loadingMetadata } =
        useWorkflowMetadata(WORKFLOW_ID);
    const generation = useGeneratePresentation();

    const {
        register,
        control,
        handleSubmit,
        setValue,
        reset: resetForm,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            dataSources: [
                { type: 'textarea' as const, content: '', fileName: undefined },
            ],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'dataSources',
    });

    const watchedSources = useWatch({ control, name: 'dataSources' });

    const onSubmit = (data: FormValues) => {
        generation.mutate({
            workflowId: WORKFLOW_ID,
            dataSources: toDataSourceInputs(data),
        });
    };

    const handleReset = () => {
        generation.reset();
        resetForm({
            dataSources: [
                { type: 'textarea', content: '', fileName: undefined },
            ],
        });
    };

    const handleRetry = () => {
        const currentSources = toDataSourceInputs({
            dataSources: watchedSources.map((s) => ({
                type: s.type,
                content: s.content,
                fileName: s.fileName,
            })),
        });
        generation.mutate({
            workflowId: WORKFLOW_ID,
            dataSources: currentSources,
        });
    };

    return (
        <div className="flex h-screen bg-[#FAFAFA]">
            <Sidebar />

            <main className="ml-16 flex-1 overflow-auto px-8 py-8">
                <div className="mx-auto max-w-2xl">
                    <div className="mb-8">
                        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
                            Generate Presentation
                        </h1>
                        <p className="mt-1 text-[var(--text-secondary)]">
                            Configure and generate your AI-powered slide deck
                        </p>
                    </div>

                    {/* Workflow Info */}
                    <section className="mb-6 rounded-xl border border-[var(--border-default)] bg-white p-6">
                        {loadingMetadata ? (
                            <div className="flex flex-col gap-3">
                                <Skeleton className="h-5 w-48" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        ) : metadata ? (
                            <div className="flex flex-col gap-4">
                                <div>
                                    <h2 className="text-base font-semibold text-[var(--text-primary)]">
                                        {metadata.name}
                                    </h2>
                                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                        {metadata.description}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary">
                                        {metadata.slides.length} slide
                                        {metadata.slides.length !== 1
                                            ? 's'
                                            : ''}
                                    </Badge>
                                    <Badge variant="secondary">
                                        {metadata.slides.reduce(
                                            (sum, s) => sum + s.markers.length,
                                            0,
                                        )}{' '}
                                        markers
                                    </Badge>
                                    <Badge variant="secondary">
                                        {metadata.dataSources.length} data
                                        source
                                        {metadata.dataSources.length !== 1
                                            ? 's'
                                            : ''}
                                    </Badge>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                    >
                                        <a
                                            href={`/api/workflow-template/${WORKFLOW_ID}`}
                                            download
                                        >
                                            <Presentation className="size-4" />
                                            Download Template
                                            <Download className="size-3" />
                                        </a>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                    >
                                        <a
                                            href={`/api/workflow-metadata/${WORKFLOW_ID}`}
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
                    </section>

                    {/* Data Sources + Generate */}
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <section className="mb-6 rounded-xl border border-[var(--border-default)] bg-white p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                                        Data Sources
                                    </h2>
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        Provide the content the AI will use to
                                        generate slides.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={generation.isPending}
                                    onClick={() =>
                                        append({
                                            type: 'textarea',
                                            content: '',
                                            fileName: undefined,
                                        })
                                    }
                                >
                                    <Plus className="size-4" />
                                    Add Source
                                </Button>
                            </div>

                            {errors.dataSources?.root && (
                                <p className="mb-4 text-xs text-destructive">
                                    {errors.dataSources.root.message}
                                </p>
                            )}

                            <div className="flex flex-col gap-4">
                                {fields.map((field, index) => {
                                    const currentType =
                                        watchedSources?.[index]?.type ??
                                        'textarea';
                                    const currentFileName =
                                        watchedSources?.[index]?.fileName;

                                    return (
                                        <div
                                            key={field.id}
                                            className="rounded-lg border border-[var(--border-default)] bg-[var(--slate-50)] p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex flex-1 flex-col gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium text-[var(--text-tertiary)]">
                                                            #{index + 1}
                                                        </span>
                                                        <Select
                                                            value={currentType}
                                                            onValueChange={(
                                                                val:
                                                                    | 'textarea'
                                                                    | 'file',
                                                            ) => {
                                                                setValue(
                                                                    `dataSources.${index}.type`,
                                                                    val,
                                                                );
                                                                setValue(
                                                                    `dataSources.${index}.content`,
                                                                    '',
                                                                );
                                                                setValue(
                                                                    `dataSources.${index}.fileName`,
                                                                    undefined,
                                                                );
                                                            }}
                                                            disabled={
                                                                generation.isPending
                                                            }
                                                        >
                                                            <SelectTrigger className="w-40">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="textarea">
                                                                    <Type className="mr-1.5 inline size-3.5" />
                                                                    Text Input
                                                                </SelectItem>
                                                                <SelectItem value="file">
                                                                    <FileUp className="mr-1.5 inline size-3.5" />
                                                                    File Upload
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {currentType ===
                                                    'textarea' ? (
                                                        <Textarea
                                                            rows={6}
                                                            placeholder="Paste your content here..."
                                                            disabled={
                                                                generation.isPending
                                                            }
                                                            {...register(
                                                                `dataSources.${index}.content`,
                                                            )}
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col gap-2">
                                                            <Input
                                                                type="file"
                                                                accept={
                                                                    ACCEPTED_FILE_EXTENSIONS
                                                                }
                                                                className="cursor-pointer"
                                                                disabled={
                                                                    generation.isPending
                                                                }
                                                                onChange={(e) =>
                                                                    handleFileChange(
                                                                        e,
                                                                        index,
                                                                        setValue,
                                                                    )
                                                                }
                                                            />
                                                            {currentFileName && (
                                                                <p className="text-xs text-[var(--text-tertiary)]">
                                                                    Loaded:{' '}
                                                                    {
                                                                        currentFileName
                                                                    }
                                                                </p>
                                                            )}
                                                            <p className="text-xs text-[var(--text-tertiary)]">
                                                                Supported: .txt
                                                                (other formats
                                                                coming soon)
                                                            </p>
                                                        </div>
                                                    )}

                                                    {errors.dataSources?.[index]
                                                        ?.content && (
                                                        <p className="text-xs text-destructive">
                                                            {
                                                                errors
                                                                    .dataSources[
                                                                    index
                                                                ].content
                                                                    .message
                                                            }
                                                        </p>
                                                    )}
                                                </div>

                                                {fields.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="shrink-0 text-[var(--text-tertiary)] hover:text-destructive"
                                                        disabled={
                                                            generation.isPending
                                                        }
                                                        onClick={() =>
                                                            remove(index)
                                                        }
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Generation Status */}
                        <GenerationStatus
                            isPending={generation.isPending}
                            result={generation.data ?? null}
                            error={generation.error}
                            onRetry={handleRetry}
                            onReset={handleReset}
                        />

                        {/* Generate Button */}
                        {!generation.isPending && !generation.data && (
                            <div className="flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={!metadata}
                                    className="bg-[var(--mol-red)] hover:bg-[var(--mol-red-hover)]"
                                >
                                    <Sparkles className="size-4" />
                                    Generate Presentation
                                </Button>
                            </div>
                        )}
                    </form>
                </div>
            </main>
        </div>
    );
}

function GenerationStatus({
    isPending,
    result,
    error,
    onRetry,
    onReset,
}: {
    isPending: boolean;
    result: GenerationResult | null;
    error: Error | null;
    onRetry: () => void;
    onReset: () => void;
}) {
    if (!isPending && !result && !error) return null;

    return (
        <section className="mb-6 rounded-xl border border-[var(--border-default)] bg-white p-6">
            {isPending && (
                <div className="flex flex-col items-center gap-4 py-6">
                    <Spinner className="size-8 text-[var(--mol-red)]" />
                    <div className="text-center">
                        <p className="text-base font-medium text-[var(--text-primary)]">
                            Generating presentation...
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                            AI is writing content for each slide. This may take a
                            minute.
                        </p>
                    </div>
                </div>
            )}

            {error && !isPending && (
                <div className="flex flex-col items-center gap-4 py-6">
                    <AlertCircle className="size-8 text-destructive" />
                    <div className="text-center">
                        <p className="text-base font-medium text-[var(--text-primary)]">
                            Generation failed
                        </p>
                        <p className="mt-1 max-w-md text-sm text-[var(--text-secondary)]">
                            {error.message}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onReset}>
                            <RotateCcw className="size-4" />
                            Start Over
                        </Button>
                        <Button
                            onClick={onRetry}
                            className="bg-[var(--mol-red)] hover:bg-[var(--mol-red-hover)]"
                        >
                            Retry
                        </Button>
                    </div>
                </div>
            )}

            {result && !isPending && (
                <div className="flex flex-col items-center gap-4 py-6">
                    <CheckCircle2 className="size-8 text-green-600" />
                    <div className="text-center">
                        <p className="text-base font-medium text-[var(--text-primary)]">
                            Presentation generated
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                            Your slides are ready to download.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onReset}>
                            <RotateCcw className="size-4" />
                            Start Over
                        </Button>
                        <Button
                            asChild
                            className="bg-[var(--mol-red)] hover:bg-[var(--mol-red-hover)]"
                        >
                            <a href={result.downloadUrl} download>
                                <Download className="size-4" />
                                Download PPTX
                            </a>
                        </Button>
                    </div>
                </div>
            )}
        </section>
    );
}
