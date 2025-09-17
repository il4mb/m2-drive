import { parse } from 'cookie';
import { Server, Socket } from 'socket.io';
import { getTokenById, getUserByToken } from './auth';
import { requestContext } from '@/libs/requestContext';
import { QueryConfig } from './database/types';
import { executeQuery } from './database/queryExecutor';
import { currentTime, generateKey } from '@/libs/utils';
import Token from '@/entities/Token';
import { generateIndonesianAnimalName } from './animal-names';
import functions from "./functions";
import { getConnection } from '@/data-source';
import User from '@/entities/User';
import { writeActivity } from './funcHelper';

interface Subscription {
    socket: CustomSocket;
    collection: QueryConfig['collection'];
    relations: string[];
    conditions?: QueryConfig['conditions'];
    joins: QueryConfig['joins'];
    debug?: boolean;
    createdAt: number;
}

export interface Viewer {
    displayName: string;
    isGuest?: boolean;
    uid?: string | null;
    path: string[][];
}

export interface Client {
    sessionId: string;
    displayName: string;
    userId: string | null;
    isAuthenticated: boolean;
    token: Token | null;
}

// Constants
const RATE_LIMIT_WINDOW = 20000; // 20 seconds
const MAX_REQUESTS_PER_MINUTE_AUTH = 1000;
const MAX_REQUESTS_PER_MINUTE_GUEST = 100;
const HEARTBEAT_INTERVAL = 30000;
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minute
const SUBSCRIPTION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Track metrics for monitoring
const connectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    maxConcurrentConnections: 0,
    functionInvocations: 0,
    queryExecutions: 0,
}

export const subscribers = new Map<string, Subscription>();
export const viewers = new Map<string, Viewer>();
export const clients = new Map<string, Client>();

// Rate limiting
const rateLimits = new Map<string, { count: number; lastReset: number; isGuest: boolean }>();

// Utility functions
const checkRateLimit = (id: string, isGuest: boolean = false): { allowed: boolean; remaining: number } => {
    const now = Date.now();
    const userRateLimit = rateLimits.get(id) || { count: 0, lastReset: now, isGuest };
    const maxRequests = isGuest ? MAX_REQUESTS_PER_MINUTE_GUEST : MAX_REQUESTS_PER_MINUTE_AUTH;

    // Reset counter if window has passed
    if (now - userRateLimit.lastReset > RATE_LIMIT_WINDOW) {
        userRateLimit.count = 0;
        userRateLimit.lastReset = now;
    }

    userRateLimit.count++;
    rateLimits.set(id, userRateLimit);

    return {
        allowed: userRateLimit.count <= maxRequests,
        remaining: Math.max(0, maxRequests - userRateLimit.count),
    };
};

const isChildPathOf = (parent: string[], child: string[]): boolean => {
    if (child.length < parent.length) return false;
    return parent.every((id, idx) => id === child[idx]);
};

const normalizePaths = (path: string | string[] | string[][]): string[][] => {
    if (Array.isArray(path)) {
        if (Array.isArray(path[0])) {
            return path as string[][];
        }
        return [path as string[]];
    }
    return [[path]];
};

const broadcastViewers = (io: Server, affectedPaths?: string[][]) => {
    for (const [socketId, viewer] of viewers.entries()) {
        const socketInstance = io.sockets.sockets.get(socketId);
        if (!socketInstance) continue;

        if (affectedPaths && !viewer.path.some(vp =>
            affectedPaths.some(ap => isChildPathOf(ap, vp) || isChildPathOf(vp, ap))
        )) {
            continue;
        }

        const visibleViewers = [...viewers.values()]
            .filter(v => viewer.path.some(parentPath =>
                v.path.some(childPath => isChildPathOf(parentPath, childPath)))
            )
            .map(v => ({
                uid: v.uid,
                isGuest: v.isGuest,
                displayName: v.displayName,
                path: v.path
            }));

        socketInstance.emit("viewers-change", visibleViewers);
    }
};

// Types
export type SocketResult<R = any> = {
    success: boolean;
    error?: string;
    code?: string;
    retryAfter?: number;
    data?: R;
}

type CustomSocket = Omit<Socket, 'data'> & {
    data: Client;
}

