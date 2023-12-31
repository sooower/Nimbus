export class UserLoginDto {
    username!: string;
    password!: string;
}

export class UserRegisterDto {
    username!: string;
    password!: string;
    confirmedPassword!: string;
}
