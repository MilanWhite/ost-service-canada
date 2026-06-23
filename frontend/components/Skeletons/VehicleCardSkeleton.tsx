interface Props {
    appear_size?: string;
    type?: "Admin" | "User";
}

const SkeletonBlock = ({ className }: { className: string }) => (
    <div className={`rounded bg-gray-200 ${className}`} />
);

export default function VehicleCardSkeleton({
    appear_size,
    type = "User",
}: Props) {
    return (
        <div className={appear_size ? `hidden ${appear_size}:block` : ""}>
            <section aria-hidden className="mt-6">
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs sm:relative animate-pulse">
                    <div className="hidden px-4 pt-4 text-sm sm:absolute sm:top-4 sm:right-6 sm:block sm:px-0 sm:pt-0 sm:text-right">
                        <SkeletonBlock className="h-4 w-24" />
                        <SkeletonBlock className="mt-1 h-4 w-20" />
                    </div>

                    <div className="px-4 pt-4 pb-5 sm:px-5 sm:pt-5 lg:grid lg:grid-cols-12 lg:gap-x-4 lg:p-5">
                        <div className="sm:flex lg:col-span-4">
                            <SkeletonBlock className="aspect-square w-full shrink-0 rounded-lg sm:size-32" />
                            <div className="mt-3 flex-1 sm:mt-0 sm:ml-5">
                                <SkeletonBlock className="h-5 w-3/4" />
                                <SkeletonBlock className="mt-1 h-4 w-36 sm:hidden" />
                                <SkeletonBlock className="mt-3 h-9 w-32 rounded-md" />
                            </div>
                        </div>

                        <div className="mt-5 lg:col-span-8 lg:mt-0 lg:pr-28 xl:pr-36">
                            <dl className="grid grid-cols-1 gap-x-6 text-sm">
                                <div className="space-y-4 lg:grid lg:grid-cols-3 lg:items-start lg:gap-x-10 lg:space-y-0 xl:gap-x-12">
                                    <div className="min-w-0">
                                        <SkeletonBlock className="h-4 w-24" />
                                        <div className="mt-3 space-y-1">
                                            {Array.from({ length: 4 }).map(
                                                (_, index) => (
                                                    <SkeletonBlock
                                                        key={index}
                                                        className="h-4 w-32"
                                                    />
                                                )
                                            )}
                                        </div>
                                    </div>
                                    <div className="block min-w-0 lg:hidden xl:block">
                                        <SkeletonBlock className="h-4 w-40" />
                                        <div className="mt-3 space-y-1">
                                            {Array.from({ length: 4 }).map(
                                                (_, index) => (
                                                    <SkeletonBlock
                                                        key={index}
                                                        className="h-4 w-36"
                                                    />
                                                )
                                            )}
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <SkeletonBlock className="h-4 w-24" />
                                        <div className="mt-3 space-y-1">
                                            {Array.from({ length: 4 }).map(
                                                (_, index) => (
                                                    <SkeletonBlock
                                                        key={index}
                                                        className="h-4 w-36"
                                                    />
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </dl>
                        </div>
                    </div>

                    <div className="px-4 pb-4 sm:absolute sm:right-5 sm:bottom-5 sm:px-0 sm:pb-0">
                        <div className="mt-2 flex flex-col gap-3 sm:mt-0 sm:flex-row-reverse">
                            <SkeletonBlock className="h-9 w-full rounded-md sm:w-16" />
                            {type === "Admin" && (
                                <SkeletonBlock className="h-9 w-full rounded-md sm:w-14" />
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
