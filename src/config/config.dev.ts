export default {
    app: {
        printBindRoutesLog: true,
        bannerPath: "banner.txt",
    },
    logger: {
        level: "debug",
    },
    dataSource: {
        synchronize: false,
        logging: false,
        username: "fomopay",
        password: "password",
        database: "pg.test",
        entities: ["src/entities/**/*.ts"],
        migrations: ["src/migrations/**/*.ts"],
        subscribers: ["src/subscribers/**/*.ts"],
    },
    cronJobs: [
        {
            scope: "test",
            start: false,
        },
    ],
};