export async function setupSocketHandlers(io: Server) {
    const connection = await getConnection();
    const userRepository = connection.getRepository(User);

    const markUserActiveStatus = async (uid: string, isActive: boolean) => {
        await requestContext.run({ user: "system" }, async () => {
            const user = await userRepository.findOneBy({ id: uid });
            if (user) {
                const meta = user.meta;
                meta.isActive = isActive;
                if (isActive) {
                    meta.activeAt = currentTime();
                } else {
                    delete meta.activeAt;
                }
                user.meta = meta;
                await userRepository.save(user);
            }
        });
    };

    const handleWriteActivity = async (socket: CustomSocket, type: string, description: string) => {
        if (!socket.data.isAuthenticated) return;

        const user = await getUserByToken(socket.data.token!);
        const ipAddress = socket.handshake.headers["x-forwarded-for"]?.toString().split(",")[0] || socket.handshake.address;
        const userAgent = socket.handshake.headers["user-agent"] || "Unknown";

        await requestContext.run({ user, userAgent, ipAddress }, async () => {
            await writeActivity(type, description);
        });
    };

    console.log("LOADED FUNCTIONS", Object.keys(functions));

    // Authentication middleware
    io.use(async (socket: CustomSocket, next) => {
        try {
            const cookies = parse(socket.handshake.headers.cookie || '');
            const sessionId = cookies['session-id'];

            if (!sessionId) {
                return next(new Error("Missing sessionId"));
            }

            socket.data = {
                sessionId,
                displayName: generateIndonesianAnimalName(),
                isAuthenticated: false,
                token: null,
                userId: null
            };

            const tokenId = cookies['token-id'];
            if (tokenId) {
                const token = await getTokenById(tokenId);
                if (!token) throw new Error('Invalid token');

                const user = await getUserByToken(token);
                if (!user) throw new Error('User not found');

                socket.data.token = token;
                socket.data.userId = user.id;
                socket.data.displayName = user.name;
                socket.data.isAuthenticated = true;
            }

            next();
        } catch (error) {
            console.error('Authentication error:', error);
            next();
        }
    });

    // Connection handler
    io.on('connection', (socket: CustomSocket) => {
        const sessionId = socket.data.sessionId;
        const ipAddress = socket.handshake.headers["x-forwarded-for"]?.toString().split(",")[0] || socket.handshake.address;
        const userAgent = socket.handshake.headers["user-agent"] || "Unknown";
        clients.set(socket.id, socket.data);

        console.log(`Client connected: ${ipAddress}, ${sessionId}, ${socket.data.displayName}`);

        // Update metrics
        connectionMetrics.totalConnections++;
        connectionMetrics.activeConnections++;
        connectionMetrics.maxConcurrentConnections = Math.max(
            connectionMetrics.maxConcurrentConnections,
            connectionMetrics.activeConnections
        );

        // Mark user as active if authenticated
        if (socket.data.isAuthenticated && socket.data.userId) {
            markUserActiveStatus(socket.data.userId, true)
                .then(() => handleWriteActivity(socket, "CONNECT", "Berhasil terhubung/masuk ke sistem"));
        }

        // Heartbeat for connection monitoring
        const heartbeatInterval = setInterval(() => {
            socket.emit('heartbeat');
        }, HEARTBEAT_INTERVAL);

        // Event handlers
        const setupEventHandlers = () => {

            socket.on("session-validate", async (callback) => {
                try {

                    const payload = {
                        success: socket.data.isAuthenticated && !!socket.data.userId,
                        data: socket.data.isAuthenticated ? { userId: socket.data.userId } : undefined
                    }
                    if (typeof callback == "function") {
                        callback(payload);
                    }
                    socket.emit("session-validate-result", payload);
                } catch (error: any) {
                    console.error("Session validation error:", error);
                    callback({ success: false, error: error.message });
                }
            });

            socket.on("viewer-join", (path: string | string[] | string[][]) => {
                const newPaths = normalizePaths(path);

                if (!viewers.has(sessionId)) {
                    viewers.set(sessionId, {
                        isGuest: !socket.data.isAuthenticated,
                        displayName: socket.data.displayName,
                        uid: socket.data.sessionId,
                        path: []
                    });
                }

                const viewer = viewers.get(sessionId)!;
                viewer.path = [
                    ...viewer.path,
                    ...newPaths.filter(np => !viewer.path.some(p => JSON.stringify(p) === JSON.stringify(np)))
                ];

                broadcastViewers(io);
            });

            socket.on("viewer-leave", (path: string | string[] | string[][]) => {
                if (!viewers.has(socket.id)) return;

                const leavePaths = normalizePaths(path);
                const viewer = viewers.get(socket.id)!;

                viewer.path = viewer.path.filter(vp =>
                    !leavePaths.some(lp =>
                        JSON.stringify(lp) === JSON.stringify(vp) || isChildPathOf(lp, vp)
                    )
                );

                if (viewer.path.length === 0) {
                    viewers.delete(socket.id);
                }

                broadcastViewers(io, leavePaths);
            });

            socket.on('subscribe', (data: QueryConfig, callback: (data: SocketResult) => void) => {
                const isGuest = !socket.data.isAuthenticated;
                const rateLimit = checkRateLimit(socket.id, isGuest);

                if (!rateLimit.allowed) {
                    callback({
                        success: false,
                        error: 'Rate limit exceeded',
                        code: 'RATE_LIMIT_EXCEEDED',
                        retryAfter: RATE_LIMIT_WINDOW,
                    });
                    return;
                }

                if (isGuest) {
                    callback({
                        success: false,
                        error: 'Guests cannot subscribe to collections',
                        code: 'UNAUTHORIZED',
                    });
                    return;
                }

                try {
                    const id = generateKey();
                    subscribers.set(id, {
                        socket,
                        collection: data.collection,
                        conditions: data.conditions,
                        relations: data.relations || [],
                        joins: data.joins || [],
                        debug: data.debug,
                        createdAt: currentTime()
                    });

                    callback({ success: true, data: { id } });
                } catch (error) {
                    console.error('Subscription error:', error);
                    callback({
                        success: false,
                        error: 'Failed to create subscription',
                        code: 'SUBSCRIPTION_ERROR',
                    });
                }
            });

            socket.on('invoke-function', async (data: { function: string; args?: any }, callback) => {
                const isGuest = !socket.data.isAuthenticated;
                const rateLimit = checkRateLimit(socket.id, isGuest);

                if (!rateLimit.allowed) {
                    callback({
                        success: false,
                        error: 'Rate limit exceeded',
                        code: 'RATE_LIMIT_EXCEEDED',
                        retryAfter: RATE_LIMIT_WINDOW,
                    });
                    return;
                }

                connectionMetrics.functionInvocations++;

                if (isGuest) {
                    const allowedGuestFunctions = ['filePreflight'];
                    if (!allowedGuestFunctions.includes(data.function)) {
                        callback({
                            success: false,
                            error: 'Guests are not allowed to call this function',
                            code: 'UNAUTHORIZED',
                        });
                        return;
                    }
                }

                try {
                    const user = socket.data.isAuthenticated ? await getUserByToken(socket.data.token!) : undefined;

                    await requestContext.run({ user, userAgent, ipAddress }, async () => {
                        const fnName = data.function as keyof typeof functions;
                        const fn = functions[fnName];

                        if (!fn || typeof fn !== 'function') {
                            throw new Error(`Function "${data.function}" not found`);
                        }
                        // @ts-ignore
                        const result = await fn(data.args || {});
                        callback({ success: true, data: result });
                    });
                } catch (error: any) {
                    console.error('Function invocation error:', error);
                    callback({
                        success: false,
                        error: error.message || 'Execution error',
                        code: 'EXECUTION_ERROR',
                    });
                }
            });

            socket.on('execute-query', async (queryData: QueryConfig, callback) => {

                const isGuest = !socket.data.isAuthenticated;
                const rateLimit = checkRateLimit(socket.id, isGuest);

                if (!rateLimit.allowed) {
                    callback({
                        success: false,
                        error: 'Rate limit exceeded',
                        code: 'RATE_LIMIT_EXCEEDED',
                        retryAfter: RATE_LIMIT_WINDOW,
                    });
                    return;
                }

                connectionMetrics.queryExecutions++;

                try {
                    const user = socket.data.isAuthenticated ? await getUserByToken(socket.data.token!) : undefined;

                    await requestContext.run({ user, ipAddress, userAgent }, async () => {
                        const result = await executeQuery(queryData);
                        const response: any = {
                            success: true,
                            data: result,
                        };

                        if (queryData.type === 'list') {
                            response.count = Array.isArray(result) ? result.length : 0;
                        }

                        callback(response);
                    });
                } catch (error: any) {
                    console.error('Query execution error:', error);
                    callback({
                        success: false,
                        error: error.message || 'Query execution failed',
                        code: 'EXECUTION_ERROR',
                    });
                }
            });

            socket.on('unsubscribe', (id: string) => {
                subscribers.delete(id);
            });

            socket.on('get-metrics', (callback) => {
                callback({ success: true, data: getConnectionMetrics() });
            });

            socket.on('get-viewers', (callback) => {
                callback({ success: true, data: Array.from(viewers.values()) });
            });

            socket.on('admin-kick-user', ({ socketId }, callback) => {
                const targetSocket = io.sockets.sockets.get(socketId);
                if (targetSocket) {
                    targetSocket.disconnect(true);
                    callback({ success: true });
                } else {
                    callback({ success: false, error: 'User not found' });
                }
            });

            // Get active users
            socket.on('admin-get-active-users', (callback) => {
                const users = Array.from(clients.entries()).map(([socketId, client]) => ({
                    socketId: socketId,
                    sessionId: client.sessionId,
                    userId: client.userId,
                    displayName: client.displayName,
                    isAuthenticated: client.isAuthenticated,
                    connectedAt: socket.handshake.time
                }));
                callback({ success: true, data: users });
            });

            // Get all subscriptions
            socket.on('admin-get-subscriptions', (callback) => {
                const subs = Array.from(subscribers.entries()).map(([id, sub]) => ({
                    id,
                    collection: sub.collection,
                    conditions: sub.conditions,
                    relations: sub.relations,
                    debug: sub.debug,
                    createdAt: sub.createdAt,
                    socketId: sub.socket.id
                }));
                callback({ success: true, data: subs });
            });

            // Get rate limits
            socket.on('admin-get-rate-limits', (callback) => {
                const limits = Array.from(rateLimits.entries()).map(([id, limit]) => ({
                    id,
                    count: limit.count,
                    lastReset: limit.lastReset,
                    isGuest: limit.isGuest,
                    remaining: limit.isGuest ? MAX_REQUESTS_PER_MINUTE_GUEST - limit.count : MAX_REQUESTS_PER_MINUTE_AUTH - limit.count
                }));
                callback({ success: true, data: limits });
            });

            // Clear all rate limits
            socket.on('admin-clear-rate-limits', (callback) => {
                rateLimits.clear();
                callback({ success: true, message: 'Rate limits cleared successfully' });
            });

            // Disconnect all guests
            socket.on('admin-disconnect-guests', (callback) => {
                let count = 0;
                io.sockets.sockets.forEach(socket => {
                    const client = (socket as CustomSocket).data;
                    if (!client.isAuthenticated) {
                        socket.disconnect(true);
                        count++;
                    }
                });
                callback({ success: true, message: `Disconnected ${count} guest users` });
            });

            // Disconnect all users
            socket.on('admin-disconnect-all', (callback) => {
                const count = io.sockets.sockets.size;
                io.disconnectSockets();
                callback({ success: true, message: `Disconnected ${count} users` });
            });

            // Reload functions
            socket.on('admin-reload-functions', async (callback) => {
                try {
                    // Clear require cache for functions
                    Object.keys(require.cache).forEach(key => {
                        if (key.includes('functions')) {
                            delete require.cache[key];
                        }
                    });

                    // Reload functions
                    const newFunctions = require('./functions');
                    Object.assign(functions, newFunctions);

                    callback({ success: true, message: 'Functions reloaded successfully' });
                } catch (error: any) {
                    callback({ success: false, error: error.message });
                }
            });

            // Clear metrics
            socket.on('admin-clear-metrics', (callback) => {
                connectionMetrics.totalConnections = 0;
                connectionMetrics.maxConcurrentConnections = 0;
                connectionMetrics.functionInvocations = 0;
                connectionMetrics.queryExecutions = 0;
                callback({ success: true, message: 'Metrics cleared successfully' });
            });

            // Remove specific subscription
            socket.on('admin-remove-subscription', (data: { id: string }, callback) => {
                if (subscribers.has(data.id)) {
                    subscribers.delete(data.id);
                    callback({ success: true, message: 'Subscription removed successfully' });
                } else {
                    callback({ success: false, error: 'Subscription not found' });
                }
            });

            socket.on('disconnect', async (reason) => {
                console.log(`Client disconnected: ${socket.id}, Reason: ${reason}, Authenticated: ${socket.data.isAuthenticated}`);

                // Clean up
                clearInterval(heartbeatInterval);

                // Remove subscriptions
                for (const [id, sub] of subscribers) {
                    if (sub.socket.id === socket.id) {
                        subscribers.delete(id);
                    }
                }

                // Handle viewer cleanup
                if (viewers.has(socket.id)) {
                    const viewer = viewers.get(socket.id)!;
                    const leavePaths = viewer.path;
                    viewers.delete(socket.id);
                    broadcastViewers(io, leavePaths);
                }

                if (clients.has(socket.id)) {
                    clients.delete(socket.id);
                }

                // Mark user as inactive if authenticated
                if (socket.data.isAuthenticated && socket.data.userId) {
                    if (!Array.from(clients.values()).some(e => e.userId == socket.data.userId)) {
                        await markUserActiveStatus(socket.data.userId, false);
                        await handleWriteActivity(socket, "DISCONNECT", "Koneksi terputus atau keluar dari sistem.");
                    }
                }

                connectionMetrics.activeConnections--;
            });

            socket.on('error', (error) => {
                console.error('Socket error:', error);
            });
        }

        setupEventHandlers();
    });

    // Cleanup interval for old subscriptions
    setInterval(() => {
        const now = currentTime();
        for (const [id, sub] of subscribers) {
            if (now - sub.createdAt > SUBSCRIPTION_MAX_AGE) {
                subscribers.delete(id);
            }
        }
    }, CLEANUP_INTERVAL);
}

// Export metrics for monitoring
export function getConnectionMetrics() {
    return {
        ...connectionMetrics,
        subscriptions: subscribers.size,
        viewers: viewers.size
    };
}