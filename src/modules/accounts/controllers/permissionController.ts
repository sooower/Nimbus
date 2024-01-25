import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
} from "@/common/decorators/routeDecorator";
import { CreatePermissionDto, UpdatePermissionDto } from "@/modules/accounts/models/permission";

@Controller("/permissions")
export class PermissionController {
    @Get()
    async getPermissions() {
        return "getPermissions";
    }

    @Get("/:id")
    async getPermission(@Body("id") id: string) {
        return "getPermissions";
    }

    @Post()
    async createPermission(@Body() createPermissionDto: CreatePermissionDto) {
        return "createPermission";
    }

    @Put()
    async updatePermission(@Body() updatePermissionDto: UpdatePermissionDto) {
        return "updatePermission";
    }

    @Delete()
    async deletePermissions(@Body() permissionIds: string[]) {
        return "deletePermissions";
    }

    @Get("/:id/roles")
    async getPermissionRoles(@Param("id") roleId: string) {
        return "getRolePermissions";
    }

    @Post("/:id/roles")
    async addPermissionRoles(@Param("id") roleId: string) {
        return "addRolePermissions";
    }

    @Delete("/:id/roles")
    async removePermissionRoles(@Param("id") roleId: string) {
        return "removeRolePermissions";
    }
}
