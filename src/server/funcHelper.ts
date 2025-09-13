import { getConnection } from "@/data-source";
import { Activity } from "@/entities/Activity";
import User from "@/entities/User";
import { getRequestContext } from "@/libs/requestContext";
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

export const writeActivity = async (type: string, description: string, metadata: Record<string, any> = {}) => {

    try {

        const { user, ipAddress, userAgent } = getRequestContext();
        if (!description || !type) {
            throw new Error("Failed Write Activity: Missing required filed!");
        }

        if (!user) throw new Error("Failed Write Activity: user not found!");
        if (typeof user == "string") return;

        const connection = await getConnection();
        const activityRepository = connection.getRepository(Activity);
        const now = currentTime();
        const threetyMinuteAgo = now - (["CONNECT", "DISCONNECT"].includes(type) ? 30 * 60 : 60);

        // Try to find existing activity in last 1 minute
        const existing = await activityRepository.findOne({
            where: {
                userId: user.id,
                type,
                description,
                createdAt: Between(threetyMinuteAgo, now),
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
            description,
            type,
            metadata,
            ipAddress,
            userAgent,
            createdAt: now,
        });

        await activityRepository.save(activity);
        return activity;
    } catch (error: any) {
        console.error(error);
    }
}