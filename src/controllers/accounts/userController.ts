import { Body, Controller, Delete, Get, Param, Post, Put } from "@/core/decorators/routeDecorator";
import { CacheClient } from "@/core/components/cacheClient";
import { ServiceError } from "@/core/errors";
import { UserLoginDto, UserRegisterDto } from "@/models/accounts/user";
import { NonAuth } from "@/core/decorators/authorizationDecorator";
import { KEY_USER_TOKEN } from "@/core/constants";
import { UserService } from "@/services/userService";
import { LazyInject } from "@/core/decorators/injectionDecorator";
import { Permis } from "@/core/decorators/permissionDecorator";
import { Commons } from "@/core/utils/commons";

@Controller("/users")
export class UserController {
    constructor(
        @LazyInject(() => UserService)
        private userService: UserService,
    ) {}

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
        const res = await CacheClient.remove(Commons.generateCacheKey(KEY_USER_TOKEN, id));

        if (!res) {
            throw new ServiceError("Please login first.");
        }

        return {};
    }

    @Get()
    @Permis(["user:read"])
    async getUsers() {
        return "getUsers";
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
