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

import { Permission } from "./permission";
import { User } from "./user";

@Entity({ schema: SCHEMA_ACCOUNTS })
export class Role {
    @PrimaryGeneratedColumn()
    id!: string;

    @Column()
    name!: string;

    @Column({ nullable: true })
    remark!: string;

    @ManyToMany(() => User, user => user.roles)
    users!: User[];

    @ManyToMany(() => Permission, permission => permission.roles)
    @JoinTable({ schema: SCHEMA_ACCOUNTS, name: "rolePermission" })
    permissions!: Permission[];

    @CreateDateColumn({ type: "timestamptz" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt!: Date;
}
