import crypto from "crypto";

import { DS } from "@/core/components/dataSource";
import { Jwt } from "@/core/components/jwt";
import { KEY_USER_TOKEN } from "@/core/constants";
import { Injectable } from "@/core/decorators/injectionDecorator";
import { ServiceError } from "@/core/errors";
import { RedisService, TimeUnit } from "@/core/services/redisService";
import { Commons } from "@/core/utils/commons";
import { User } from "@/entities/accounts/user";
import { UserLoginDto, UserRegisterDto } from "@/models/accounts/user";

@Injectable()
export class UserService {
    private userRepository = DS.getRepository(User);

    constructor(private redisService: RedisService) {}

    async register(userRegisterDto: UserRegisterDto) {
        if (userRegisterDto.password !== userRegisterDto.confirmedPassword) {
            throw new ServiceError("`password` is not matched with `confirmedPassword`.");
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

        const { password, salt: resSalt, ...o } = await this.userRepository.save(user);

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
        if (!Commons.comparePassword(userLoginDto.password, userRecord.salt, userRecord.password)) {
            throw new ServiceError("Password is not matched.");
        }

        // Jwt signature
        const token = Jwt.sign({ userId: userRecord.id });
        await this.redisService.setWithTTL(
            Commons.generateCacheKey(KEY_USER_TOKEN, String(userRecord.id)),
            token,
            30,
            TimeUnit.Day,
        );

        return token;
    }
}
