import { ServiceError } from "../errors";
import { Next, Req, Res } from "../types";

export function errorMiddleware(
    err: ServiceError,
    req: Req,
    res: Res,
    next: Next,
) {
    if (err instanceof ServiceError) {
        const { status, requestId, code, message, stack } = err;
        console.error(stack); // TODO

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
