
import { parse } from 'cookie';
import { Server, Socket } from 'socket.io';
import { getTokenById, getUserByToken } from './auth';
import User from '@/entity/User';
import { getConnection } from '@/data-source';
import { requestContext } from '@/libs/requestContext';
import { QueryConfig } from './database/types';
import { executeQuery } from './database/queryExecutor';
import { loadAllFunctions } from './funcHelper';
import { currentTime, generateKey } from '@/libs/utils';

const setUserAsActive = async (user: User) => {

    const source = await getConnection();
    const userRepository = source.getRepository(User);

    requestContext.run({ user }, async () => {
        user.meta = {
            ...user.meta,
            isActive: true,
            activeAt: currentTime()
        }
        await userRepository.save(user);
    })
}

const setUserAsInActive = async (user: User) => {
    const source = await getConnection();
    const userRepository = source.getRepository(User);

    requestContext.run({ user }, async () => {

        if (!user.meta.isActive) {
            return;
        }
        user.meta = {
            ...user.meta,
            isActive: false
        }
        delete user.meta.activeAt;
        await userRepository.save(user);
    })
}


export const subscribers = new Map<
    string,
    {
        socket: Socket;
        collection: QueryConfig['collection'];
        conditions?: QueryConfig['conditions'];
    }>();

export function setupSocketHandlers(io: Server): void {

    const functions = loadAllFunctions();

    // Middleware to handle cookies and authentication
    io.use(async (socket, next) => {

        try {

            // Get cookies from handshake headers
            const cookies = parse(socket.handshake.headers.cookie || '');

            // Access specific cookies
            const tokenId = cookies['token-id'];
            if (!tokenId) {
                throw new Error("404: Token id not found!");
            }
            const token = await getTokenById(tokenId);
            const user = await getUserByToken(token);
            socket.data.userId = user.id;
            socket.data.user = user;

            next();
        } catch (error) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket: Socket) => {

        console.log("Client connected", socket.id)

        const user = socket.data.user as (User | undefined);
        if (user && !user.meta.isActive) {
            setUserAsActive(user);
        }

        socket.on(
            'subscribe',
            (data: QueryConfig, callback) => {
                const id = generateKey();
                subscribers.set(id, {
                    socket,
                    collection: data.collection,
                    conditions: data.conditions
                });
                callback(id);
            }
        );

        socket.on('invoke-function', async (data, callback) => {
            requestContext.run({ user }, async () => {
                try {
                    if (typeof data?.function !== "string") {
                        throw new Error("Invalid function name");
                    }
                    if (!functions[data.function]) {
                        throw new Error(`Function "${data.function}" not found`);
                    }
                    const func = functions[data.function];
                    const result = await func(data.args || {});

                    callback({ success: true, data: result });
                } catch (error) {
                    callback({
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                        code: 'EXECUTION_ERROR'
                    });
                }
            });
        });


        socket.on('execute-query', async (queryData: QueryConfig, callback: (response: any) => void) => {
            requestContext.run({ user }, async () => {
                try {
                    const result = await executeQuery(queryData);
                    callback({
                        success: true,
                        data: result,
                        ...(queryData.type == "list" && {
                            count: (result as any)?.length || 0
                        })
                    });

                } catch (error) {
                    console.log(error)
                    callback({
                        success: false,
                        error: error instanceof Error ? error.message : 'Query execution failed',
                        code: 'EXECUTION_ERROR'
                    });
                }
            })
        });

        socket.on("unsubscribe", (id) => {
            subscribers.delete(id);
        });

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
            for (const [id, sub] of subscribers) {
                if (sub.socket.id === socket.id) {
                    subscribers.delete(id);
                }
            }
            if (user) {
                setUserAsInActive(user);
            }
        });
    });
}