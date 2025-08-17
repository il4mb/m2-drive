import { Column, Entity, PrimaryColumn, Unique } from "typeorm";

@Entity('files')
@Unique(['id', 'uId', 'name', 'fId'])
export class DriveFile {

    @PrimaryColumn()
    id!: string;

    @Column()
    uId!: string;

    @Column({ type: 'varchar', nullable: true })
    fId: string | null = null;

    @Column()
    name!: string;

    @Column()
    type!: string;

    @Column({ type: "json", default: null, nullable: true })
    meta: FileMeta | null = null;

    @Column({ type: 'int' })
    createdAt!: number;

    @Column({ type: 'int', default: null, nullable: true })
    updatedAt: number | null = null;
}

type FileMeta = {

}
export type IDriveFile = InstanceType<typeof DriveFile>;