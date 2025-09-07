import { parse } from 'cookie';
import { Server, Socket } from 'socket.io';
import { getTokenById, getUserByToken } from './auth';
import { requestContext } from '@/libs/requestContext';
import { QueryConfig } from './database/types';
import { executeQuery } from './database/queryExecutor';
import { loadAllFunctions } from './funcHelper';
import { currentTime, generateKey } from '@/libs/utils';
import Token from '@/entity/Token';
import { generateIndonesianAnimalName } from './animal-names';


// Define types for better type safety
interface UserMeta {
    isActive?: boolean;
    activeAt?: number;
    lastSeen?: number;
    connectionCount?: number;
    [key: string]: any;
}

export interface RoomUser<T = Record<string, any>> {
    isGuest: boolean;
    userId: string | null;
    joinedAt: number;
    lastActivity: number;
    metadata?: Record<string, any>;
    displayName?: string;
}

export interface Room<T = Record<string, any>> {
    users: Map<string, RoomUser<T>>;
    createdAt: number;
    updatedAt?: number;
    isPublic: boolean;
    maxUsers: number;
    createdBy?: string;
}

interface Subscription {
    socket: CustomSocket;
    collection: QueryConfig['collection'];
    conditions?: QueryConfig['conditions'];
    debug?: boolean;
    createdAt: number;
}

export interface Viewer {
    displayName: string;
    isGuest?: boolean;
    uid?: string | null;
    path: string[][];
}

// Track metrics for monitoring
const connectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    maxConcurrentConnections: 0,
    functionInvocations: 0,
    queryExecutions: 0,
    guestConnections: 0,
};

// Guest user management
const guestUsers = new Map<string, {
    socket: Socket;
    createdAt: number;
    lastActivity: number;
    displayName?: string;
}>();

export const subscribers = new Map<string, Subscription>();
export const rooms = new Map<string, Room>();
export const activeUsers = new Map<string, { socket: CustomSocket; joinedAt: number }>();
export const viewers = new Map<string, Viewer>();

// Rate limiting - different limits for authenticated users and guests
const rateLimits = new Map<string, { count: number; lastReset: number; isGuest: boolean }>();
const RATE_LIMIT_WINDOW = 20000; // 1 minute
const MAX_REQUESTS_PER_MINUTE_AUTH = 10000;
const MAX_REQUESTS_PER_MINUTE_GUEST = 1000;

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


function isChildPathOf(parent: string[], child: string[]) {
    if (child.length < parent.length) return false;
    return parent.every((id, idx) => id === child[idx]);
}

function broadcastViewers(io: Server, affectedPaths?: string[][]) {
    for (const [socketId, viewer] of viewers.entries()) {
        const socketInstance = io.sockets.sockets.get(socketId);
        if (!socketInstance) continue;

        if (affectedPaths && !viewer.path.some(vp =>
            affectedPaths.some(ap => isChildPathOf(ap, vp) || isChildPathOf(vp, ap))
        )) {
            continue; // skip if no overlap
        }

        const visibleViewers = [...viewers.values()]
            .filter(v =>
                viewer.path.some(parentPath =>
                    v.path.some(childPath => isChildPathOf(parentPath, childPath))
                )
            )
            .map(v => ({
                uid: v.uid,
                isGuest: v.isGuest,
                displayName: v.displayName,
                path: v.path
            }));

        socketInstance.emit("viewers-change", visibleViewers);
    }
}



function normalizePaths(path: string | string[] | string[][]): string[][] {
    if (Array.isArray(path)) {
        if (Array.isArray(path[0])) {
            return path as string[][];
        }
        return [path as string[]];
    }
    return [[path]];
}

type Result = {
    success: boolean;
    error?: string;
    code?: string;
    retryAfter?: number;
    data?: any;
}
type CustomSocket = Omit<Socket, 'data'> & {
    data: {
        displayName: string;
        isGuest: boolean;
        uid: string;
        token: Token | null;
    }
}


