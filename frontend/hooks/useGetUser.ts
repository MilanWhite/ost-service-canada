import { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "../services/api-client";

import { User } from "./interfaces"
import { CanceledError } from "axios";
import { getCachedUserBySub, upsertCachedUser } from "./useGetAllUsers";

export function useGetUser(sub?: string) {
    const latestSubRef = useRef(sub);
    const [user, setUser] = useState<User | null>(() =>
        getCachedUserBySub(sub)
    );
    const [userLoading, setUserLoading] = useState<boolean>(false);
    const [userError, setUserError] = useState<string | null>(null);

    useEffect(() => {
        latestSubRef.current = sub;
        setUser(getCachedUserBySub(sub));
        setUserError(null);
    }, [sub]);

    const fetchUser = useCallback(async () => {
        const requestedSub = sub;
        if (!requestedSub) return;
        setUserLoading(true);
        setUserError(null);

        try {
            const response = await apiClient.get(
                `/api/main/${requestedSub}/get-user`
            );
            const fetchedUser = response.data.message.user as User;
            upsertCachedUser(fetchedUser);
            if (latestSubRef.current === requestedSub) {
                setUser(fetchedUser);
            }
        } catch (err: unknown) {
            if (err instanceof CanceledError) return;

            if (latestSubRef.current === requestedSub) {
                setUserError("AuthenticatedView.Errors.failed_to_fetch_user");
            }
        } finally {
            if (latestSubRef.current === requestedSub) {
                setUserLoading(false);
            }
        }
    }, [sub]);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    return {
        user,
        userLoading,
        userError,
        userRefetch: fetchUser,
    } as const;
}
