// global.d.ts
import { File } from "@/entity/File";
import type { Server as SocketIOServer } from "socket.io";

declare global {
    // Extend the globalThis type
    var ioServer: SocketIOServer | undefined;

    interface FileContextMenu {
        file: File;
    }
}

export interface Unsubscribe {
    (): void;
}

export { };
