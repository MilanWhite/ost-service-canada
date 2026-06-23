/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
    readonly VITE_AWS_REGION: string;
    readonly VITE_USER_POOL_ID: string;
    readonly VITE_APP_CLIENT_ID: string;
    readonly VITE_COGNITO_DOMAIN: string;
    readonly VITE_REDIRECT_SIGN_IN?: string;
    readonly VITE_REDIRECT_SIGN_OUT?: string;
    readonly VITE_IMAGE_VIEWER_VARIANT?: "enhanced" | "bare";
    readonly VITE_VEHICLES_PER_PAGE?: string;
    readonly VITE_HIDE_ADMIN_DASHBOARD?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
