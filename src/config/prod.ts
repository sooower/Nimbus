export default {
    logger: {
        level: "info",
    },
    dataSource: {
        synchronize: false,
        logging: false,
        username: "fomopay",
        password: "password",
        database: "pg.test",
        entities: ["dist/**/entities/**/*.js"],
        migrations: ["dist/**/migrations/**/*.js"],
        subscribers: ["dist/**/subscribers/**/*.js"],
    },
    cronJobs: [
        {
            scope: "test",
            start: false,
        },
    ],
};
