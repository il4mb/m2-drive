import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

export type TaskStatus = "pending" | "processing" | "completed" | "failed";

@Entity("task_queue")
export class Task<T = any> {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    type!: string;

    @Column({ type: "json" })
    payload!: T; // task-specific data

    @Column({ type: "varchar", default: "pending" })
    @Index()
    status!: TaskStatus;

    @Column({ type: "int", default: 0 })
    retryCount!: number;

    @Column({ type: "int" })
    createdAt!: number;

    @Column({ type: "int", nullable: true })
    updatedAt!: number | null;

    @Column({ type: "int", nullable: true })
    startedAt!: number | null;

    @Column({ type: "int", nullable: true })
    completedAt!: number | null;

    @Column({ type: "text", nullable: true })
    error?: string | null;

    @Column({ type: 'int', default: 0 })
    priority?: number;
}
