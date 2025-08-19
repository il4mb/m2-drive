import { Column, Entity, PrimaryGeneratedColumn, Unique, Index } from "typeorm";

@Entity("contributors")
@Unique(["uId", "fileId", "userId"])
@Index(["uId", "fileId"])
export default class Contributor {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    uId!: string;

    @Column()
    fileId!: string;

    @Column()
    userId!: string; // the actual collaborator

    @Column({ type: "varchar", default: "viewer" })
    role: "viewer" | "editor" = "viewer";
}
