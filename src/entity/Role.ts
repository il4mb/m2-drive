import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("roles")
export default class Role {

    @PrimaryColumn()
    name!: string;

    @Column()
    label!: string;

    @Column({ type: 'json' })
    abilities: string[] = [];

    @Column()
    createdAt!: number;
}
