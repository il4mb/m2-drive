import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class Options {
    @PrimaryColumn()
    id!: string;
    @Column()
    value!: string;
}

export type IOptions = InstanceType<typeof Options>;
