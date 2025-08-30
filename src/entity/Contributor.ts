import { Column, Entity, PrimaryGeneratedColumn, Unique, Index, ManyToOne, JoinColumn } from "typeorm";
import User from "./User";
import { File } from "./File";

@Entity("contributors")
@Unique(["fileId", "userId"])
@Index(["fileId"])
export default class Contributor {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    fileId!: string;

    @ManyToOne(() => File, file => file.id, { onDelete: "CASCADE" })
    @JoinColumn({ name: "fileId" })
    file!: File;

    @Column()
    userId!: string;

    @ManyToOne(() => User, user => user.id, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user!: User;

    @Column({ type: "varchar", default: "viewer" })
    role: "viewer" | "editor" = "viewer";

    @Column()
    createdAt!: number;

    @Column({ type: "int", default: null, nullable: true })
    updatedAt: number | null = null;
}
