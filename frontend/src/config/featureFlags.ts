const isTruthyEnvValue = (value: string | undefined) =>
    value?.toLowerCase() === "true";

export const FEATURE_FLAGS = {
    hideAdminDashboard: isTruthyEnvValue(
        import.meta.env.VITE_HIDE_ADMIN_DASHBOARD
    ),
} as const;
