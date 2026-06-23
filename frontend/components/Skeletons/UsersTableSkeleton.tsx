interface UsersTableSkeletonProps {
    rows?: number;
}

export default function UsersTableSkeleton({
    rows = 6,
}: UsersTableSkeletonProps) {
    return (
        <>
            {Array.from({ length: rows }).map((_, index) => (
                <tr key={index} className="animate-pulse">
                    <td className="py-5 pr-3 text-sm whitespace-nowrap sm:pl-0">
                        <div className="flex items-center">
                            <div className="size-11 shrink-0 rounded-full bg-gray-200" />
                            <div className="ml-4 flex-1 space-y-2">
                                <div className="h-4 w-1/2 rounded bg-gray-200" />
                                <div className="h-4 w-3/4 rounded bg-gray-200" />
                            </div>
                        </div>
                    </td>

                    <td className="hidden px-3 py-4 text-sm md:table-cell">
                        <div className="mr-auto h-4 w-2/4 rounded bg-gray-200" />
                    </td>

                    <td className="relative py-4 pl-3 text-right text-sm font-medium">
                        <div className="flex justify-end gap-x-4">
                            <div className="h-4 w-16 rounded bg-gray-200" />
                        </div>
                    </td>
                </tr>
            ))}
        </>
    );
}
