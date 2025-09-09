import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("roles")
export default class Role {

    @PrimaryColumn()
    id!: string;

    @Column()
    label!: string;

    @Column({ type: 'json' })
    abilities: string[] = [];

    @Column()
    createdAt!: number;
}
