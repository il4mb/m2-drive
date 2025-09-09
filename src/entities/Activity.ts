import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, Index, ManyToOne, JoinColumn } from "typeorm";
import User from "./User";

@Entity({ name: "activities" })
export class Activity {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Index()
    @Column({ type: 'varchar' })
    userId!: string;

    @ManyToOne(() => User, user => user.id, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user!: User;

    @Index()
    @Column({ type: "varchar", length: 100 })
    type!: string;

    @Column({ type: "text" })
    description!: string;

    @Column({ type: "json", nullable: true })
    metadata?: Record<string, any>;

    @Column({ type: "varchar", length: 45, nullable: true })
    ipAddress?: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    userAgent?: string;

    @CreateDateColumn({ type: "int" })
    createdAt!: number;
}
