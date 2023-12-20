import dayjs from "dayjs";

import { ServiceError } from "../errors";
import { Next, Req, Res } from "../types";

export function errorMiddleware(
    err: ServiceError,
    req: Req,
    res: Res,
    next: Next,
) {
    console.error(
        `#[${err.requestId}] [${dayjs().format("YYYY-MM-DD HH:mm:ssZ")}]`,
        err,
    );

    if (err instanceof ServiceError) {
        const { status, requestId, code, message, stack } = err;
        return res.status(status).json({
            requestId,
            code,
            message,
        });
    }

    return res.status(500).json({
        code: "500",
        message: "Internal Server Error",
    });
}
