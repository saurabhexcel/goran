/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.table('googleUsers', (table) => {
      table.string('refresh_token').after('data').nullable().comment('Stores the OAuth2 refresh token');
    });
  };

  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function (knex) {
    return knex.schema.table('googleUsers', (table) => {
      table.dropColumn('refresh_token');
    });
  };
