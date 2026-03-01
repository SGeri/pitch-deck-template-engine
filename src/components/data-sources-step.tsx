'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type {
    DataSourceDefinition,
    DataSourceInput,
} from '@/lib/workflows/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useRef } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

// TODO !!!
const DEFAULT_CONTENT = `
MOL GROUP – Q3 2025 RESULTS
CONTEXT UPDATE FOR 4-SLIDE AI TEMPLATE
1. Cover slide – basic info
Quarter: Q3 2025
Year-to-date period covered: Q1–Q3 2025
Official report date: 7 November 2025



2. Executive & financial overview (Clean CCS EBITDA + key segments)
Clean CCS EBITDA headline
Clean CCS EBITDA in Q3 2025 increased by about 15% year-on-year to USD 974 mn.
Subtitle / key driver
Operating cash flow before working capital for the first nine months is above USD 1.8 bn.
Financials – segment highlights
Profit before tax in Q3 2025 is around USD 503 mn, roughly flat versus the same quarter last year.
Clean CCS EBITDA for the quarter rises about 15% YoY to roughly USD 974 mn, driven mostly by refining margins; Q1–Q3 operating cash flow before working capital exceeds USD 1.8 bn.
Upstream EBITDA is broadly stable, with around 3% quarter-on-quarter growth in a largely unchanged external price environment.
Downstream Clean CCS EBITDA grows about 51% YoY to roughly USD 452 mn, supported mainly by significantly wider refining margins (diesel and other products).
Consumer Services EBITDA increases about 28% YoY to around USD 317 mn, helped by a strong driving season and better pricing, especially in Romania and Croatia.
Circular Economy Services EBITDA is negative at about USD -64 mn in Q3, reflecting seasonality, high redemption activity in the deposit-return system and weaker secondary raw material sales.
Operational and other developments – group level
In Kurdistan, developments are positive: the export pipeline to Turkey has reopened and the KM250 gas expansion facility reached completion, enabling higher gas processing capacity at Khor Mor.
MOL plans to change its legal structure to a holding structure; an extraordinary general meeting is scheduled for 27 November 2025 to decide on the changes.
A fire incident occurred at the Danube Refinery on 20 October 2025; one of the three atmospheric vacuum distillation units (AV3) was heavily damaged, while the rest of the refinery remained intact.
Units unaffected by the fire have been restarted; the refinery is expected to run at roughly 50–55% of capacity until AV3 is repaired, implying around 250–300 kt per month of lost crude processing in the interim.

3. TRIR slide – safety KPI
TRIR (Total Recordable Injury Rate) for Q1–Q3 2025 stands at 1.44, above the public full-year guidance level of 1.3.
The deterioration versus the previous year is partly linked to a single significant incident in Pakistan.
There were no injuries associated with the Danube Refinery fire in October.

4. Upstream Operational Update 1 – country inputs
All points below refer to Q3 2025 operational updates.
4.1 Hungary
Exploration (Hungary)
The Galga-4 well delivered a successful oil discovery in partnership with O&GD, with gross production of about 1.0 mboepd, roughly half attributable to MOL.
The Nagykörű-É-1 well was spudded on 8 September; due to poor reservoir quality it was plugged and abandoned after evaluation.
Field development (Hungary)
Construction of the Vecsés gathering station has started, progressing field development in the area.
Production optimisation (Hungary)
Around 14 well workovers were completed during the quarter to optimise production.
Geothermal / other (Hungary)
The Murakeresztúr-Őrtilos geothermal licence has been relinquished; at the same time, MOL submitted an application for a new geothermal exploration licence in the Szeged area.

4.2 Croatia
Exploration (Croatia)
An offshore drilling campaign is in progress: at Ika A, drilling activities started on 22 August 2025.
Field development and production (Croatia)
The Jamarice-183 well has been tied-in and started production in July.
A re-entry at Gola-4 commenced on 13 July 2025; attempts to remove production equipment were unsuccessful and the well has been plugged and abandoned.
At Zalata-Dravica, permitting activities are ongoing to progress the project.
Production optimisation (Croatia)
About 10 workovers were executed on onshore fields to support production optimisation.
Geothermal (Croatia)
At Leščan, drilling operations finished and the team is evaluating whether to continue the geothermal project.

4.3 Azerbaijan
Operational update (Azerbaijan)
ACG oil production is impacted by the natural decline of the field, unplanned trips at the ACG plant and the oil price-linked effect on entitlement volumes.
Drilling activities on the ACG field continue.
For Gobustan, an onshore operated exploration asset, the EDPSA signing is expected in Q4 2025.

4.4 Egypt
Operational update (Egypt)
Workover activities were performed on several assets: four wells in North Bahariya, one in Ras Qattara and one in West Abu Gharadig.
Two new wells were drilled in North Bahariya, and drilling of an additional well started in Ras Qattara during the quarter.
`;

