import { CreateDateColumn, Entity, UpdateDateColumn } from "typeorm";

export class Base {
    @CreateDateColumn({ type: "timestamptz" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt!: Date;
}
