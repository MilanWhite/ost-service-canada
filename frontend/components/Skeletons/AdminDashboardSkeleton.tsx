const SkeletonBlock = ({ className }: { className: string }) => (
    <div className={`rounded bg-gray-200 ${className}`} />
);

const DashboardVehicleListSkeleton = () => (
    <div className="flex flex-col animate-pulse">
        <SkeletonBlock className="h-5 w-48" />
        <div className="mt-4 rounded-lg border border-gray-200 px-5 shadow-sm">
            <ul role="list" className="divide-y divide-gray-100">
                {Array.from({ length: 4 }).map((_, index) => (
                    <li
                        key={index}
                        className="flex justify-between gap-x-6 py-5"
                    >
                        <div className="flex min-w-0 gap-x-4">
                            <SkeletonBlock className="h-12 w-12 rounded-sm" />
                            <div className="min-w-0 flex-auto space-y-2">
                                <SkeletonBlock className="h-4 w-40" />
                                <SkeletonBlock className="h-3 w-28" />
                            </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end justify-center">
                            <SkeletonBlock className="h-4 w-12" />
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

export default function AdminDashboardSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 grid-rows-[auto,1fr]">
            <div className="md:col-span-2 flex gap-6">
                <div className="basis-4/4 2xl:basis-3/4 animate-pulse">
                    <SkeletonBlock className="h-9 w-48" />
                    <div className="mt-4">
                        <SkeletonBlock className="h-5 w-16" />
                        <dl className="mx-auto mt-4 grid grid-cols-1 gap-px bg-gray-900/5 sm:grid-cols-2 lg:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 bg-white px-4 py-4 sm:px-6 sm:py-10 xl:px-8"
                                >
                                    <SkeletonBlock className="h-4 w-28" />
                                    <SkeletonBlock className="h-8 w-14 flex-none" />
                                </div>
                            ))}
                        </dl>
                    </div>
                    <div className="mt-4 hidden sm:block">
                        <SkeletonBlock className="h-5 w-32" />
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="relative flex items-center space-x-3 rounded-lg border border-gray-200 bg-white px-6 py-5 shadow-sm"
                                >
                                    <SkeletonBlock className="size-10 rounded-full" />
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <SkeletonBlock className="h-4 w-32" />
                                        <SkeletonBlock className="h-4 w-48 max-w-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="hidden 2xl:block basis-1/4 animate-pulse">
                    <SkeletonBlock className="mt-13 h-5 w-32" />
                    <div className="flow-root p-6">
                        <ul role="list" className="-mb-8">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <li key={index}>
                                    <div className="relative pb-8">
                                        <div className="relative flex space-x-3">
                                            <SkeletonBlock className="size-8 rounded-full ring-8 ring-white" />
                                            <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                                <SkeletonBlock className="h-4 w-3/4" />
                                                <SkeletonBlock className="h-4 w-10" />
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
            <DashboardVehicleListSkeleton />
            <DashboardVehicleListSkeleton />
        </div>
    );
}
