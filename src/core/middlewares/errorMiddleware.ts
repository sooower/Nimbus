import { logger } from "../components/logger";
import { ServiceError } from "../errors";
import { Next, Req, Res } from "../types";

export function errorMiddleware(err: Error, req: Req, res: Res, next: Next) {
    if (err instanceof ServiceError) {
        logger.error(`[${err.requestId}]`, err);

        const { status, requestId, message } = err;

        return res.status(status).json({
            requestId,
            message,
        });
    }

    return res.status(500).json("Internal Server Error");
}
