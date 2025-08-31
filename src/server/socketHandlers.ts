
import { parse } from 'cookie';
import { Server, Socket } from 'socket.io';
import { rulesMiddleware } from './rulesMiddleware';
import { executeQuery } from './database';
import { getTokenById, getUserByToken } from './auth';
import User from '@/entity/User';
import { getConnection } from '@/data-source';
import { QueryConfig } from './database/types';
import { currentTime } from '@/libs/utils';


const setUserAsActive = async (user: User) => {
    const source = await getConnection();
    const userRepository = source.getRepository(User);
    if (user.meta.isActive) {
        return;
    }
    user.meta = {
        ...user.meta,
        isActive: true,
        activeAt: currentTime()
    }
    await userRepository.save(user);
}

const setUserAsInActive = async (user: User) => {
    const source = await getConnection();
    const userRepository = source.getRepository(User);
    if (!user.meta.isActive) {
        return;
    }
    user.meta = {
        ...user.meta,
        isActive: false
    }
    delete user.meta.activeAt;
    await userRepository.save(user);
}

export function setupSocketHandlers(io: Server): void {

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

        const user = socket.data.user as (User | undefined);
        if (user && !user.meta.isActive) {
            setUserAsActive(user);
        }

        rulesMiddleware.setUserContext(user?.id, user);
        socket.on('execute-query', async (queryData: QueryConfig, callback: (response: any) => void) => {
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
        });

        socket.on('disconnect', () => {
            rulesMiddleware.clearUserContext();
            console.log(`Client disconnected: ${socket.id}`);
            if (user) {
                setUserAsInActive(user);
            }
        });
    });
}