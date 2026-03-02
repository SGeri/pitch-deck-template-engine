'use client';

import type { GenerationResult } from '@/actions/generate';
import Sidebar from '@/components/Sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
import {
    useGeneratePresentation,
    useWorkflowMetadata,
} from '@/hooks/use-workflows';
import type { DataSourceInput } from '@/lib/workflows/types';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    AlertCircle,
    ArrowDown,
    ArrowUp,
    Building2,
    CheckCircle2,
    Cloud,
    Download,
    FileText,
    FileUp,
    FolderOpen,
    Plus,
    Presentation,
    RotateCcw,
    Sparkles,
    Trash2,
    Type,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    type UseFormSetValue,
    useFieldArray,
    useForm,
    useWatch,
} from 'react-hook-form';
import { z } from 'zod';

const WORKFLOW_ID = 'mol-quarterly';
const ACCEPTED_FILE_EXTENSIONS = '.txt,.pdf,.xlsx,.docx';
const DEFAULT_GENERATION_DURATION_MS = 3 * 60 * 1000;

type CloudProvider = 'office' | 'onedrive' | 'sharepoint';

interface CloudSource {
    id: string;
    provider: CloudProvider;
    name: string;
}

const cloudSourceSchema = z.object({
    id: z.string(),
    provider: z.enum(['office', 'onedrive', 'sharepoint']),
    name: z.string().trim().min(1, 'Source name is required.'),
});

const dataSourceEntrySchema = z
    .object({
        type: z.enum(['textarea', 'file', 'cloud']),
        content: z.string(),
        fileName: z.string().optional(),
        fileSize: z.number().optional(),
        cloudSources: z.array(cloudSourceSchema).optional(),
    })
    .superRefine((val, ctx) => {
        if (val.type === 'cloud' && (val.cloudSources?.length ?? 0) === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Add at least one cloud source.',
                path: ['cloudSources'],
            });
            return;
        }

        if (val.type !== 'cloud' && val.content.trim().length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Content is required.',
                path: ['content'],
            });
        }
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

function getFileExtension(fileName: string): string {
    const dot = fileName.lastIndexOf('.');
    return dot >= 0 ? fileName.slice(dot).toLowerCase() : '';
}

function getCloudProviderLabel(provider: CloudProvider): string {
    switch (provider) {
        case 'office':
            return 'Office Cloud';
        case 'onedrive':
            return 'OneDrive';
        case 'sharepoint':
            return 'SharePoint';
    }
}

function getDefaultCloudSource(
    provider: CloudProvider = 'office',
): CloudSource {
    return {
        id: toId(),
        provider,
        name: '',
    };
}

function serializeCloudSources(sources: CloudSource[]): string {
    return sources
        .map(
            (source) =>
                `${getCloudProviderLabel(source.provider)}: ${
                    source.name || 'Browse from company cloud'
                }`,
        )
        .join('\n');
}

async function readFileContent(file: File): Promise<string> {
    if (file.name.endsWith('.txt')) {
        return file.text();
    }

    const buffer = await file.arrayBuffer();
    return btoa(
        new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            '',
        ),
    );
}

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

function toDataSourceInputs(values: FormValues): DataSourceInput[] {
    return values.dataSources.map((ds) => ({
        id: toId(),
        type: ds.type === 'cloud' ? 'textarea' : ds.type,
        content:
            ds.type === 'cloud'
                ? serializeCloudSources(ds.cloudSources ?? [])
                : ds.content,
        fileName: ds.fileName,
    }));
}

async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    setValue: UseFormSetValue<FormValues>,
) {
    const file = e.target.files?.[0];
    if (!file) return;

    setValue(`dataSources.${index}.fileName`, file.name);
    setValue(`dataSources.${index}.fileSize`, file.size);
    setValue(`dataSources.${index}.content`, await readFileContent(file));
}

