import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";

import { SCHEMA_ACCOUNTS } from "@/constants";

import { Role } from "./role";

@Entity({ schema: SCHEMA_ACCOUNTS })
export class Permission {
    @PrimaryGeneratedColumn()
    id!: string;

    @Column()
    name!: string;

    @Column({ nullable: true })
    remark!: string;

    @ManyToMany(() => Role, role => role.permissions)
    roles!: Role[];

    @CreateDateColumn({ type: "timestamptz" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt!: Date;
}
