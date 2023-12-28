import crypto from "crypto";
import {
    Body,
    Controller,
    Param,
    Post,
    Put,
} from "@/core/decorators/routeDecorator";
import { ds } from "@/core/components/dataSource";
import { User } from "@/entities/user";
import { CacheClient } from "@/core/components/cacheClient";
import { ServiceError } from "@/core/errors";
import { Commons } from "@/core/utils/commons";
import { Jwt } from "@/core/components/jwt";
import { UserLoginDto, UserRegisterDto } from "@/models/user";
import { NonAuth } from "@/core/decorators/nonAuthDecorator";
import { KEY_USER_TOKEN } from "@/core/constants";

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
        user.password = Commons.encryptPassword(userRegisterDto.password, salt);
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
            !Commons.comparePassword(
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
            Commons.generateCacheKey(KEY_USER_TOKEN, userRecord.id),
            token,
        );

        return token;
    }

    @Put("/logout/:id")
    async logout(@Param("id") id: string) {
        const res = await CacheClient.remove(
            Commons.generateCacheKey(KEY_USER_TOKEN, id),
        );

        if (!res) {
            throw new ServiceError("Please login first.");
        }

        return {};
    }
}
