import express, { Express, Request, Response } from 'express';
import { RssModule } from './src/classes/RssModule.js';

// Create the Express app
const app: Express = express();

// The port the server will listen on for requests. This could be set in an environment variable, but for the sake of this example, we'll just hardcode it.
const port = 3001;

// Set up the RssModule class
const rssModule = new RssModule();

// Send the available endpoints. Normally you'd find this info in the documentation, but for the sake of this example, we'll send it here. Some APIs include such an endpoint, and some don't.
app.get('/', (req: Request, res: Response) => {
    res.send({
        endpoints: [
            {
                endpoint: "/api/articles",
                description: "Get the articles from the RSS feed",
                method: "GET",
            },
            {
                endpoint: "/api/articles/import",
                description: "Import the RSS feed",
                method: "POST",
                parameters: [
                    {
                        name: "siteRssUrl",
                        description: "The URL of the RSS feed to import",
                        required: true,
                    },
                ],
            },
        ],
    });
});

app.get('/api/articles', async (req: Request, res: Response) => {
    // Get the articles
    const articles = await rssModule.get();

    // Send the articles back to the user
    res.send(articles);
});

app.post('/api/articles/import', async (req: Request, res: Response) => {

    // Here we could add authorization logic, but for this specification, it's not required. Any authentication logic would have already happend in a middleware function, and we'd have access to the user's details here.

    // Next we validate the request parameters.
    const validationError = isValid(req);

    // We explicitly check for true here, since the validation method returns true if the request is valid, and a string with the error message if the request is invalid.
    if (validationError !== true) {
        res.status(422).send({
            error: validationError,
        });
        return;
    }

    // We're casting the siteRssUrl to a string here since the validation method before ensures that it is indeed a string. Its more for TypeScript than anything else. One could refactor the validation method to return the valid parameter, but that's not necessary for this simple example.
    const siteRssUrl = String(req.query.siteRssUrl);

    // Import the RSS feed
    const importedRssFeed = await rssModule.import(siteRssUrl);

    // Send the imported RSS feed back to the user. Depending on the business use case, you could return a different response here. For the purposes of this example, we'll just return a 201 (created) status code with the parsed RSS feed.
    res.status(201).send(importedRssFeed);
});

/*
* This function validates the request parameters. It returns true if the request is valid, and a string with the error message if the request is invalid.
*
* @param {Request} req The request object
*/
const isValid = (req: Request): true | string => {
    // Validate that the siteRssUrl parameter is present, and a valid URL. Even though are check further on will also check this, we do it here as well to provide a more specific error message.
    if (!req.query.siteRssUrl || typeof req.query.siteRssUrl !== "string") {
        return "The siteRssUrl parameter is required and must be a string";
    }

    // We can also use the existing URL validation logic in the RssModule class
    if (!rssModule.isValidUrl(req.query.siteRssUrl)) {
        return "The siteRssUrl parameter must be a valid and supported URL";
    }

    // If we get here, the request is valid
    return true;
}

const server = app.listen(port, () => console.log(`Server running on port ${port}`));

export default server;
