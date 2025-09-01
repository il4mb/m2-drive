import User from "@/entity/User";
import { getMany } from "@/libs/websocket/query";
import { onSnapshot } from "@/libs/websocket/snapshot";
import { useEffect, useState, useRef } from "react";

type QueryProps = {
    keyword?: string;
    sortBy?: "name" | "updatedAt" | "createdAt";
    order?: "ASC" | "DESC";
};

export const useUsers = ({ keyword, sortBy, order }: QueryProps) => {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!keyword) {
            setUsers([]);
            return;
        }
        setLoading(true);

        // Clear any previous timeout (cancel)
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {

            const query = getMany("user").limit(10)
                .where("name", "LIKE", `${keyword}%`)
                .orWhere("email", "LIKE", `${keyword}%`);

            if (sortBy && order) {
                query.orderBy(sortBy, order);
            }

            const unsubscribe = onSnapshot(query, (data) => {
                setUsers(data);
                setLoading(false);
            });

            // Cleanup function
            return () => {
                unsubscribe();
            };
        }, 300);

        // Cleanup timeout when effect re-runs
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [keyword, sortBy, order]);

    return { users, loading };
};
