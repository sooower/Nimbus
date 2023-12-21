import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { Base } from "./base";

@Entity({ schema: "business" })
export class User extends Base {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column()
    age!: number;

    @Column()
    gender!: boolean;
}
