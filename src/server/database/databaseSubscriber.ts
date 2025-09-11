// server/database/subscriber.ts
import { EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent, RemoveEvent, EntityMetadata } from "typeorm";

import { EntityMap, entityMap, EntityName } from ".";
import User from "@/entities/User";
import { broadcastRules, BroadcastRule } from "./broadcastRules";
import { databaseRules } from "./databaseRules";
import { getRequestContext } from "@/libs/requestContext";
import { DatabaseChangePayload } from "./types";
import { subscribers } from "../socketHandlers";
import { validateByConditions } from "../objectHelper";
import { getConnection } from "@/data-source";

export type DatabaseEvent = "INSERT" | "UPDATE" | "DELETE";

export interface BroadcastContext<E = any> {
    room: "database" | "collection" | "item";
    user?: User;
    collection: EntityName;
    event: DatabaseEvent;
    data: E;
    previousData?: any;
}

@EventSubscriber()
export class DatabaseSubscriber implements EntitySubscriberInterface {

    /**
     * Get the entity class from metadata
     */
    private getEntityName(metadata: EntityMetadata): EntityName | null {
        const entityName = metadata.name.toLowerCase() as EntityName;
        return Object.keys(entityMap).includes(entityName) ? entityName : null;
    }

    /**
     * Extract data from different event types
     */
    private extractEventData(event: InsertEvent<any> | UpdateEvent<any> | RemoveEvent<any>): {
        data: any;
        previousData?: any;
        changes?: Record<string, any>;
    } {
        if (this.isInsertEvent(event)) {
            return { data: event.entity };
        }

        if (this.isUpdateEvent(event)) {
            const changes = event.updatedColumns?.reduce((acc, col) => {
                acc[col.propertyName] = event.entity?.[col.propertyName];
                return acc;
            }, {} as Record<string, any>);

            return {
                data: event.entity,
                previousData: event.databaseEntity,
                changes
            };
        }

        if (this.isRemoveEvent(event)) {
            return { data: event.entity || event.databaseEntity };
        }

        return { data: null };
    }

    // Type guards for event discrimination
    private isInsertEvent(event: any): event is InsertEvent<any> {
        return 'entity' in event && !('updatedColumns' in event) && !('databaseEntity' in event);
    }

    private isUpdateEvent(event: any): event is UpdateEvent<any> {
        return 'updatedColumns' in event && 'databaseEntity' in event;
    }

    private isRemoveEvent(event: any): event is RemoveEvent<any> {
        return 'databaseEntity' in event && !('updatedColumns' in event);
    }

    afterInsert(event: InsertEvent<any>) {
        this.handleEvent("INSERT", event);
    }

    afterUpdate(event: UpdateEvent<any>) {
        this.handleEvent("UPDATE", event);
    }

    afterRemove(event: RemoveEvent<any>) {
        this.handleEvent("DELETE", event);
    }

    /**
    * Runs before INSERT
    */
    async beforeInsert(event: InsertEvent<any>): Promise<void> {
        await this.checkRules(event, "INSERT");
    }

    /**
     * Runs before UPDATE
     */
    async beforeUpdate(event: UpdateEvent<any>): Promise<void> {
        await this.checkRules(event, "UPDATE");
    }

    /**
     * Runs before DELETE
     */
    async beforeRemove(event: RemoveEvent<any>): Promise<void> {
        await this.checkRules(event, "DELETE");
    }

    /**
     * Centralized rule checking
     */
    private async checkRules(event: InsertEvent<any> | UpdateEvent<any> | RemoveEvent<any>, type: DatabaseEvent) {

        const collection = this.getEntityName(event.metadata);
        if (!collection) {
            console.debug(`Skipping event for unrecognized entity: ${event.metadata.name}`);
            return;
        }

        const ctx = getRequestContext();
        const user = ctx?.user;

        // Extract the data for this event type
        // const { data, previousData } = this.extractEventData(event);
        // const rule = databaseRules[collection] || databaseRules.default;

        // try {
        //     // console.log(rule);
        //     const allowed = await rule({ connection: event.connection, user, collection, event: type, data, previousData });

        //     if (!allowed) {
        //         throw new Error(`Permission denied for ${type} on ${collection}`);
        //     }
        // } catch (error: any) {
        //     throw new Error(`Permission denied: ${error.message}`);
        // }
    }

