-- Table articles (list all the articles):

-- id int auto increment
-- externalId: VARCHAR(500)
-- importDate datetime
-- title: TEXT
-- description: TEXT
-- publicationDate DATETIME
-- description TEXT
-- link TEXT
-- mainPicture TEXT

-- Using PostgreSQL

-- Create a unique index on externalId

CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  externalId VARCHAR(500) NOT NULL,
  importDate TIMESTAMP NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  publicationDate TIMESTAMP NOT NULL,
  link TEXT NOT NULL,
  -- The mainPicture can be null as not all articles seem to always have a main picture
  mainPicture TEXT
);

-- By creating a unique index, we can use the database to ensure that we don't have duplicate records.
CREATE UNIQUE INDEX IF NOT EXISTS articles_externalId_uindex ON articles (externalId);