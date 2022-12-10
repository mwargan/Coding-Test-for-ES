# Test app to get articles

This is a test app to get articles from an RSS feed, save them to a database and display them in a response.

## Installation

You can use the provided `Devcontainer` to run the app in a Docker container. To use it, you need to have Docker and VSCode installed. Then, open the project in VSCode and click on the green button in the bottom left corner of the window. This will open a new window with the project running in a container, with NodeJS and Postgres installed and ready to go.

Running the app in a container is the recommended way to run it, because it will make sure you have all the dependencies installed and configured correctly, and it will make sure that your development environment is as close as possible to the production environment.

After starting the container, make sure you run the following commands to install the dependencies and run the migrations:

```bash
npm install
npm run migrate
```

Alternatively, the NodeJS and Express app can be installed by running the following commands:

```bash
npm install
npm run migrate
npm run build
npm run start
```

You should be sure you have a Postgres database running on your machine if you're not doing this through a Devcontainer.

## Usage

### Importing the RSS feed

To import the RSS feed, you can use the following command (in CURL, for example):

```bash
curl -X POST -H "Content-Type: application/json" -d '{"siteRssUrl": "https://www.lemonde.fr/rss/une.xml"}' http://localhost:3001/api/articles/import
```

### Getting the articles

To get the articles, you can use the following command:

```bash
curl -X GET http://localhost:3001/api/articles
```

## Development

### Running the app

To run the app in development mode, you can use the following command:

```bash
npm run dev
```

## Testing

The app has a few tests that can be run with the following command:

```bash
npm run test
```

The tests are written with Jest and Supertest, and will also generate a coverage report.