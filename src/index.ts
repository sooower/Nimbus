import express from "express";
import swaggerUi from "swagger-ui-express";
import "reflect-metadata";

import { autoRegisterRoutes, config } from "./utils/core";
import { corsMiddleware } from "./middlewares/cors.middleware";
import bodyParser from "body-parser";
import apiDocuments from "../../../FOMO/Codes/api.fomoremit.net/api-docs.json";

const app = express();

// Parse request body
app.use(bodyParser.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(apiDocuments));

// Auto register routes
autoRegisterRoutes(app);

// Handle Cors
app.use(corsMiddleware);

// Run application
app.listen(config.port, () => {
    console.log(`App listening at http://localhost:${config.port}`);
});
