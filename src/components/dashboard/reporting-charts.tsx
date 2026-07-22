import { cn } from "@/lib/utils";
import type { BarPoint, DonutSlice } from "@/lib/business-income";

function percent(value: number, total: number): number {
    if (total <= 0) return 0;
    return (value / total) * 100;
}

export function DonutChart({
    title,
    subtitle,
    slices,
}: {
    title: string;
    subtitle: string;
    slices: DonutSlice[];
}) {
    const total = slices.reduce((sum, slice) => sum + slice.value, 0);

    let cumulative = 0;
    const parts = slices.map((slice) => {
        const start = cumulative;
        const end = cumulative + percent(slice.value, total);
        cumulative = end;
        return `${slice.color} ${start}% ${end}%`;
    });

    const donutStyle = {
        background: total > 0 ? `conic-gradient(${parts.join(", ")})` : "#e2e8f0",
    } as const;

    return (
        <div className="rounded-2xl border border-[#1e2235]/8 bg-white p-5">
            <h3 className="text-base font-semibold text-[#1e2235]">{title}</h3>
            <p className="mt-1 text-xs text-[#8b92a5]">{subtitle}</p>

            <div className="mt-4 flex items-center gap-5">
                <div className="relative h-32 w-32 shrink-0">
                    <div className="h-32 w-32 rounded-full" style={donutStyle} />
                    <div className="absolute inset-4 flex items-center justify-center rounded-full bg-white text-center">
                        <div>
                            <p className="text-xl font-bold text-[#1e2235]">{total}</p>
                            <p className="text-[10px] uppercase tracking-wide text-[#8b92a5]">Total</p>
                        </div>
                    </div>
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                    {slices.length > 0 ? (
                        slices.map((slice) => (
                            <div key={slice.label} className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: slice.color }}
                                    />
                                    <p className="truncate text-sm text-[#1e2235]">{slice.label}</p>
                                </div>
                                <p className="text-xs text-[#8b92a5]">{slice.value}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-[#8b92a5]">No data in selected period.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export function HorizontalBarChart({
    title,
    subtitle,
    points,
    className,
}: {
    title: string;
    subtitle: string;
    points: BarPoint[];
    className?: string;
}) {
    const max = Math.max(...points.map((point) => point.value), 1);

    return (
        <div className={cn("rounded-2xl border border-[#1e2235]/8 bg-white p-5", className)}>
            <h3 className="text-base font-semibold text-[#1e2235]">{title}</h3>
            <p className="mt-1 text-xs text-[#8b92a5]">{subtitle}</p>

            <div className="mt-4 space-y-3">
                {points.length > 0 ? (
                    points.map((point) => {
                        const width = Math.max((point.value / max) * 100, 2);
                        return (
                            <div key={point.label} className="space-y-1">
                                <div className="flex items-center justify-between gap-2 text-xs">
                                    <p className="truncate font-medium text-[#1e2235]">{point.label}</p>
                                    <p className="text-[#8b92a5]">{point.value}</p>
                                </div>
                                <div className="h-2 rounded-full bg-[#f1f5f9]">
                                    <div
                                        className="h-2 rounded-full bg-booking-accent"
                                        style={{ width: `${width}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-sm text-[#8b92a5]">No data in selected period.</p>
                )}
            </div>
        </div>
    );
}
