import { ServiceError } from "@/core/errors";
import crypto from "crypto";
import { User } from "@/entities/user";
import { Commons } from "@/core/utils";
import { UserLoginDto, UserRegisterDto } from "@/models/user";
import { DS } from "@/core/components/dataSource";
import { Jwt } from "@/core/components/jwt";
import { CacheClient } from "@/core/components/cacheClient";
import { KEY_USER_TOKEN } from "@/core/constants";
import { Injectable } from "@/core/decorators/injectionDecorator";

@Injectable()
export class UserService {
    private userRepository = DS.getRepository(User);

    async register(userRegisterDto: UserRegisterDto) {
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

    async login(userLoginDto: UserLoginDto) {
        const userRecord = await this.userRepository.findOne({
            select: ["id", "salt", "password"],
            where: {
                username: userLoginDto.username,
            },
        });

        if (userRecord === null) {
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
}
