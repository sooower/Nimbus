import express, { Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import fs from "fs";

const app = express();
const port = 3000;
const swaggerDocument = JSON.parse(fs.readFileSync("/Users/Sower/Projects/FOMO/api.fomoremit.net/docs.json", "utf-8"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/api/sample", (req: Request, res: Response) => {
    res.send("Sample API response");
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
