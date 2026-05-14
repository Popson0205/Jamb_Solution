"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
    await knex.schema.createTable('candidates', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
        t.string('reg_number', 20).unique().notNullable();
        t.string('full_name', 255).notNullable();
        t.boolean('is_verified').defaultTo(true);
        t.timestamp('created_at').defaultTo(knex.fn.now());
    });
    // Index for fast lookup
    await knex.raw('CREATE INDEX idx_candidates_reg ON candidates(reg_number)');
    await knex.raw('CREATE INDEX idx_candidates_name ON candidates(UPPER(full_name))');
}
async function down(knex) {
    await knex.schema.dropTableIfExists('candidates');
}
