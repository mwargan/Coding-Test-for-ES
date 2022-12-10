-- Table imports that contains the history of all the time import was requested.
-- id INT auto increment
-- importDate DATETIME
-- rawContent TEXT => the data imported (JSON)

-- Using PostgreSQL

CREATE TABLE IF NOT EXISTS imports (
  id SERIAL PRIMARY KEY,
  -- Set the default value to now()
  importDate TIMESTAMP NOT NULL DEFAULT now(),
  rawContent TEXT NOT NULL
);
