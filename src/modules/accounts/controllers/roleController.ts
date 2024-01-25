import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
} from "@/common/decorators/routeDecorator";
import { CreateRoleDto, UpdateRoleDto } from "@/modules/accounts/models/role";

@Controller("/roles")
export class RoleController {
    @Get()
    async getRoles() {
        return "getRoles";
    }

    @Get("/:id")
    async getRole(@Body("id") id: string) {
        return "getRole";
    }

    @Post()
    async createRole(@Body() createRoleDto: CreateRoleDto) {
        return "createRole";
    }

    @Put()
    async updateRole(@Body() updateRoleDto: UpdateRoleDto) {
        return "updateRole";
    }

    @Delete()
    async deleteRoles(@Body() roleIds: string[]) {
        return "deleteRoles";
    }

    @Get("/:id/permissions")
    async getRolePermissions(@Param("id") roleId: string) {
        return "getRolePermissions";
    }

    @Post("/:id/permissions")
    async addRolePermissions(@Param("id") roleId: string) {
        return "addRolePermissions";
    }

    @Delete("/:id/permissions")
    async removeRolePermissions(@Param("id") roleId: string) {
        return "removeRolePermissions";
    }

    @Get("/:id/users")
    async getRoleUsers(@Param("id") roleId: string) {
        return "getRolePermissions";
    }

    @Post("/:id/users")
    async addRoleUsers(@Param("id") roleId: string) {
        return "addRolePermissions";
    }

    @Delete("/:id/users")
    async removeRoleUsers(@Param("id") roleId: string) {
        return "removeRolePermissions";
    }
}
