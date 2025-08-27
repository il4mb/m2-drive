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

    @Column({ type: 'int', default: null, nullable: true })
    updatedAt?: number;

    @Column({ type: 'int', default: null, nullable: true })
    createdAt!: number;

    @Column({ type: "json", default: null, nullable: true })
    meta: Meta = {};
}

type Meta = {
    gender?: "M" | "F";
    avatar?: string;
    role?: string;
    [k: string]: any;
}