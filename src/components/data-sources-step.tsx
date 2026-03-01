'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import type { DataSourceInput } from '@/lib/workflows/types';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    ArrowLeft,
    ArrowRight,
    FileUp,
    Plus,
    Trash2,
    Type,
} from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

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

interface DataSourcesStepProps {
    initialValues: DataSourceInput[];
    onBack: () => void;
    onNext: (dataSources: DataSourceInput[]) => void;
}

export function DataSourcesStep({
    initialValues,
    onBack,
    onNext,
}: DataSourcesStepProps) {
    const defaultValues: FormValues = {
        dataSources:
            initialValues.length > 0
                ? initialValues.map((v) => ({
                      type: v.type,
                      content: v.content,
                      fileName: v.fileName,
                  }))
                : [
                      {
                          type: 'textarea' as const,
                          content: '',
                          fileName: undefined,
                      },
                  ],
    };

    const {
        register,
        control,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues,
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'dataSources',
    });

    const watchedSources = useWatch({ control, name: 'dataSources' });

    const onSubmit = (data: FormValues) => {
        onNext(toDataSourceInputs(data));
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium">Data Sources</h3>
                    <p className="text-muted-foreground text-xs">
                        Provide the content the AI will use to generate slides.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
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
                <p className="text-destructive text-xs">
                    {errors.dataSources.root.message}
                </p>
            )}

            <div className="flex flex-col gap-4">
                {fields.map((field, index) => {
                    const currentType =
                        watchedSources?.[index]?.type ?? 'textarea';
                    const currentFileName = watchedSources?.[index]?.fileName;

                    return (
                        <div
                            key={field.id}
                            className="rounded-lg border bg-card p-4"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex flex-1 flex-col gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground text-xs font-medium">
                                            #{index + 1}
                                        </span>
                                        <Select
                                            value={currentType}
                                            onValueChange={(
                                                val: 'textarea' | 'file',
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

                                    {currentType === 'textarea' ? (
                                        <Textarea
                                            rows={6}
                                            placeholder="Paste your content here..."
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
                                                onChange={(e) =>
                                                    handleFileChange(
                                                        e,
                                                        index,
                                                        setValue,
                                                    )
                                                }
                                            />
                                            {currentFileName && (
                                                <p className="text-muted-foreground text-xs">
                                                    Loaded: {currentFileName}
                                                </p>
                                            )}
                                            <p className="text-muted-foreground text-xs">
                                                Supported: .txt (other formats
                                                coming soon)
                                            </p>
                                        </div>
                                    )}

                                    {errors.dataSources?.[index]?.content && (
                                        <p className="text-destructive text-xs">
                                            {
                                                errors.dataSources[index]
                                                    .content.message
                                            }
                                        </p>
                                    )}
                                </div>

                                {fields.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-destructive shrink-0"
                                        onClick={() => remove(index)}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Separator />

            <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={onBack}>
                    <ArrowLeft className="size-4" />
                    Back
                </Button>
                <Button type="submit">
                    Next
                    <ArrowRight className="size-4" />
                </Button>
            </div>
        </form>
    );
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

    // For binary formats, read as base64 for future server-side parsing
    const buffer = await file.arrayBuffer();
    const base64 = btoa(
        new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            '',
        ),
    );
    setValue(`dataSources.${index}.content`, base64);
}
