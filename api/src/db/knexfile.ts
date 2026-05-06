import { Knex } from 'knex';
import dotenv from 'dotenv';
dotenv.config();

const config: Knex.Config = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { min: 2, max: 10 },
  migrations: {
    directory: './migrations',
    extension: 'ts',
  },
  searchPath: ['public'],
};

export default config;
