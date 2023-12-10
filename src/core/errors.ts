import { generateRequestId } from "./utils";

export class ServiceError extends Error {
    readonly requestId: string;
    readonly status: number;
    readonly code: string;
    readonly message: string;

    constructor(status: number, code: string, message: string) {
        super();
        this.requestId = generateRequestId();
        this.status = status;
        this.code = code;
        this.message = message;
    }
}
