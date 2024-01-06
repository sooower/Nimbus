import {
    Column,
    CreateDateColumn,
    Entity,
    JoinTable,
    ManyToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";

import { SCHEMA_ACCOUNTS } from "@/constants";

import { Role } from "./role";

@Entity({ schema: SCHEMA_ACCOUNTS })
export class User {
    @PrimaryGeneratedColumn()
    id!: string;

    @Column()
    username!: string;

    @Column()
    password!: string;

    @Column()
    salt!: string;

    @Column({ nullable: true })
    age!: number;

    @Column({ nullable: true })
    gender!: boolean;

    @ManyToMany(() => Role, role => role.users)
    @JoinTable({ schema: SCHEMA_ACCOUNTS, name: "userRole" })
    roles!: Role[];

    @CreateDateColumn({ type: "timestamptz" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt!: Date;
}
