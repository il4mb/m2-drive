import { EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent, RemoveEvent } from "typeorm";
import { Server } from "socket.io";
import { entityMap, EntityName } from ".";

export type DatabaseEvent = "INSERT" | "UPDATE" | "DELETE";

export interface DatabaseChangePayload {
    event: DatabaseEvent;
    collection: EntityName;
    data: any;
    timestamp: Date;
    changes?: Record<string, any>;
}

@EventSubscriber()
export class DatabaseSubscriber implements EntitySubscriberInterface {

    afterInsert(event: InsertEvent<any>) {
        this.broadcastChange("INSERT", event);
    }

    afterUpdate(event: UpdateEvent<any>) {
        this.broadcastChange("UPDATE", event);
    }

    afterRemove(event: RemoveEvent<any>) {
        this.broadcastChange("DELETE", event);
    }

    private broadcastChange(eventType: DatabaseEvent, event: InsertEvent<any> | UpdateEvent<any> | RemoveEvent<any>) {
        const collection = event.metadata.name.toLowerCase() as EntityName;
        if (!Object.keys(entityMap).includes(collection)) {
            console.warn(collection, "is not recognize");
            return;
        }
        const payload: DatabaseChangePayload = {
            event: eventType,
            collection,
            data: event.entity,
            timestamp: new Date(),
            changes: (event as any).updatedColumns ? (event as any).updatedColumns.reduce((acc: any, col: any) => {
                acc[col.propertyName] = event.entity[col.propertyName];
                return acc;
            }, {} as Record<string, any>) : undefined
        };

        // Broadcast to all connected Socket.IO clients
        const io = (global as any).ioServer as Server;
        if (io) {
            io.emit("database-change", payload);
            io.emit(`database-change:${collection}`, payload);
        }
    }
}