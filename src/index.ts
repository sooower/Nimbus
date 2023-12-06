import "reflect-metadata";

import bodyParser from "body-parser";
import express from "express";
import swaggerUi from "swagger-ui-express";

import apiDocuments from "../../../FOMO/Codes/api.fomoremit.net/api-docs.json";
import { corsMiddleware } from "./core/middlewares/cors.middleware";
import { errorMiddleware } from "./core/middlewares/error.middleware";
import { autoRegisterRoutes, globalConfig } from "./core/utils/common";

const app = express();

// Handle cors
app.use(corsMiddleware);

// Parse request body
app.use(bodyParser.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(apiDocuments));

// Auto register routes
autoRegisterRoutes(app);

// Handle global error
app.use(errorMiddleware);

// Run application
app.listen(globalConfig.port, () => {
    console.log(`App listening at http://localhost:${globalConfig.port}`);
});
