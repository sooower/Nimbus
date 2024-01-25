import { IsBoolean, IsEmail, IsInt, IsNotEmpty, IsNumber, IsString } from "class-validator";

import { ParseArrayType, ParseType } from "@/common/decorators/parseDecorator";

export class UserLoginDto {
    username!: string;
    password!: string;
}

export class Test {
    name!: string;
}

export class UserRegisterDto {
    username!: string;
    password!: string;
    confirmedPassword!: string;

    @IsNumber()
    age!: number;

    @IsBoolean()
    gender!: boolean;

    @ParseArrayType(Test)
    testArr!: Test[];
}

export class GetUsersDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsInt()
    @ParseType()
    @IsNotEmpty()
    age!: number;

    @IsNumber()
    @ParseType()
    @IsNotEmpty()
    salary!: number;

    @IsEmail()
    email!: string;

    @IsBoolean()
    @ParseType(Boolean)
    gender!: boolean;

    sortBy!: string[];

    @ParseType()
    pageSize!: number;

    @ParseType()
    pageNum!: number;
}
