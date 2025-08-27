import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity("users")
@Unique(['id', 'email'])
@Index(['id', 'email'])
export default class User {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    email!: string;

    @Column()
    password!: string;

    @Column()
    name!: string;

    @Column({ type: "json", default: null, nullable: true })
    meta: Meta | null = null;
}

type Meta = {
    gender: "M" | "F";
    tags: string[];
    [k: string]: any;
}