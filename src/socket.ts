"use client";

import { io } from "socket.io-client";
import { initializeSnapshotManager } from "./libs/websocket/SnapshotManager";

export const socket = io({ autoConnect: true, });
initializeSnapshotManager(socket);