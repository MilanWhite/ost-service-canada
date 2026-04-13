const getRequiredEnv = (key: keyof ImportMetaEnv) => {
    const value = import.meta.env[key];

    if (!value) {
        throw new Error(
            `Missing required frontend environment variable: ${key}`
        );
    }

    return value;
};

const normalizeCognitoDomain = (domain: string) =>
    domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");

const awsRegion = getRequiredEnv("VITE_AWS_REGION");

const amplifyConfiguration = {
    aws_project_region: awsRegion,
    aws_cognito_region: awsRegion,
    aws_user_pools_id: getRequiredEnv("VITE_USER_POOL_ID"),
    aws_user_pools_web_client_id: getRequiredEnv("VITE_APP_CLIENT_ID"),
    oauth: {
        domain: normalizeCognitoDomain(getRequiredEnv("VITE_COGNITO_DOMAIN")),
    },
    aws_cognito_username_attributes: ["EMAIL"],
    aws_cognito_social_providers: [],
    aws_cognito_signup_attributes: [],
    aws_cognito_mfa_configuration: "OFF",
    aws_cognito_mfa_types: [],
    aws_cognito_password_protection_settings: {
        passwordPolicyMinLength: 8,
        passwordPolicyCharacters: [
            "REQUIRES_LOWERCASE",
            "REQUIRES_UPPERCASE",
            "REQUIRES_NUMBERS",
            "REQUIRES_SYMBOLS",
        ],
    },
    aws_cognito_verification_mechanisms: ["EMAIL", "PHONE_NUMBER"],
};

export default amplifyConfiguration;
