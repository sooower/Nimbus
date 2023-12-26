import crypto from "crypto";

import { CacheClient } from "@/core/components/cacheClient";
import { ds } from "@/core/components/dataSource";
import { Jwt } from "@/core/components/jwt";
import { KEY_USER_TOKEN } from "@/core/constants";
import { NonAuth } from "@/core/decorators/nonAuthDecorator";
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
    private userRepository = ds.getRepository(User);

    @Post("/register")
    @NonAuth
    async register(@Body() userRegisterDto: UserRegisterDto) {
        if (userRegisterDto.password !== userRegisterDto.confirmedPassword) {
            throw new ServiceError(
                "`password` is not matched with `confirmedPassword`.",
            );
        }

        const userRecord = await this.userRepository.find({
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
        } = await this.userRepository.save(user);

        return o;
    }

    @Put("/login")
    @NonAuth
    async login(@Body() userLoginDto: UserLoginDto) {
        const userRecord = await this.userRepository.findOne({
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
        const token = Jwt.sign({ userId: userRecord.id });
        await CacheClient.setWithTTL(
            generateCacheKey(KEY_USER_TOKEN, userRecord.id),
            token,
        );

        return token;
    }

    @Put("/logout/:id")
    async logout(@Param("id") id: string) {
        const res = await CacheClient.remove(
            generateCacheKey(KEY_USER_TOKEN, id),
        );

        if (!res) {
            throw new ServiceError("Please login first.");
        }

        return {};
    }
}
