require('dotenv').config();
const environment = process.env.ENVIRONMENT;
const config = require('../knexfile.js')['development'];
module.exports = require('knex')(config);

// const config = require("../knexfile");
// const envConfig = config['development'];
// const knex = require("knex");

// module.exports = knex(envConfig);