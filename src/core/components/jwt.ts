import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { globalConfig } from "@/core/components/config";
import { Objects } from "@/core/utils";

type JwtConfig = {
    secret: Secret;
    options: SignOptions;
};

function getJwtConfig() {
    return Objects.merge<JwtConfig>(globalConfig.jwt, {
        secret: "Test_Jwt_Sign_Secret",
        options: {
            expiresIn: "30d",
        },
    });
}

export const Jwt = {
    sign(payload: string | object) {
        const { secret, options } = getJwtConfig();

        return jwt.sign(payload, secret, options);
    },

    parse(token: string) {
        return jwt.decode(token);
    },

    verify(token: string) {
        const { secret, options } = getJwtConfig();

        return jwt.verify(token, secret, options);
    },
};