const dataSourceEntrySchema = z.object({
    id: z.string(),
    type: z.enum(['textarea', 'file']),
    content: z.string().min(1, 'Content is required.'),
});

const formSchema = z.object({
    dataSources: z.array(dataSourceEntrySchema),
});

type FormValues = z.infer<typeof formSchema>;

interface DataSourcesStepProps {
    definitions: DataSourceDefinition[];
    initialValues: DataSourceInput[];
    onBack: () => void;
    onNext: (dataSources: DataSourceInput[]) => void;
}

export function DataSourcesStep({
    definitions,
    initialValues,
    onBack,
    onNext,
}: DataSourcesStepProps) {
    const defaultValues: FormValues = {
        dataSources: definitions.map((def) => {
            const existing = initialValues.find((v) => v.id === def.id);
            return {
                id: def.id,
                type: def.type,
                content: existing?.content ?? DEFAULT_CONTENT,
            };
        }),
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

    const { fields } = useFieldArray({
        control,
        name: 'dataSources',
    });

    const onSubmit = (data: FormValues) => {
        onNext(data.dataSources);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            {fields.map((field, index) => {
                const def = definitions[index];
                if (!def) return null;

                return (
                    <div key={field.id} className="flex flex-col gap-2">
                        <Label htmlFor={`ds-${def.id}`}>
                            {def.label}
                            {def.required && (
                                <span className="text-destructive ml-1">*</span>
                            )}
                        </Label>
                        <p className="text-muted-foreground text-xs">
                            {def.description}
                        </p>

                        {def.type === 'textarea' ? (
                            <Textarea
                                id={`ds-${def.id}`}
                                rows={10}
                                placeholder="Paste your content here..."
                                {...register(`dataSources.${index}.content`)}
                            />
                        ) : (
                            <FileInput
                                id={`ds-${def.id}`}
                                accept={
                                    def.acceptedFileTypes?.join(',') ?? '.txt'
                                }
                                onContentRead={(content) =>
                                    setValue(
                                        `dataSources.${index}.content`,
                                        content,
                                    )
                                }
                            />
                        )}

                        {errors.dataSources?.[index]?.content && (
                            <p className="text-destructive text-xs">
                                {errors.dataSources[index].content.message}
                            </p>
                        )}
                    </div>
                );
            })}

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

function FileInput({
    id,
    accept,
    onContentRead,
}: {
    id: string;
    accept: string;
    onContentRead: (content: string) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.name.endsWith('.txt')) {
            const text = await file.text();
            onContentRead(text);
            return;
        }

        // TODO: support .pdf and .xlsx file reading
        onContentRead(`[Unsupported file type: ${file.name}]`);
    };

    return (
        <div className="flex items-center gap-2">
            <Input
                ref={inputRef}
                id={id}
                type="file"
                accept={accept}
                onChange={handleChange}
                className="cursor-pointer"
            />
        </div>
    );
}
