import server from '../app';
import request from 'supertest';
import pg from 'pg'
import dbConfig from "../src/config/database";
import { exec } from "child_process";


// Rebuild the database before running the tests. Its a good idea to do this because it allows us to test from a clean slate, and it ensures that the tests are not dependent on some data that we haven't created in the test itself. The way we do it here is a bit of a hack; on larger projects, you'd probably want to use a test database that is separate from the development database or use a library that can handle this for you.
beforeAll(async () => {
  const pool = new pg.Pool(dbConfig);
  await pool.query("DROP TABLE IF EXISTS migrations");
  await pool.query("DROP TABLE IF EXISTS imports");
  await pool.query("DROP TABLE IF EXISTS articles");

  // Call the NPM script to run the migrations using exec, wrap it in a promise so we can await it
  await new Promise((resolve, reject) => {
    exec("npm run migrate", (error, stdout, stderr) => {
      if (error) {
        console.warn(error);
      }
      resolve(stdout ? stdout : stderr);
    });
  });

  console.log("Starting tests");
});


afterAll(async () => {
  server.close();
});


// Notice how throughout the tests we test the HTTP requests rather than the internal logic itself. While we could do so with specific unit tests for very important classes, the most important is that our app takes an expected input and returns an expected output. This is what we're testing here. Doing it this way also ensures that when we refactor the internal logic, we don't have to change the tests.


// Check that the /api/articles endpoint returns an array of articles
describe('GET /api/articles', () => {
  it('should return an array of articles', async () => {
    const response = await request(server).get('/api/articles');
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    // Check that the array is empty
    expect(response.body.length).toBe(0);
  });
});

// Check that the /api/articles/import endpoint
describe('POST /api/articles/import', () => {
  it('should return 422 when no URL is provided', async () => {
    const response = await request(server).post('/api/articles/import');
    expect(response.status).toBe(422);
  });

  it('should return 422 when an invalid URL is provided', async () => {
    const response = await request(server).post('/api/articles/import').query({ siteRssUrl: 'not a valid URL' });
    expect(response.status).toBe(422);
  });

  it('should return 422 when an unsupported RSS feed URL is provided', async () => {
    const response = await request(server).post('/api/articles/import').query({ siteRssUrl: 'https://www.theguardian.com/world/world-news/rss' });
    expect(response.status).toBe(422);
  });

  it('should return 201 when a valid URL is provided', async () => {
    const response = await request(server).post('/api/articles/import').query({ siteRssUrl: 'https://www.theguardian.com/world/europe-news/rss' });
    expect(response.status).toBe(201);
  });

  // Now the database has been populated, check that the /api/articles endpoint returns an array of articles
  it('should return an array of articles', async () => {
    const response = await request(server).get('/api/articles');
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);

    // Check that the array is not empty
    expect(response.body.length).toBeGreaterThan(0);

    // Check that the first article has the expected properties
    expect(response.body[0]).toHaveProperty('id');
    expect(response.body[0]).toHaveProperty('externalid');
    expect(response.body[0]).toHaveProperty('importdate');
    expect(response.body[0]).toHaveProperty('title');
    expect(response.body[0]).toHaveProperty('description');
    expect(response.body[0]).toHaveProperty('publicationdate');
    expect(response.body[0]).toHaveProperty('link');
    expect(response.body[0]).toHaveProperty('mainpicture');

    expect(response.body[0]).toHaveProperty('wordwithmostvowels');
  });

  // Re-running the import should return 201
  it('should return 201 when a valid URL is provided for a second time', async () => {
    const response = await request(server).post('/api/articles/import').query({ siteRssUrl: 'https://www.theguardian.com/world/europe-news/rss' });
    expect(response.status).toBe(201);
  });
});

// Check that we get a 404 for a non-existent endpoint
describe('A non-existent endpoint', () => {
  it('should return 404', async () => {
    const response = await request(server).get('/api/non-existent-endpoint');
    expect(response.status).toBe(404);
  });
});

// Additional tests that could be useful:
// - Check that the DB itself prevents duplicate articles (checking for unique-key)
// - Unit test for the RSS class, for example to test that its constructor throws an error when an invalid URL is provided, etc.
// - If we had authentication and authorization, we could test that the /api/articles/import endpoint is only accessible to authenticated users, and correctly returns 401 when no authentication is provided or 403 when the user is not authorized
