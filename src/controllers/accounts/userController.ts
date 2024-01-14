import { cacheClient } from "@/core/components/cacheClient";
import { KEY_USER_TOKEN } from "@/core/constants";
import { NonAuth } from "@/core/decorators/authorizationDecorator";
import { Cacheable } from "@/core/decorators/cacheDecorator";
import { Permis } from "@/core/decorators/permissionDecorator";
import {
    Body, Controller, Delete, Get, Param, Post, Put, Query
} from "@/core/decorators/routeDecorator";
import { ServiceError } from "@/core/errors";
import { Commons } from "@/core/utils/commons";
import { GetUsersDto, UserLoginDto, UserRegisterDto } from "@/models/accounts/user";
import { UserService } from "@/services/userService";

@Controller("/users")
export class UserController {
    constructor(private userService: UserService) {}

    @Post("/register")
    @NonAuth()
    async register(@Body() userRegisterDto: UserRegisterDto) {
        return this.userService.register(userRegisterDto);
    }

    @Put("/login")
    @NonAuth()
    async login(@Body() userLoginDto: UserLoginDto) {
        return this.userService.login(userLoginDto);
    }

    @Put("/logout/:id")
    async logout(@Param("id") id: string) {
        const res = await cacheClient.remove(Commons.generateCacheKey(KEY_USER_TOKEN, id));

        if (!res) {
            throw new ServiceError(`Failed to logout user <${id}>.`);
        }

        return {};
    }

    @Get()
    @Permis(["user:read"])
    @Cacheable({ scope: "user", key: ":getUsersDto", ttl: 300 })
    async getUsers(@Query() getUsersDto: GetUsersDto) {
        return getUsersDto;
    }

    @Get("/:id")
    @Permis(["user:read"])
    async getUser(@Param("id") id: string) {
        return "getUser" + id;
    }

    @Put("/:id")
    @Permis(["user:update"])
    async updateUser(@Param("id") id: string) {
        return "updateUser" + id;
    }

    @Delete()
    @Permis(["user:delete"])
    async deleteUsers(@Body() userIds: string[]) {
        return `deleteUsers ${userIds}`;
    }

    @Get("/:id/roles")
    async getUserRoles(@Param("id") userId: string) {
        return "getUserRoles" + userId;
    }

    @Post("/:id/roles")
    async addUserRoles(@Param("id") userId: string) {
        return "addUserRoles";
    }

    @Delete("/:id/roles")
    async removeUserRoles(@Param("id") userId: string) {
        return "removeUserRoles";
    }
}
