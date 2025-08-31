import "reflect-metadata";
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { startTaskQueue } from "./src/server/taskQueue";
import { getConnection } from "@/data-source";
import { setupSocketHandlers } from "@/server/socketHandlers";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3040;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(async () => {

    await getConnection();
    startTaskQueue();

    const httpServer = createServer(handler);
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
        }
    });
    (globalThis as typeof globalThis & { ioServer?: Server }).ioServer = io;
    setupSocketHandlers(io);

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