export function setupSocketHandlers(io: Server): void {
    const functions = loadAllFunctions();

    io.use(async (socket: CustomSocket, next) => {

        socket.data.displayName = generateIndonesianAnimalName();
        socket.data.isGuest = true;
        socket.data.uid = generateKey(18);
        socket.data.token = null;

        try {

            const cookies = parse(socket.handshake.headers.cookie || '');
            const tokenId = cookies['token-id'];

            if (tokenId) {
                // Authenticated user
                const token = await getTokenById(tokenId);
                if (!token) {
                    throw new Error('Invalid token');
                }

                const user = await getUserByToken(token);
                if (!user) {
                    throw new Error('User not found');
                }

                socket.data.token = token;
                socket.data.uid = user.id;
                socket.data.displayName = user.name;
                socket.data.isGuest = false;
            }

            next();
        } catch (error) {
            console.error('Authentication error:', error);
            connectionMetrics.guestConnections++;
            next();
        }
    });

    io.on('connection', (socket: CustomSocket) => {

        socket.on("viewer-join", (path: string | string[] | string[][]) => {
            if (!viewers.has(socket.id)) {
                viewers.set(socket.id, {
                    isGuest: socket.data.isGuest,
                    displayName: socket.data.displayName,
                    uid: socket.data.uid,
                    path: []
                });
            }

            const viewer = viewers.get(socket.id)!;
            const newPaths = normalizePaths(path);

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
                // Keep vp only if it's NOT equal to or a child of any leave path
                !leavePaths.some(lp =>
                    JSON.stringify(lp) === JSON.stringify(vp) || isChildPathOf(lp, vp)
                )
            );

            if (viewer.path.length === 0) {
                viewers.delete(socket.id);
            }

            broadcastViewers(io);
        });


        console.log(`Client connected: ${socket.id}, Name: ${socket.data.displayName}`);
        connectionMetrics.totalConnections++;
        connectionMetrics.activeConnections++;
        connectionMetrics.maxConcurrentConnections = Math.max(
            connectionMetrics.maxConcurrentConnections,
            connectionMetrics.activeConnections
        );

        // Heartbeat for connection monitoring
        const heartbeatInterval = setInterval(() => {
            socket.emit('heartbeat');
        }, 30000);

        socket.on("session-validate", async () => {
            try {
                const cookies = parse(socket.handshake.headers.cookie || '');
                const tokenId = cookies['token-id'];

                if (!tokenId) {
                    socket.emit("session-change", null);
                    return;
                }

                const token = await getTokenById(tokenId);
                const user = await getUserByToken(token);

                socket.data.token = token;
                socket.data.uid = user.id;
                socket.data.isGuest = false;

                activeUsers.set(user.id, { socket, joinedAt: currentTime() });
                socket.emit("session-change", user.id);

                // Send active users list to the newly authenticated user
                const activeUserIds = Array.from(activeUsers.keys());
                socket.emit("active-users-change", activeUserIds);

                // Notify all users about the new active user
                io.emit("active-users-change", activeUserIds);

            } catch (error: any) {
                console.error("Session validation error:", error);
                socket.data.isGuest = true;
                socket.emit("session-change", null);
            }
        });

        // Set guest display name
        socket.on('guest-set-name', (displayName: string) => {
            if (!socket.data.isGuest) {
                socket.emit('error', { message: 'Only guests can set display names' });
                return;
            }

            const guestId = socket.id;
            const guestData = guestUsers.get(guestId) || {
                socket,
                createdAt: currentTime(),
                lastActivity: currentTime()
            };

            guestData.displayName = displayName;
            guestData.lastActivity = currentTime();
            guestUsers.set(guestId, guestData);

            // Update in all rooms
            for (const [roomId, room] of rooms) {
                const userEntry = room.users.get(guestId);
                if (userEntry) {
                    userEntry.displayName = displayName;
                    userEntry.lastActivity = currentTime();

                    // Convert Map to object for emitting
                    const roomUsersObj = Object.fromEntries(room.users);
                    io.to(roomId).emit('room-change', {
                        id: roomId,
                        users: roomUsersObj,
                        createdAt: room.createdAt,
                        updatedAt: currentTime(),
                        isPublic: room.isPublic,
                        maxUsers: room.maxUsers
                    });
                }
            }

            socket.emit('guest-name-set', { displayName });
        });

        socket.on('subscribe', (data: QueryConfig, callback: (data: Result) => void) => {
            const isGuest = socket.data.isGuest;
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

            // Guests have limited subscription capabilities
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
                    debug: data.debug,
                    createdAt: currentTime()
                });

                callback({ success: true, data: { subscriptionId: id } });
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
            const isGuest = socket.data.isGuest;
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

            // Check if guest is allowed to call this function
            if (isGuest) {
                const functionName = data.function;
                // Define which functions guests can call
                const allowedGuestFunctions = ['filePreflight'];

                if (!allowedGuestFunctions.includes(functionName)) {
                    callback({
                        success: false,
                        error: 'Guests are not allowed to call this function',
                        code: 'UNAUTHORIZED',
                    });
                    return;
                }
            }

            try {
                const user = isGuest ? null : await getUserByToken(socket.data.token!);

                await requestContext.run({ user }, async () => {
                    try {
                        if (typeof data?.function !== 'string') {
                            throw new Error('Invalid function name');
                        }

                        if (!functions[data.function]) {
                            throw new Error(`Function "${data.function}" not found`);
                        }

                        const func = functions[data.function];
                        const result = await func(data.args || {});

                        callback({ success: true, data: result });
                    } catch (error) {
                        console.error('Function invocation error:', error);
                        callback({
                            success: false,
                            error: error instanceof Error ? error.message : String(error),
                            code: 'EXECUTION_ERROR',
                        });
                    }
                });
            } catch (error) {
                console.error('Error getting user for function invocation:', error);
                callback({
                    success: false,
                    error: 'Authentication error',
                    code: 'AUTH_ERROR',
                });
            }
        });

        socket.on('execute-query', async (queryData: QueryConfig, callback) => {
            const isGuest = socket.data.isGuest;
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

            // // Guests can only execute public queries
            // if (isGuest) {
            //     callback({
            //         success: false,
            //         error: 'Guests cannot execute queries',
            //         code: 'UNAUTHORIZED',
            //     });
            //     return;
            // }

            try {
                const user = socket.data.token ? await getUserByToken(socket.data.token) : undefined;
                await requestContext.run({ user }, async () => {
                    try {
                        const result = await executeQuery(queryData);
                        const response: any = {
                            success: true,
                            data: result,
                        };

                        if (queryData.type === 'list') {
                            response.count = Array.isArray(result) ? result.length : 0;
                        }

                        callback(response);
                    } catch (error) {
                        console.error('Query execution error:', error);
                        callback({
                            success: false,
                            error: error instanceof Error ? error.message : 'Query execution failed',
                            code: 'EXECUTION_ERROR',
                        });
                    }
                });
            } catch (error) {
                console.error('Error getting user for query execution:', error);
                callback({
                    success: false,
                    error: 'Authentication error',
                    code: 'AUTH_ERROR',
                });
            }
        });

        socket.on('unsubscribe', (id: string) => {
            subscribers.delete(id);
        });





        type RoomPayload = {
            id: string,
            isPublic: boolean,
            maxUsers: number;
            createdBy?: string;
        }

        socket.on('room-join', (data: string | RoomPayload, userData: Partial<RoomUser> = {}) => {

            const isGuest = socket.data.isGuest;
            const userId = socket.data.uid;
            const roomId = typeof data === "string" ? data : data.id;
            const isPublic = typeof data === "string" ? true : data.isPublic;
            const maxUsers = typeof data === "string" ? 100 : data.maxUsers;
            const createdBy = typeof data !== "string" ? data.createdBy : userId || undefined;

            try {

                if (!rooms.has(roomId)) {

                    rooms.set(roomId, {
                        createdAt: currentTime(),
                        users: new Map(),
                        isPublic,
                        maxUsers,
                        createdBy
                    });
                }

                const room = rooms.get(roomId)!;

                // Check if room is private and user is guest
                if (!room.isPublic && isGuest) {
                    socket.emit('room-error', {
                        error: 'This room is private',
                        roomId,
                    });
                    return;
                }

                const socketId = socket.id;
                const roomUsers = room.users;
                const alreadyJoined = roomUsers.has(socketId);

                if (!alreadyJoined) {
                    if (roomUsers.size >= room.maxUsers) {
                        socket.emit('room-error', {
                            error: 'Room is full',
                            roomId,
                        });
                        return;
                    }

                    roomUsers.set(socketId, {
                        isGuest,
                        userId,
                        joinedAt: currentTime(),
                        lastActivity: currentTime(),
                        metadata: userData.metadata || {},
                        displayName: isGuest ?
                            (guestUsers.get(socketId)?.displayName || `Guest_${socketId.slice(-4)}`) :
                            undefined
                    });

                    room.updatedAt = currentTime();
                }

                socket.join(roomId);

                // Convert Map to object for emitting
                const roomUsersObj = Object.fromEntries(room.users);
                io.to(roomId).emit('room-change', {
                    id: roomId,
                    users: roomUsersObj,
                    createdAt: room.createdAt,
                    updatedAt: room.updatedAt,
                    isPublic: room.isPublic,
                    maxUsers: room.maxUsers,
                    createdBy: room.createdBy
                });
            } catch (error) {
                console.error('Room join error:', error);
                socket.emit('room-error', {
                    error: 'Failed to join room',
                    roomId,
                });
            }
        });

        socket.on('room-update', (roomId: string, newData: Partial<RoomUser>) => {
            const room = rooms.get(roomId);
            if (room) {
                const userEntry = room.users.get(socket.id);
                if (userEntry) {
                    room.users.set(socket.id, {
                        ...userEntry,
                        ...newData,
                        lastActivity: currentTime(),
                    });

                    room.updatedAt = currentTime();

                    // Convert Map to object for emitting
                    const roomUsersObj = Object.fromEntries(room.users);
                    io.to(roomId).emit('room-change', {
                        id: roomId,
                        users: roomUsersObj,
                        createdAt: room.createdAt,
                        updatedAt: room.updatedAt,
                        isPublic: room.isPublic,
                        maxUsers: room.maxUsers,
                        createdBy: room.createdBy
                    });
                }
            }
        });

        socket.on('room-leave', (roomId: string) => {
            const room = rooms.get(roomId);
            if (room) {
                room.users.delete(socket.id);
                room.updatedAt = currentTime();

                socket.leave(roomId);

                if (room.users.size === 0) {
                    // Remove empty rooms
                    rooms.delete(roomId);
                } else {
                    // Convert Map to object for emitting
                    const roomUsersObj = Object.fromEntries(room.users);
                    io.to(roomId).emit('room-change', {
                        id: roomId,
                        users: roomUsersObj,
                        createdAt: room.createdAt,
                        updatedAt: room.updatedAt,
                        isPublic: room.isPublic,
                        maxUsers: room.maxUsers,
                        createdBy: room.createdBy
                    });
                }
            }
        });

        socket.on('get-metrics', (callback) => {
            // Only authenticated admin users can access metrics
            if (socket.data.isGuest || !socket.data.token) {
                callback({
                    success: false,
                    error: 'Unauthorized',
                    code: 'UNAUTHORIZED',
                });
                return;
            }

            // In a real implementation, you would check if the user is an admin
            callback({
                success: true,
                data: {
                    ...connectionMetrics,
                    activeUsers: activeUsers.size,
                    guestUsers: guestUsers.size,
                    rooms: rooms.size,
                    subscriptions: subscribers.size,
                },
            });
        });



        socket.on('get-metrics', (callback) => {
            callback({ success: true, data: getConnectionMetrics() });
        });

        socket.on('get-rooms', (callback) => {
            const roomsData = Array.from(rooms.entries()).map(([id, room]) => ({
                id,
                users: Object.fromEntries(room.users),
                createdAt: room.createdAt,
                updatedAt: room.updatedAt,
                isPublic: room.isPublic,
                maxUsers: room.maxUsers,
                createdBy: room.createdBy
            }));
            callback({ success: true, data: roomsData });
        });

        socket.on('get-viewers', (callback) => {
            const viewersData = Array.from(viewers.values());
            callback({ success: true, data: viewersData });
        });

        socket.on('get-active-users', (callback) => {
            const activeUsersData = Array.from(activeUsers.entries()).map(([userId, data]) => ({
                socketId: data.socket.id,
                userId,
                joinedAt: data.joinedAt,
                isGuest: data.socket.data.isGuest,
                displayName: data.socket.data.displayName
            }));
            callback({ success: true, data: activeUsersData });
        });

        // Admin actions
        socket.on('admin-kick-user', ({ socketId }, callback) => {
            const targetSocket = io.sockets.sockets.get(socketId);
            if (targetSocket) {
                targetSocket.disconnect(true);
                callback({ success: true });
            } else {
                callback({ success: false, error: 'User not found' });
            }
        });

        socket.on('admin-delete-room', ({ roomId }, callback) => {
            if (rooms.has(roomId)) {
                // Notify all users in the room
                io.to(roomId).emit('room-closed', { reason: 'admin_action' });
                // Disconnect all users from the room
                io.in(roomId).socketsLeave(roomId);
                // Remove the room
                rooms.delete(roomId);
                callback({ success: true });
            } else {
                callback({ success: false, error: 'Room not found' });
            }
        });





        socket.on('disconnect', (reason) => {
            console.log(`Client disconnected: ${socket.id}, Reason: ${reason}, Guest: ${socket.data.isGuest}`);

            // Clean up intervals
            clearInterval(heartbeatInterval);

            // Remove from active users or guest users
            if (socket.data.isGuest) {
                guestUsers.delete(socket.id);
            } else if (socket.data.uid) {
                activeUsers.delete(socket.data.uid);

                // Notify all users about the user leaving
                const activeUserIds = Array.from(activeUsers.keys());
                io.emit("active-users-change", activeUserIds);
            }

            // Clean up subscriptions
            for (const [id, sub] of subscribers) {
                if (sub.socket.id === socket.id) {
                    subscribers.delete(id);
                }
            }

            // Clean up rooms
            for (const [roomId, room] of rooms) {
                if (room.users.has(socket.id)) {
                    room.users.delete(socket.id);
                    room.updatedAt = currentTime();

                    if (room.users.size === 0) {
                        rooms.delete(roomId);
                    } else {
                        // Convert Map to object for emitting
                        const roomUsersObj = Object.fromEntries(room.users);
                        io.to(roomId).emit('room-change', {
                            id: roomId,
                            users: roomUsersObj,
                            createdAt: room.createdAt,
                            updatedAt: room.updatedAt,
                            isPublic: room.isPublic,
                            maxUsers: room.maxUsers,
                            createdBy: room.createdBy
                        });
                    }
                }
            }

            if (viewers.has(socket.id)) {
                const viewer = viewers.get(socket.id)!;
                const leavePaths = viewer.path; // all paths they were viewing
                viewers.delete(socket.id); // remove from map
                broadcastViewers(io, leavePaths); // notify relevant clients
            }

            connectionMetrics.activeConnections--;
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });

    // Clean up old subscriptions and inactive guests periodically
    setInterval(() => {
        const now = currentTime();

        // Remove subscriptions older than 24 hours
        for (const [id, sub] of subscribers) {
            if (now - sub.createdAt > 24 * 60 * 60 * 1000) {
                subscribers.delete(id);
            }
        }

        // Remove inactive guests (no activity for 1 hour)
        for (const [guestId, guestData] of guestUsers) {
            if (now - guestData.lastActivity > 60 * 60 * 1000) {
                guestUsers.delete(guestId);

                // Remove from rooms
                for (const [roomId, room] of rooms) {
                    if (room.users.has(guestId)) {
                        room.users.delete(guestId);
                        room.updatedAt = currentTime();

                        if (room.users.size === 0) {
                            rooms.delete(roomId);
                        } else {
                            // Convert Map to object for emitting
                            const roomUsersObj = Object.fromEntries(room.users);
                            io.to(roomId).emit('room-change', {
                                id: roomId,
                                users: roomUsersObj,
                                createdAt: room.createdAt,
                                updatedAt: room.updatedAt,
                                isPublic: room.isPublic,
                                maxUsers: room.maxUsers,
                                createdBy: room.createdBy
                            });
                        }
                    }
                }
            }
        }
    }, 60 * 60 * 1000); // Every hour
}

// Export metrics for monitoring
export function getConnectionMetrics() {
    return {
        ...connectionMetrics,
        activeUsers: activeUsers.size,
        guestUsers: guestUsers.size,
        rooms: rooms.size,
        subscriptions: subscribers.size
    };
}