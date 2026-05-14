import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('request_logs', (t) => {
    t.increments('id').primary();
    t.string('method', 10).notNullable();
    t.string('path', 255).notNullable();
    t.string('query', 200).nullable();
    t.integer('status_code').notNullable();
    t.integer('duration_ms').notNullable();
    t.string('ip_address', 60);
    t.string('user_agent', 255);
    t.uuid('user_id').nullable();
    t.text('body_summary').nullable();
    t.string('level', 10).defaultTo('info'); // info | warn | error
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Indexes for fast querying
  await knex.raw('CREATE INDEX idx_logs_created ON request_logs(created_at DESC)');
  await knex.raw('CREATE INDEX idx_logs_level ON request_logs(level)');
  await knex.raw('CREATE INDEX idx_logs_path ON request_logs(path)');
  await knex.raw('CREATE INDEX idx_logs_status ON request_logs(status_code)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('request_logs');
}
