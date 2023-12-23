import crypto from "crypto";

import { CacheClient } from "@/core/components/cacheClient";
import { ds } from "@/core/components/dataSource";
import { Jwt } from "@/core/components/jwt";
import {
    Body,
    Controller,
    Param,
    Post,
    Put,
} from "@/core/decorators/routeDecorator";
import { ServiceError } from "@/core/errors";
import {
    comparePassword,
    encryptPassword,
    generateCacheKey,
} from "@/core/utils";
import { User } from "@/entities/user";
import { UserLoginDto, UserRegisterDto } from "@/models/user";

@Controller("/users")
export class UserController {
    @Post("/register")
    async register(@Body() userRegisterDto: UserRegisterDto) {
        const userRepository = ds.getRepository(User);

        if (userRegisterDto.password !== userRegisterDto.confirmedPassword) {
            throw new ServiceError(
                "`password` is not matched with `confirmedPassword`.",
            );
        }

        const userRecord = await userRepository.find({
            select: ["username"],
            where: {
                username: userRegisterDto.username,
            },
        });
        if (userRecord.length > 0) {
            throw new ServiceError("`username` has exists.");
        }

        const salt = crypto.randomBytes(16).toString("hex");

        const user = new User();
        user.username = userRegisterDto.username;
        user.password = encryptPassword(userRegisterDto.password, salt);
        user.salt = salt;

        const {
            password,
            salt: resSalt,
            ...o
        } = await userRepository.save(user);

        return o;
    }

    @Put("/login")
    async login(@Body() userLoginDto: UserLoginDto) {
        const userRepository = ds.getRepository(User);

        const userRecord = await userRepository.findOne({
            select: ["id", "salt", "password"],
            where: {
                username: userLoginDto.username,
            },
        });

        if (!userRecord) {
            throw new ServiceError("`username` not found.");
        }

        // Compare password
        if (
            !comparePassword(
                userLoginDto.password,
                userRecord.salt,
                userRecord.password,
            )
        ) {
            throw new ServiceError("Password is not matched.");
        }

        // Jwt signature
        const token = Jwt.sign({ useId: userRecord.id });
        await CacheClient.setWithTTL(
            generateCacheKey("user@token", userRecord.id),
            token,
        );

        return token;
    }

    @Put("/logout/:id")
    async logout(@Param("id") id: string) {
        const res = await CacheClient.remove(
            generateCacheKey("user@token", id),
        );

        if (!res) {
            throw new ServiceError("Cannot logout again.");
        }

        return;
    }
}
