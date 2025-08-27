import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity("tokens")
export default class Token {
    
    @PrimaryColumn()
    id!: string;

    @Column()
    uid!: string;

    @Column()
    createdAt!: number;

    @Column()
    expiredAt!: number;
}
