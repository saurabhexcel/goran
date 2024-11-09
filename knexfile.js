

module.exports = {

    development: {
        client: 'mysql2',
        connection: {
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: 'password',
            database: 'skillcea_gootask',
            migrations: {
                directory: "./knex/migrations",
            }
        }
    },
    // development: {
    //     client: 'mysql',
    //     connection: {
    //         host: 'localhost',
    //         port: 3306,
    //         user: 'skillcea_vikash',
    //         password: 'India@89010101',
    //         database: 'skillcea_gootask',
    //         migrations: {
    //             directory: "./knex/migrations",
    //         }
    //     }
    // },
    production: {
        client: 'mysql',
        connection: {
            host: 'localhost',
            port: 3306,
            user: 'skillcea_vikash',
            password: 'India@89010101',
            database: 'skillcea_gootask',
        }
    }
};