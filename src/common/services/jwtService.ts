import jwt, { Secret, SignOptions } from "jsonwebtoken";

import { ObjectsUtil } from "../utils/objectUtil";
import { configService } from "./configService";

type JwtConfig = {
    secret: Secret;
    options: SignOptions;
};

function getJwtConfig() {
    return ObjectsUtil.merge<JwtConfig>(configService.jwt, {
        secret: "Test_Jwt_Sign_Secret",
        options: {
            expiresIn: "30d",
        },
    });
}

function sign(payload: string | object) {
    const { secret, options } = getJwtConfig();

    return jwt.sign(payload, secret, options);
}

function parse(token: string) {
    return jwt.decode(token);
}

function verify(token: string) {
    const { secret, options } = getJwtConfig();

    return jwt.verify(token, secret, options);
}

export const jwtService = {
    sign,
    parse,
    verify,
};
