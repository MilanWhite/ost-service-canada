import { useState, useEffect, useCallback } from "react";
import apiClient from "../services/api-client";
import { User } from "./interfaces"
import { CanceledError } from "axios";

let usersCache: User[] = [];
const usersListeners = new Set<(users: User[]) => void>();

const updateUsersCache = (users: User[]) => {
    usersCache = users;
    usersListeners.forEach((listener) => listener(usersCache));
};

export const getCachedUserBySub = (sub?: string) => {
    if (!sub) return null;
    return usersCache.find((user) => user.sub === sub) ?? null;
};

export const upsertCachedUser = (user: User) => {
    const existingIndex = usersCache.findIndex(
        (cachedUser) => cachedUser.sub === user.sub
    );

    if (existingIndex === -1) {
        updateUsersCache([...usersCache, user]);
        return;
    }

    updateUsersCache(
        usersCache.map((cachedUser, index) =>
            index === existingIndex ? { ...cachedUser, ...user } : cachedUser
        )
    );
};

export const clearUsersCache = () => {
    updateUsersCache([]);
};

export function useGetAllUsers() {
    const [allUsers, setAllUsers] = useState<User[]>(usersCache);
    const [getAllUsersLoading, setAllUsersLoading] = useState<boolean>(false);
    const [getAllUsersError, setGetAllUsersError] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
    setAllUsersLoading(true);
    setGetAllUsersError(null);
    try {
        const response = await apiClient.get("/api/admin/users/get-all-users");

        updateUsersCache(response.data.message.users);
    } catch (err: unknown) {
        if (err instanceof CanceledError) return;

        setGetAllUsersError("AuthenticatedView.Errors.failed_to_fetch_users");
    } finally {
        setAllUsersLoading(false);
    }
    }, []);

    useEffect(() => {
        usersListeners.add(setAllUsers);
        fetchUsers();

        return () => {
            usersListeners.delete(setAllUsers);
        };
    }, [fetchUsers]);

    return {
        allUsers,
        getAllUsersLoading,
        getAllUsersError,
        getAllUsersRefetch: fetchUsers,
    } as const;
}
