import jwt, { Secret, SignOptions } from "jsonwebtoken";

import { globalConfig } from "./config";

function sign(payload: string | object) {
    const { secret, options } = getJwtConfig();
    return jwt.sign(payload, secret, options);
}

function getJwtConfig() {
    const jwtConfig: { secret: Secret; options: SignOptions } =
        globalConfig.jwt ?? {
            secret: "Test_Jwt_Sign_Secret",
            options: {
                expiresIn: "30d",
            },
        };
    return jwtConfig;
}

export const Jwt = { sign };
