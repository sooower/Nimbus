import "reflect-metadata";

import bodyParser from "body-parser";
import express from "express";

import { corsMiddleware } from "./core/middlewares/cors.middleware";
import { errorMiddleware } from "./core/middlewares/error.middleware";
import { autoRegisterRoutes, globalConfig } from "./core/utils";

const app = express();

// Handle cors
app.use(corsMiddleware);

// Parse request body
app.use(bodyParser.json());

// Auto register routes
autoRegisterRoutes(app);

// Handle global error
app.use(errorMiddleware);

// Run application
app.listen(globalConfig.port, () => {
    console.log(`App listening at http://localhost:${globalConfig.port}`);
});
