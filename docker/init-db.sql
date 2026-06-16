-- Enable extensions required by the entities (geometry columns, uuid defaults).
-- Table creation is handled by TypeORM `synchronize: true` (NODE_ENV=development).
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
