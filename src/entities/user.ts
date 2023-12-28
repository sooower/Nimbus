import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { Base } from "@/entities/base";

@Entity({ schema: "business" })
export class User extends Base {
    @PrimaryGeneratedColumn()
    id!: string;

    @Column()
    username!: string;

    @Column()
    password!: string;

    @Column()
    salt!: string;

    @Column({
        nullable: true,
    })
    age!: number;

    @Column({
        nullable: true,
    })
    gender!: boolean;
}
