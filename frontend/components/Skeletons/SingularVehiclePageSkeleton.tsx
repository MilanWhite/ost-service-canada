interface Props {
    type?: "Admin" | "User";
}

const SkeletonBlock = ({ className }: { className: string }) => (
    <div className={`rounded-md bg-gray-200 ${className}`} />
);

const SkeletonField = ({ wide = false }: { wide?: boolean }) => (
    <div>
        <SkeletonBlock className={wide ? "h-4 w-32" : "h-4 w-24"} />
        <SkeletonBlock className={wide ? "mt-2 h-4 w-44" : "mt-2 h-4 w-32"} />
    </div>
);

export default function SingularVehiclePageSkeleton({ type = "User" }: Props) {
    const isAdmin = type === "Admin";

    return (
        <div className="w-full max-w-full overflow-x-hidden bg-white pb-8 sm:overflow-visible animate-pulse">
            <div className="mx-auto w-full max-w-full py-3 sm:max-w-none">
                <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
                    <div
                        className={
                            isAdmin
                                ? "grid gap-4 p-3 sm:p-4 lg:grid-cols-[9rem_1fr_auto] lg:items-center"
                                : "grid gap-4 p-3 sm:p-4 lg:grid-cols-[9rem_1fr] lg:items-center"
                        }
                    >
                        <SkeletonBlock className="aspect-[4/3] w-full rounded-lg sm:aspect-square lg:size-36" />

                        <div className="min-w-0">
                            <SkeletonBlock className="h-7 w-3/4 max-w-md" />
                            <div className="mt-3 flex flex-col items-start gap-2">
                                <SkeletonBlock className="h-4 w-44" />
                                <SkeletonBlock className="h-8 w-32" />
                            </div>
                        </div>

                        {isAdmin && (
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <SkeletonBlock className="h-9 w-full rounded-md sm:w-16" />
                                <SkeletonBlock className="h-9 w-full rounded-md sm:w-20" />
                            </div>
                        )}
                    </div>
                </section>

                <div className="mt-5 grid min-w-0 max-w-full gap-5 lg:grid-cols-3">
                    <div className="min-w-0 space-y-5 lg:col-span-2">
                        <section className="w-full min-w-0 max-w-full rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
                            <SkeletonBlock className="h-7 w-32" />
                            <div className="mt-4 border-t border-gray-200 pt-4">
                                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                                    {Array.from({ length: 9 }).map(
                                        (_, index) => (
                                            <SkeletonField
                                                key={index}
                                                wide={index % 3 === 0}
                                            />
                                        )
                                    )}
                                </dl>
                            </div>
                        </section>

                        <section className="w-full min-w-0 max-w-full rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
                            <SkeletonBlock className="h-7 w-28" />
                            <div className="mt-4 grid gap-3 border-t border-gray-200 pt-4 sm:grid-cols-2">
                                {Array.from({ length: 4 }).map((_, index) => (
                                    <SkeletonField key={index} wide />
                                ))}
                            </div>
                        </section>
                    </div>

                    <aside className="min-w-0 lg:col-span-1">
                        <section className="w-full min-w-0 max-w-full rounded-lg border border-gray-200 bg-white p-4 shadow-xs lg:sticky lg:top-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <SkeletonBlock className="h-7 w-20" />
                                <SkeletonBlock className="h-8 w-28 rounded-md" />
                            </div>
                            <div className="mt-4 border-t border-gray-200 pt-4">
                                <SkeletonBlock className="aspect-[4/3] w-full rounded-lg" />
                                <div className="mt-3 grid grid-cols-4 gap-2">
                                    {Array.from({ length: 4 }).map(
                                        (_, index) => (
                                            <SkeletonBlock
                                                key={index}
                                                className="aspect-square w-full rounded-lg"
                                            />
                                        )
                                    )}
                                </div>
                            </div>
                        </section>
                    </aside>
                </div>
            </div>
        </div>
    );
}
