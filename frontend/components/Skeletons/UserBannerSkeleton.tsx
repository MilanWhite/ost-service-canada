const SkeletonBlock = ({ className }: { className: string }) => (
    <div className={`rounded bg-gray-200 ${className}`} />
);

export default function UserBannerSkeleton() {
    return (
        <div className="bg-white animate-pulse">
            <div className="py-4">
                <div className="sm:flex sm:items-center sm:justify-between">
                    <div className="sm:flex sm:space-x-5">
                        <div className="shrink-0">
                            <SkeletonBlock className="mx-auto size-20 rounded-full" />
                        </div>

                        <div className="mt-4 space-y-2 text-center sm:mt-0 sm:pt-1 sm:text-left">
                            <SkeletonBlock className="mx-auto h-7 w-40 sm:mx-0" />
                            <SkeletonBlock className="mx-auto h-4 w-48 sm:mx-0" />
                            <SkeletonBlock className="mx-auto h-3 w-28 sm:mx-0" />
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap justify-center gap-2 sm:mt-0">
                        <SkeletonBlock className="h-9 w-26 rounded-md" />
                        <SkeletonBlock className="h-9 w-24 rounded-md" />
                    </div>
                </div>
            </div>
        </div>
    );
}
