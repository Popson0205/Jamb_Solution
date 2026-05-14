"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
    await knex.raw('CREATE EXTENSION IF NOT EXISTS postgis');
    await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await knex.schema.createTable('centres', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
        t.string('name', 255).notNullable();
        t.text('address');
        t.string('state', 100);
        t.string('lga', 100);
        t.string('town', 100);
        t.decimal('latitude', 10, 7).notNullable();
        t.decimal('longitude', 10, 7).notNullable();
        t.specificType('location', 'GEOGRAPHY(POINT, 4326)');
        t.integer('capacity_per_batch').defaultTo(150);
        t.boolean('is_active').defaultTo(true);
        t.timestamp('created_at').defaultTo(knex.fn.now());
    });
    await knex.raw('CREATE INDEX idx_centres_location ON centres USING GIST(location)');
    await knex.schema.createTable('batches', (t) => {
        t.increments('id').primary();
        t.integer('batch_number').notNullable();
        t.time('arrival_time').notNullable();
        t.time('exam_start').notNullable();
        t.time('exam_end').notNullable();
        t.boolean('applies_on_friday').defaultTo(true);
    });
    await knex.schema.createTable('students', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
        t.string('reg_number', 20).unique().notNullable();
        t.string('full_name', 255).notNullable();
        t.string('phone', 20);
        t.string('email', 255);
        t.string('state', 100);
        t.string('lga', 100);
        t.string('ward', 100);
        t.decimal('latitude', 10, 7);
        t.decimal('longitude', 10, 7);
        t.specificType('location', 'GEOGRAPHY(POINT, 4326)');
        t.timestamp('created_at').defaultTo(knex.fn.now());
    });
    await knex.schema.createTable('allocations', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
        t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE');
        t.uuid('centre_id').references('id').inTable('centres').onDelete('RESTRICT');
        t.date('exam_date').notNullable();
        t.integer('batch_number').notNullable();
        t.time('arrival_time').notNullable();
        t.time('exam_start').notNullable();
        t.time('exam_end').notNullable();
        t.decimal('distance_km', 6, 2);
        t.timestamp('allocated_at').defaultTo(knex.fn.now());
        t.boolean('is_reassigned').defaultTo(false);
        t.uuid('reassigned_by');
        t.timestamp('reassigned_at');
        t.text('notes');
    });
    await knex.schema.createTable('admin_users', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
        t.string('email', 255).unique().notNullable();
        t.string('password_hash', 255).notNullable();
        t.string('full_name', 255);
        t.string('role', 50).defaultTo('admin');
        t.timestamp('created_at').defaultTo(knex.fn.now());
    });
}
async function down(knex) {
    await knex.schema.dropTableIfExists('allocations');
    await knex.schema.dropTableIfExists('students');
    await knex.schema.dropTableIfExists('admin_users');
    await knex.schema.dropTableIfExists('batches');
    await knex.schema.dropTableIfExists('centres');
}