    /**
     * Handle database events with proper error handling
     */
    private async handleEvent(eventType: DatabaseEvent, event: InsertEvent<any> | UpdateEvent<any> | RemoveEvent<any>) {
        try {

            const collection = this.getEntityName(event.metadata);
            if (!collection) {
                console.debug(`Skipping event for unrecognized entity: ${event.metadata.name}`);
                return;
            }

            let { data, previousData, changes } = this.extractEventData(event);

            if (eventType == "DELETE") {
                const deletedId =
                    (event as RemoveEvent<any>).entity?.id ??
                    (event as RemoveEvent<any>).databaseEntity?.id;

                if (deletedId) {
                    data = { ...data, id: deletedId };
                } else {
                    console.warn(`No ID found for deleted entity in ${collection}`);
                }
            }

            const payload: DatabaseChangePayload & { event: UpdateEvent<any> | InsertEvent<any> | RemoveEvent<any> } = {
                event,
                eventName: eventType,
                collection,
                data: data || {},
                timestamp: new Date(),
                changes: changes || {},
                previousData: previousData || {}
            };

            this.broadcastDatabaseChange(payload, data?.id);

        } catch (error) {
            console.error(`Error handling ${eventType} event:`, error);
        }
    }

    async broadcastDatabaseChange<N extends EntityName, E = InstanceType<EntityMap[N]>>(
        payload: DatabaseChangePayload & { event: UpdateEvent<any> | InsertEvent<any> | RemoveEvent<any> },
        dataId?: string | number
    ) {


        for (const [id, { socket, collection, relations, conditions, debug }] of subscribers) {
            if (collection != payload.collection) {
                if (debug) {
                    console.log("SKIPED", payload.eventName, collection, payload.collection);
                }
                continue;
            }
            const uid = socket.data?.uid;
            const isGuest = socket.data?.isAuthenticated || true;

            let data = payload.data;
            const previousData = payload.previousData;
            if (["INSERT", "UPDATE"].includes(payload.eventName) && relations?.length > 0) {
                const relationFields = payload.event.metadata.relations.map(rel => rel.propertyName);
                if (relationFields.length <= 0 || relationFields.some(e => !relationFields.includes(e))) {
                    if (debug) {
                        console.log("RELATION NOT VALID OR NOT EXIST");
                    }
                    continue;
                }

                try {

                    const repo = payload.event.manager.getRepository(payload.event.metadata.target as any);
                    const entityWithRelations = await repo.findOne({
                        where: { id: dataId },
                        relations
                    });

                    if (entityWithRelations) {
                        data = { ...data, ...entityWithRelations };
                    }
                } catch (err) {
                    console.warn(`Failed to load relations for ${collection}:`, err);
                }
            }

            const isValid = validateByConditions(data || {}, conditions);
            const isValid2 = validateByConditions(previousData || {}, conditions);

            if (payload.eventName != "DELETE" && !isValid && !isValid2) {
                if (debug) {
                    console.log("SKIP EVENT", payload.collection, payload.eventName, "to", uid, isValid, isValid2);
                }
                continue;
            }


            const user = (!isGuest ? (await payload.event.manager.getRepository(User).findOneBy({ id: uid })) : undefined) || undefined;

            const context: BroadcastContext<E> = {
                room: dataId
                    ? "item"
                    : payload.collection
                        ? "collection"
                        : "database",
                user,
                collection,
                event: payload.eventName,
                data: payload.data,
                previousData: payload.previousData,
            };

            try {
                // const allowed = await rule(context);
                // if (!allowed) {
                //     if (debug) {
                //         console.log("SKIPPED", "RULE NOT ALLOWED");
                //     }
                //     continue;
                // }

                // remove typeorm Event entity to prevent unexpected error
                const { event, ...safe } = payload;
                if (debug) {
                    console.log("EMIT EVENT TO", uid);
                }
                socket.emit(`change-${id}`, { ...safe, data });

            } catch (error) {
                console.error(
                    `Error applying broadcast rule for socket ${socket.id}:`,
                    error
                );
            }
        }
    }

    /**
     * Subscribe to all entity dynamically
     */
    listenTo(): Function | string {
        return Object; // Listen to all entity
    }
}

// Singleton instance for manual broadcasting
export const databaseSubscriber = new DatabaseSubscriber();