export default function MolQuarterlyReportPage() {
    const { data: metadata, isLoading: loadingMetadata } =
        useWorkflowMetadata(WORKFLOW_ID);
    const generation = useGeneratePresentation();
    const [activeCloudSourceIndex, setActiveCloudSourceIndex] = useState<
        number | null
    >(null);
    const droppedFilesRef = useRef<Map<string, File>>(new Map());

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
            dataSources: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'dataSources',
    });

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            if (acceptedFiles.length === 0) return;

            const droppedSources = await Promise.all(
                acceptedFiles.map(async (file) => ({
                    type: 'file' as const,
                    content: await readFileContent(file),
                    fileName: file.name,
                    fileSize: file.size,
                    cloudSources: [],
                })),
            );

            acceptedFiles.forEach((file) => {
                droppedFilesRef.current.set(`${file.name}:${file.size}`, file);
            });
            append(droppedSources);
        },
        [append],
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: true,
        disabled: generation.isPending,
        accept: {
            'text/plain': ['.txt'],
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                ['.xlsx'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                ['.docx'],
        },
    });

    const watchedSources = useWatch({ control, name: 'dataSources' });
    const activeCloudSources =
        activeCloudSourceIndex !== null
            ? (watchedSources?.[activeCloudSourceIndex]?.cloudSources ?? [])
            : [];

    const updateActiveCloudSources = useCallback(
        (sources: CloudSource[]) => {
            if (activeCloudSourceIndex === null) return;

            setValue(
                `dataSources.${activeCloudSourceIndex}.cloudSources`,
                sources,
                {
                    shouldValidate: true,
                },
            );
            setValue(
                `dataSources.${activeCloudSourceIndex}.content`,
                serializeCloudSources(sources),
                { shouldValidate: true },
            );
        },
        [activeCloudSourceIndex, setValue],
    );

    const onSubmit = (data: FormValues) => {
        generation.mutate({
            workflowId: WORKFLOW_ID,
            dataSources: toDataSourceInputs(data),
        });
    };

    const handleReset = () => {
        generation.reset();
        resetForm({
            dataSources: [],
        });
        setActiveCloudSourceIndex(null);
    };

    const handleRetry = () => {
        const currentSources = toDataSourceInputs({
            dataSources: watchedSources.map((s) => ({
                type: s.type,
                content: s.content,
                fileName: s.fileName,
                fileSize: s.fileSize,
                cloudSources: s.cloudSources,
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
                                    <Button variant="outline" size="sm" asChild>
                                        <a
                                            href={`/api/workflow-template/${WORKFLOW_ID}`}
                                            download
                                        >
                                            <Presentation className="size-4" />
                                            Download Template
                                            <Download className="size-3" />
                                        </a>
                                    </Button>
                                    <Button variant="outline" size="sm" asChild>
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
                                            fileSize: undefined,
                                            cloudSources: [],
                                        })
                                    }
                                >
                                    <Plus className="size-4" />
                                    Add Source
                                </Button>
                            </div>

                            <div
                                {...getRootProps()}
                                className={`mb-4 rounded-lg border border-dashed p-4 transition-colors ${
                                    isDragActive
                                        ? 'border-[var(--mol-red)] bg-red-50'
                                        : 'border-[var(--border-default)] bg-[var(--slate-50)]'
                                } ${
                                    generation.isPending
                                        ? 'cursor-not-allowed opacity-60'
                                        : 'cursor-pointer'
                                }`}
                            >
                                <input {...getInputProps()} />
                                <div className="flex items-center gap-3">
                                    <FileUp className="size-4 text-[var(--text-tertiary)]" />
                                    <div>
                                        <p className="text-sm text-[var(--text-primary)]">
                                            {isDragActive
                                                ? 'Drop files to add them as data sources.'
                                                : 'Drop files here, or click to upload.'}
                                        </p>
                                        <p className="text-xs text-[var(--text-tertiary)]">
                                            Unlimited files. Supported: .txt,
                                            .pdf, .xlsx, .docx
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {errors.dataSources?.root && (
                                <p className="mb-4 text-xs text-destructive">
                                    {errors.dataSources.root.message}
                                </p>
                            )}

                            <div className="flex flex-col gap-4">
                                {fields.length === 0 && (
                                    <div className="rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--slate-50)] p-6 text-center">
                                        <p className="text-sm font-medium text-[var(--text-primary)]">
                                            No data sources added yet
                                        </p>
                                        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                                            Upload files in the dropzone above
                                            or add a source to get started.
                                        </p>
                                        <div className="mt-4 flex justify-center">
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
                                                        fileSize: undefined,
                                                        cloudSources: [],
                                                    })
                                                }
                                            >
                                                <Plus className="size-4" />
                                                Add first source
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {fields.map((field, index) => {
                                    const currentType =
                                        watchedSources?.[index]?.type ??
                                        field.type ??
                                        'textarea';
                                    const currentFileName =
                                        watchedSources?.[index]?.fileName ??
                                        field.fileName;
                                    const currentFileSize =
                                        watchedSources?.[index]?.fileSize ??
                                        field.fileSize;
                                    const currentCloudSources =
                                        watchedSources?.[index]?.cloudSources ??
                                        field.cloudSources ??
                                        [];

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
                                                                    | 'file'
                                                                    | 'cloud',
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
                                                                setValue(
                                                                    `dataSources.${index}.fileSize`,
                                                                    undefined,
                                                                );
                                                                setValue(
                                                                    `dataSources.${index}.cloudSources`,
                                                                    [],
                                                                );

                                                                if (
                                                                    val ===
                                                                    'cloud'
                                                                ) {
                                                                    const defaultSources =
                                                                        [
                                                                            getDefaultCloudSource(
                                                                                'office',
                                                                            ),
                                                                        ];
                                                                    setValue(
                                                                        `dataSources.${index}.cloudSources`,
                                                                        defaultSources,
                                                                    );
                                                                    setValue(
                                                                        `dataSources.${index}.content`,
                                                                        serializeCloudSources(
                                                                            defaultSources,
                                                                        ),
                                                                    );
                                                                    setActiveCloudSourceIndex(
                                                                        index,
                                                                    );
                                                                }
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
                                                                <SelectItem value="cloud">
                                                                    <Cloud className="mr-1.5 inline size-3.5" />
                                                                    Cloud Source
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
                                                    ) : currentType ===
                                                      'file' ? (
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
                                                                ref={(node) => {
                                                                    if (
                                                                        !node ||
                                                                        !currentFileName ||
                                                                        currentFileSize ===
                                                                            undefined
                                                                    ) {
                                                                        return;
                                                                    }

                                                                    const droppedFile =
                                                                        droppedFilesRef.current.get(
                                                                            `${currentFileName}:${currentFileSize}`,
                                                                        );
                                                                    if (
                                                                        !droppedFile
                                                                    ) {
                                                                        return;
                                                                    }

                                                                    const fileSetter =
                                                                        Object.getOwnPropertyDescriptor(
                                                                            HTMLInputElement.prototype,
                                                                            'files',
                                                                        )?.set;
                                                                    if (
                                                                        !fileSetter
                                                                    ) {
                                                                        return;
                                                                    }

                                                                    const transfer =
                                                                        new DataTransfer();
                                                                    transfer.items.add(
                                                                        droppedFile,
                                                                    );
                                                                    fileSetter.call(
                                                                        node,
                                                                        transfer.files,
                                                                    );
                                                                }}
                                                                onChange={(e) =>
                                                                    handleFileChange(
                                                                        e,
                                                                        index,
                                                                        setValue,
                                                                    )
                                                                }
                                                            />
                                                            {currentFileName && (
                                                                <div className="flex items-center gap-2">
                                                                    <FileText className="size-3.5 text-[var(--text-tertiary)]" />
                                                                    <span className="text-xs text-[var(--text-tertiary)]">
                                                                        {
                                                                            currentFileName
                                                                        }
                                                                    </span>
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-[10px] px-1.5 py-0"
                                                                    >
                                                                        {getFileExtension(
                                                                            currentFileName,
                                                                        )}
                                                                    </Badge>
                                                                </div>
                                                            )}
                                                            <p className="text-xs text-[var(--text-tertiary)]">
                                                                Supported: .txt,
                                                                .pdf, .xlsx,
                                                                .docx
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="rounded-md border border-[var(--border-default)] bg-white p-3">
                                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                                <div>
                                                                    <p className="text-sm font-medium text-[var(--text-primary)]">
                                                                        Cloud
                                                                        document
                                                                        sources
                                                                    </p>
                                                                    <p className="text-xs text-[var(--text-tertiary)]">
                                                                        Mock
                                                                        Microsoft
                                                                        cloud
                                                                        connectors
                                                                        for demo
                                                                        mode.
                                                                    </p>
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled={
                                                                        generation.isPending
                                                                    }
                                                                    onClick={() =>
                                                                        setActiveCloudSourceIndex(
                                                                            index,
                                                                        )
                                                                    }
                                                                >
                                                                    Manage
                                                                </Button>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {(
                                                                    watchedSources?.[
                                                                        index
                                                                    ]
                                                                        ?.cloudSources ??
                                                                    currentCloudSources
                                                                ).length ===
                                                                0 ? (
                                                                    <span className="text-xs text-[var(--text-tertiary)]">
                                                                        No cloud
                                                                        sources
                                                                        selected
                                                                        yet.
                                                                    </span>
                                                                ) : (
                                                                    (
                                                                        watchedSources?.[
                                                                            index
                                                                        ]
                                                                            ?.cloudSources ??
                                                                        currentCloudSources
                                                                    ).map(
                                                                        (
                                                                            source,
                                                                        ) => (
                                                                            <Badge
                                                                                key={
                                                                                    source.id
                                                                                }
                                                                                variant="secondary"
                                                                                className="gap-1.5"
                                                                            >
                                                                                <CloudProviderIcon
                                                                                    provider={
                                                                                        source.provider
                                                                                    }
                                                                                    className="size-3.5"
                                                                                />
                                                                                {
                                                                                    source.name
                                                                                }
                                                                            </Badge>
                                                                        ),
                                                                    )
                                                                )}
                                                            </div>
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

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="shrink-0 text-[var(--text-tertiary)] hover:text-destructive"
                                                    disabled={
                                                        generation.isPending
                                                    }
                                                    onClick={() => {
                                                        if (
                                                            activeCloudSourceIndex ===
                                                            index
                                                        ) {
                                                            setActiveCloudSourceIndex(
                                                                null,
                                                            );
                                                        } else if (
                                                            activeCloudSourceIndex !==
                                                                null &&
                                                            activeCloudSourceIndex >
                                                                index
                                                        ) {
                                                            setActiveCloudSourceIndex(
                                                                activeCloudSourceIndex -
                                                                    1,
                                                            );
                                                        }
                                                        remove(index);
                                                    }}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <Dialog
                            open={activeCloudSourceIndex !== null}
                            onOpenChange={(open) => {
                                if (!open) setActiveCloudSourceIndex(null);
                            }}
                        >
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Cloud source</DialogTitle>
                                    <DialogDescription>
                                        Microsoft Cloud sources. Add, remove,
                                        and sort live connected document sources
                                        from your internal company cloud.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
                                    {activeCloudSources.map(
                                        (source, sourceIndex) => (
                                            <div
                                                key={source.id}
                                                className="rounded-md border border-[var(--border-default)] bg-[var(--slate-50)] p-3"
                                            >
                                                <div className="mb-2 flex items-center justify-between">
                                                    <Badge variant="secondary">
                                                        <CloudProviderIcon
                                                            provider={
                                                                source.provider
                                                            }
                                                            className="mr-1 size-3.5"
                                                        />
                                                        Source #
                                                        {sourceIndex + 1}
                                                    </Badge>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7"
                                                            disabled={
                                                                sourceIndex ===
                                                                0
                                                            }
                                                            onClick={() => {
                                                                const next = [
                                                                    ...activeCloudSources,
                                                                ];
                                                                [
                                                                    next[
                                                                        sourceIndex -
                                                                            1
                                                                    ],
                                                                    next[
                                                                        sourceIndex
                                                                    ],
                                                                ] = [
                                                                    next[
                                                                        sourceIndex
                                                                    ],
                                                                    next[
                                                                        sourceIndex -
                                                                            1
                                                                    ],
                                                                ];
                                                                updateActiveCloudSources(
                                                                    next,
                                                                );
                                                            }}
                                                        >
                                                            <ArrowUp className="size-3.5" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7"
                                                            disabled={
                                                                sourceIndex ===
                                                                activeCloudSources.length -
                                                                    1
                                                            }
                                                            onClick={() => {
                                                                const next = [
                                                                    ...activeCloudSources,
                                                                ];
                                                                [
                                                                    next[
                                                                        sourceIndex
                                                                    ],
                                                                    next[
                                                                        sourceIndex +
                                                                            1
                                                                    ],
                                                                ] = [
                                                                    next[
                                                                        sourceIndex +
                                                                            1
                                                                    ],
                                                                    next[
                                                                        sourceIndex
                                                                    ],
                                                                ];
                                                                updateActiveCloudSources(
                                                                    next,
                                                                );
                                                            }}
                                                        >
                                                            <ArrowDown className="size-3.5" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7 text-[var(--text-tertiary)] hover:text-destructive"
                                                            onClick={() => {
                                                                updateActiveCloudSources(
                                                                    activeCloudSources.filter(
                                                                        (s) =>
                                                                            s.id !==
                                                                            source.id,
                                                                    ),
                                                                );
                                                            }}
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-[160px_1fr] gap-2">
                                                    <Select
                                                        value={source.provider}
                                                        onValueChange={(
                                                            provider: CloudProvider,
                                                        ) => {
                                                            updateActiveCloudSources(
                                                                activeCloudSources.map(
                                                                    (s) =>
                                                                        s.id ===
                                                                        source.id
                                                                            ? {
                                                                                  ...s,
                                                                                  provider,
                                                                              }
                                                                            : s,
                                                                ),
                                                            );
                                                        }}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="office">
                                                                <FileText className="mr-1.5 inline size-3.5" />
                                                                Office
                                                            </SelectItem>
                                                            <SelectItem value="onedrive">
                                                                <FolderOpen className="mr-1.5 inline size-3.5" />
                                                                OneDrive
                                                            </SelectItem>
                                                            <SelectItem value="sharepoint">
                                                                <Building2 className="mr-1.5 inline size-3.5" />
                                                                SharePoint
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="justify-start"
                                                        onClick={() => {
                                                            updateActiveCloudSources(
                                                                activeCloudSources.map(
                                                                    (s) =>
                                                                        s.id ===
                                                                        source.id
                                                                            ? {
                                                                                  ...s,
                                                                                  name: 'Selected from company cloud',
                                                                              }
                                                                            : s,
                                                                ),
                                                            );
                                                        }}
                                                    >
                                                        <FolderOpen className="size-4" />
                                                        Browse Company cloud
                                                    </Button>
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>

                                <DialogFooter className="flex-row items-center justify-between sm:justify-between">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            updateActiveCloudSources([
                                                ...activeCloudSources,
                                                getDefaultCloudSource('office'),
                                            ])
                                        }
                                    >
                                        <Plus className="size-4" />
                                        Add
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() =>
                                            setActiveCloudSourceIndex(null)
                                        }
                                    >
                                        Done
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

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
                                    disabled={!metadata || fields.length === 0}
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

function CloudProviderIcon({
    provider,
    className,
}: {
    provider: CloudProvider;
    className?: string;
}) {
    if (provider === 'onedrive') {
        return <FolderOpen className={className} />;
    }
    if (provider === 'sharepoint') {
        return <Building2 className={className} />;
    }
    return <Cloud className={className} />;
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
    const [progress, setProgress] = useState(0);
    const [elapsedMs, setElapsedMs] = useState(0);

    useEffect(() => {
        if (!isPending) return;

        const startAt = Date.now();

        const timer = window.setInterval(() => {
            const elapsed = Date.now() - startAt;
            const ratio = Math.min(elapsed / DEFAULT_GENERATION_DURATION_MS, 1);
            const eased = 1 - (1 - ratio) ** 2;
            const nextProgress = Math.min(96, 2 + eased * 94);

            setElapsedMs(elapsed);
            setProgress(nextProgress);
        }, 250);

        return () => window.clearInterval(timer);
    }, [isPending]);

    if (!isPending && !result && !error) return null;

    const displayProgress = result
        ? 100
        : isPending
          ? Math.max(progress, 2)
          : 0;
    const displayElapsedMs = isPending ? elapsedMs : 0;
    const remainingMs = Math.max(
        DEFAULT_GENERATION_DURATION_MS - displayElapsedMs,
        0,
    );
    const remainingMinutes = Math.floor(remainingMs / 60000);
    const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
    const stageLabel =
        displayProgress < 30
            ? 'Reading and indexing your sources'
            : displayProgress < 65
              ? 'Drafting and structuring slide content'
              : displayProgress < 90
                ? 'Refining narrative and consistency'
                : 'Finalizing deck output';

    return (
        <section className="mb-6 rounded-xl border border-[var(--border-default)] bg-white p-6">
            {isPending && (
                <div className="space-y-4 py-2">
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-red-50 p-2">
                            <Spinner className="size-5 text-[var(--mol-red)]" />
                        </div>
                        <div className="flex-1">
                            <p className="text-base font-medium text-[var(--text-primary)]">
                                Generating presentation...
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                                {stageLabel}
                            </p>
                        </div>
                        <Badge variant="secondary">
                            {Math.round(displayProgress)}%
                        </Badge>
                    </div>

                    <div className="relative">
                        <Progress
                            value={displayProgress}
                            className="h-2.5 bg-red-100/70 [&_[data-slot=progress-indicator]]:bg-[var(--mol-red)]"
                        />
                        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                            <div className="h-full w-1/3 animate-pulse bg-white/20" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                        <span>Generating presentation...</span>
                        <span>
                            Typical duration about 3:00. ETA {remainingMinutes}:
                            {remainingSeconds.toString().padStart(2, '0')}
                        </span>
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
                            type="button"
                            className="bg-[var(--mol-red)] hover:bg-[var(--mol-red-hover)]"
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
            )}
        </section>
    );
}
