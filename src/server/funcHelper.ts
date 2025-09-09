import { getConnection } from "@/data-source";
import { Activity } from "@/entities/Activity";
import User from "@/entities/User";
import { currentTime } from "@/libs/utils";
import { Between } from "typeorm";

export function createFunction<T extends (args: any) => Promise<any>>(handler: T) {
    return async (args: Parameters<T>[0]): Promise<Awaited<ReturnType<T>>> => {
        // Detect unknown props
        const allowedKeys = Object.keys(args as any);
        const expectedKeys = Object.keys(args as any); // Replace with explicit schema if needed
        const extraKeys = allowedKeys.filter(k => !expectedKeys.includes(k));

        if (extraKeys.length > 0) {
            throw new Error(`Unexpected properties: ${extraKeys.join(", ")}`);
        }

        return handler(args) as Awaited<ReturnType<T>>;
    };
}

export const writeActivity = async (userId: string | User, data: Omit<Activity, 'id' | 'userId' | 'createdAt' | 'user'>) => {

    try {
        if (!data.description || !data.type) {
            throw new Error("Failed Write Activity: Missing required filed!");
        }
        const connection = await getConnection();
        const activityRepository = connection.getRepository(Activity);

        let user = await (typeof userId == "object" ? userId : (connection.getRepository(User)).findOneBy({ id: userId }));
        if (!user) throw new Error("Failed Write Activity: user not found!");

        const now = currentTime();
        const oneMinuteAgo = now - 60;

        // Try to find existing activity in last 1 minute
        const existing = await activityRepository.findOne({
            where: {
                userId: user.id,
                type: data.type,
                description: data.description,
                createdAt: Between(oneMinuteAgo, now),
            },
        });

        if (existing) {
            // Update timestamp
            existing.createdAt = now;
            await activityRepository.save(existing);
            return existing;
        }

        // Insert new activity
        const activity = activityRepository.create({
            userId: user.id,
            ...data,
            createdAt: now,
        });

        await activityRepository.save(activity);
        return activity;
    } catch (error: any) {
        console.error(error);
    }
}