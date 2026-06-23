import axios from "axios";
import { fetchAuthSession } from "aws-amplify/auth";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/";

const controllers = new Map<symbol, AbortController>();

type RequestConfigWithKey = {
    __reqKey?: symbol;
};

const apiClient = axios.create({
    baseURL: baseURL,
    withCredentials: true,
    timeout: 10000,
});

apiClient.interceptors.request.use(async (config) => {
    // set up abort controller to cancel requests
    const controller = new AbortController();
    const key = Symbol();
    (config as RequestConfigWithKey).__reqKey = key;
    controllers.set(key, controller);
    config.signal = controller.signal;

    // attach the access token from AWS
    try {
        const session = await fetchAuthSession();
        const token = session.tokens?.accessToken;

        if (token) {
            // ensure headers are attached
            config.headers = config.headers ?? {};
            (config.headers as Record<string, string>)[
                "Authorization"
            ] = `Bearer ${token}`;
        }
    } catch {
        // Some endpoints support anonymous access, so continue without a token
        // when no authenticated Amplify session is available.
    }

    return config;
});

const cleanup = (config: unknown) => {
    const key = (config as RequestConfigWithKey | undefined)?.__reqKey;
    if (key) controllers.delete(key);
};

apiClient.interceptors.response.use(
    (res) => {
        cleanup(res.config);
        return res;
    },
    (err) => {
        cleanup(err.config);
        return Promise.reject(err);
    }
);

export function abortAllRequests() {
    for (const ctrl of controllers.values()) ctrl.abort();
    controllers.clear();
}

export default apiClient;
