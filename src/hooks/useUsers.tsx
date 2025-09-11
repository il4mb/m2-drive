import { useCurrentSession } from "@/components/context/CurrentSessionProvider";
import User from "@/entities/User";
import { getMany } from "@/libs/websocket/query";
import { onSnapshot } from "@/libs/websocket/SnapshotManager";
import { useEffect, useState, useRef } from "react";

type QueryProps = {
    keyword?: string;
    sortBy?: keyof typeof User['prototype'];
    order?: "ASC" | "DESC";
    limit?: number;
    exclude?: string[];
};

export const useUsers = ({ keyword, sortBy, order, limit, exclude }: QueryProps) => {

    const session = useCurrentSession();
    const me = session?.user;
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {

        setLoading(true);
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {

            const query = getMany("user")
            if (keyword) {
                query.bracketWhere(q => {
                    q.where("name", "STARTS WITH", `${keyword}`)
                        .orWhere("email", "STARTS WITH", `${keyword}`);
                })
            }

            if (exclude) {
                query.where("id", "NOT IN", exclude)
            }
            if (limit) {
                query.limit(limit);
            }
            if (sortBy && order) {
                query.orderBy(sortBy, order);
            }

            const unsubscribe = onSnapshot(query, (data) => {
                setUsers(data.rows);
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
    }, [keyword, sortBy, order, exclude, me]);

    return { users, loading };
};
