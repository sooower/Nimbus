import crypto from "node:crypto";

import { KEY_USER_TOKEN } from "@/common/constants";
import { Injectable } from "@/common/decorators/injectionDecorator";
import { ServiceError } from "@/common/errors";
import { cacheService } from "@/common/services/cacheService";
import { dataSourceService } from "@/common/services/dataSourceService";
import { jwtService } from "@/common/services/jwtService";
import { CommonUtil, TimeUnit } from "@/common/utils/commonUtil";
import { User } from "@/modules/accounts/entities/user";
import { UserLoginDto, UserRegisterDto } from "@/modules/accounts/models/user";

@Injectable()
export class UserService {
    private userRepository = dataSourceService.getRepository(User);

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
        user.password = CommonUtil.encryptPassword(userRegisterDto.password, salt);
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
        if (
            !CommonUtil.comparePassword(userLoginDto.password, userRecord.salt, userRecord.password)
        ) {
            throw new ServiceError("Password is not matched.");
        }

        // Jwt signature
        const token = jwtService.sign({ userId: userRecord.id });
        await cacheService.setWithTTL(
            CommonUtil.generateCacheKey(KEY_USER_TOKEN, String(userRecord.id)),
            token,
            30,
            TimeUnit.Day,
        );

        return token;
    }
}
