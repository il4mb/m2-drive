import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3040;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer(handler);
    const io = new Server(httpServer, {
        cors: {
            origin: "*", // allow all origins for testing, restrict in production
        }
    });

    io.on("connection", (socket) => {
        console.log(`Client connected: ${socket.id}`);

        // Generic event handler for all events
        socket.onAny((event, payload) => {
            console.log(`Received event: ${event}`, payload);

            // Basic validation for expected shape
            if (
                payload &&
                typeof payload.collection === "string" &&
                typeof payload.columns === "object"
            ) {
                // Broadcast to everyone except sender
                // socket.broadcast.emit(event, payload);
                io.emit(event, payload);
            } else {
                console.warn(`Invalid payload for event ${event}`);
            }
        });

        socket.on("disconnect", () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
