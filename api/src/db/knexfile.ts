import { Knex } from 'knex';
import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const config: Knex.Config = {
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  },
  pool: { min: 2, max: 10 },
  migrations: { directory: './migrations', extension: 'ts' },
  searchPath: ['public'],
};

export default config;
