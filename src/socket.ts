"use client";

import { io, Socket } from "socket.io-client";
import { initializeSnapshotManager } from "./libs/websocket/SnapshotManager";

// Encryption utilities
class EncryptionManager {
    private sharedKey: CryptoKey | null = null;
    private ivLength = 12; // 96 bits for AES-GCM

    async generateKeyPair(): Promise<CryptoKeyPair> {
        return crypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: "P-256",
            },
            true,
            ["deriveKey", "deriveBits"]
        );
    }

    async importServerPublicKey(serverPubBase64: string): Promise<CryptoKey> {

        const serverPubRaw = Uint8Array.from(atob(serverPubBase64), c => c.charCodeAt(0));
        return crypto.subtle.importKey(
            "spki",
            serverPubRaw.buffer,
            { name: "ECDH", namedCurve: "P-256" },
            true,
            []
        );
    }


    async deriveSharedKey(clientPrivateKey: CryptoKey, serverPublicKey: CryptoKey): Promise<CryptoKey> {
        return crypto.subtle.deriveKey(
            {
                name: "ECDH",
                public: serverPublicKey,
            },
            clientPrivateKey,
            {
                name: "AES-GCM",
                length: 256,
            },
            false,
            ["encrypt", "decrypt"]
        );
    }

    async exportPublicKey(publicKey: CryptoKey): Promise<string> {
        const rawKey = await crypto.subtle.exportKey("raw", publicKey);
        return btoa(String.fromCharCode(...new Uint8Array(rawKey)));
    }

    async encryptData(data: any): Promise<{ iv: string; encryptedData: string }> {
        if (!this.sharedKey) {
            throw new Error("Shared key not established");
        }

        const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(JSON.stringify(data));

        const encryptedData = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            this.sharedKey,
            encodedData
        );

        return {
            iv: btoa(String.fromCharCode(...iv)),
            encryptedData: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
        };
    }

    async decryptData(ivBase64: string, encryptedDataBase64: string): Promise<any> {
        if (!this.sharedKey) {
            throw new Error("Shared key not established");
        }

        const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
        const encryptedData = Uint8Array.from(atob(encryptedDataBase64), c => c.charCodeAt(0));

        const decryptedData = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            this.sharedKey,
            encryptedData
        );

        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decryptedData));
    }

    setSharedKey(key: CryptoKey): void {
        this.sharedKey = key;
    }

    hasSharedKey(): boolean {
        return this.sharedKey !== null;
    }
}

// Secure Socket Manager
class SecureSocketManager {
    private socket: Socket;
    private encryptionManager: EncryptionManager;
    private isKeyEstablished: boolean = false;
    private messageQueue: any[] = [];

    constructor() {

        this.encryptionManager = new EncryptionManager();
        this.socket = io({
            autoConnect: true,
            transports: ['websocket'],
        });

        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        // Key exchange
        this.socket.on("serverPub", async (serverPubBase64: string) => {
            try {
                await this.handleKeyExchange(serverPubBase64);
                this.processQueuedMessages();
            } catch (error) {
                console.error("Key exchange failed:", error);
                this.socket.emit("keyExchangeError", { error: "Key exchange failed" });
            }
        });

        // Encrypted message handling
        this.socket.on("encryptedMessage", async (data: { iv: string; payload: string }) => {
            try {
                const decryptedData = await this.encryptionManager.decryptData(data.iv, data.payload);
                this.socket.emit("messageReceived", { id: data.iv });
                this.socket.emit("decryptedMessage", decryptedData);
            } catch (error) {
                console.error("Decryption failed:", error);
            }
        });

        // Connection events
        this.socket.on("connect", () => {
            console.log("Secure connection established");
        });

        this.socket.on("disconnect", (reason) => {
            console.log("Disconnected:", reason);
            this.isKeyEstablished = false;
        });

        this.socket.on("connect_error", (error) => {
            console.error("Connection error:", error);
        });
    }

    private async handleKeyExchange(serverPubBase64: string): Promise<void> {

        try {

            const serverPubKey = await this.encryptionManager.importServerPublicKey(serverPubBase64);
            const clientKeys = await this.encryptionManager.generateKeyPair();
            const sharedKey = await this.encryptionManager.deriveSharedKey(clientKeys.privateKey, serverPubKey);

            this.encryptionManager.setSharedKey(sharedKey);
            this.isKeyEstablished = true;

            const clientPubBase64 = await this.encryptionManager.exportPublicKey(clientKeys.publicKey);
            this.socket.emit("clientPub", clientPubBase64, (response: any) => {
                if (response.success) {
                    console.log("Secure shared key established!");
                } else {
                    console.warn(response);
                }
            });

        } catch (err) {
            console.warn(err);
        }
    }

    private processQueuedMessages(): void {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.sendSecureMessage(message);
        }
    }

    async sendSecureMessage(data: any): Promise<void> {
        if (!this.isKeyEstablished) {
            this.messageQueue.push(data);
            return;
        }

        try {
            const encryptedData = await this.encryptionManager.encryptData(data);
            this.socket.emit("encryptedMessage", encryptedData);
        } catch (error) {
            console.error("Encryption failed:", error);
            // Optionally queue for retry or handle error
        }
    }

    async encrypt(data: any) {
        return await this.encryptionManager.encryptData(data);
    }

    getSocket(): Socket {
        return this.socket;
    }

    isConnected(): boolean {
        return this.socket.connected && this.isKeyEstablished;
    }

    disconnect(): void {
        this.socket.disconnect();
    }
}

export const socket = io();
initializeSnapshotManager(socket);