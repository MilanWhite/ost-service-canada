const parsePositiveInteger = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);

    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const VEHICLES_PER_PAGE = parsePositiveInteger(
    import.meta.env.VITE_VEHICLES_PER_PAGE,
    25
);
