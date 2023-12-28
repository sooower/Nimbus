import { Next, Req, Res } from "@/core/types";
import { ServiceError } from "@/core/errors";
import { logger } from "@/core/components/logger";

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
