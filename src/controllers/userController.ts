import {
    Body,
    Controller,
    Param,
    Post,
    Put,
} from "@/core/decorators/routeDecorator";
import { CacheClient } from "@/core/components/cacheClient";
import { ServiceError } from "@/core/errors";
import { Commons } from "@/core/utils";
import { UserLoginDto, UserRegisterDto } from "@/models/user";
import { NonAuth } from "@/core/decorators/nonAuthDecorator";
import { KEY_USER_TOKEN } from "@/core/constants";
import { UserService } from "@/services/userService";

@Controller("/users")
export class UserController {
    constructor(private userService: UserService) {}

    @Post("/register")
    @NonAuth
    async register(@Body() userRegisterDto: UserRegisterDto) {
        return this.userService.register(userRegisterDto);
    }

    @Put("/login")
    @NonAuth
    async login(@Body() userLoginDto: UserLoginDto) {
        return this.userService.login(userLoginDto);
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
