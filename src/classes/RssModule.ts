import Parser from 'rss-parser';
import pg from 'pg'
import dbConfig from "./../config/database.js";

const parser: Parser = new Parser();

const pool = new pg.Pool(dbConfig);

// We define the vowels as a constant because they will never change, which is also why its outside of the class.
const vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
/**
 * A class for working with RSS feeds.
 *
 */
export class RssModule {

    /**
     * The URL of the RSS feed
     *
     * @note Because this parameter is only read in one method, we don't really need to set it as a class property and could refactor to just pass it into the method.
     *
     * On the other hand, it could be useful to have it as a class property if we want to use it in other methods in the future - as an example, we could later parse the URL in our get-from-db method to determine which RSS feed we want to get the articles from. As always, it depends on the use case.
     *
     * In any case, I've built the import method to be able to accept a URL as a parameter, so it's not necessary to set it as a class property, but I leave it here for the sake of this example and to see the thought process behind it.
     *
     * @type {string}
     */
    url: string = "";

    /**
     * The primary key of the RSS feed. Both of the example URLs have this as "guid", but it could be something else in other RSS feeds, so we'll make it configurable.
     *
     * @type {string}
    */
    primaryKey: string = "guid";

    /**
     * An array of supported RSS feeds. This is just for the sake of this example. In a real-world scenario, this could be stored in the database.
     *
     * @type {Array<string>}
     */
    supportedRssFeeds: Array<string> = [
        "https://www.lemonde.fr/rss/une.xml",
        "https://www.theguardian.com/world/europe-news/rss",
    ];

    /**
     * Constructor for the RssModule class
     *
     * @param {string | null} url The URL of the RSS feed.
     * @param {string | null} primaryKey The primary key of the RSS feed
     */
    constructor(url: string | null = null as string | null, primaryKey: string | null = null as string | null) {
        if (url && this.isValidUrl(url)) {
            this.url = url;
        }

        if (primaryKey) {
            this.primaryKey = primaryKey;
        }
    }

    /**
     * Import the RSS feed
     *
     * @param {string | null} url The URL of the RSS feed.
     * @param {boolean} save Whether or not to save the results to the database
     * @returns {Promise<Object>}
     */
    import = async (url: string | null = null, save: boolean = true): Promise<Object> => {

        // If a URL was provided, use it. Otherwise, use the class property.
        url = url || this.url;

        // If there is no URL, throw an error
        if (!this.isValidUrl(url)) {
            throw new Error("No URL was provided or it was malformed. Construct the class with a URL that starts with http/https.");
        }

        // We'll use an existing library to parse the RSS feed, no need to reinvent the wheel.
        const results = await parser.parseURL(url);

        // Sometimes we may want to not save the results and just see the output, so its a good idea to make this optional.
        if (!save) {
            return results;
        }

        try {
            this.saveImportRequest(results);
        } catch (error) {
            // Here we could log the error somewhere.
        }
        finally {
            return results;
        }
    }

    /**
     * Get all the articles from the database
     *
     * @note This method is simplified here. For production, you'd probably want to implement pagination logic to prevent the database from returning too many rows at once. You also might want to add some sort of caching logic to prevent the database from being hit too often, but that might be over-optimisation.
     *
     * @returns {Promise<Object>}
     * @throws {Error}
     */
    get = async (): Promise<Object> => {
        try {
            // Here personally I'd add optional logic to select which articles we want from which RSS feed. For example, we could have a "source" column in the database, and then we could filter the results by that column. For the purposes of this example, we'll just get all the articles from the database. Or we could just parse the URL and get the articles from the RSS feed that matches the start of a given URL.
            const rows = await this.runQuery('SELECT * FROM articles');

            // Add a new property to each row called "mostCommonVowel"
            for (let row of rows) {
                row.wordwithmostvowels = this.wordWithMostVowels(row.title);
            }

            return rows;
        }
        catch (e) {
            throw e;
        }
    }

    /**
     * Save the RSS feed import to the database
     *
     * @returns {Promise<Object>}
     */
    saveImportRequest = async (results: any): Promise<Object> => {
        // Save the import request to the database. It was not in the specifications, but it could be a good idea to have an additional "status" column that could be used to determine if the import was successful or not, as well as the URL that was attempted to be imported. Note how we also don't pass a date here - we could do so, but our database has a default value for the column, so we don't need to.
        await this.runQuery('INSERT INTO imports (rawContent) VALUES ($1)', [JSON.stringify(results)]);

        // Depending if the error is critical in the business use-case or not, we could throw a fatal error here.
        if (!results.items) {
            throw new Error("No items found in the RSS feed, so no articles were imported");
        }

        // We set up a custom pool here so we can either use transactions, or at the very least, keep the connection open for the duration of the import. This is important because we don't want to open and close a connection for every single article we import. That would be very inefficient.
        const client = await pool.connect();

        for (let item of results.items) {

            // There's a few ways to do this. Here I use a try/catch block to determine if the article already exists because the database has a unique constraint on the externalId column. However, one could also use a SELECT query to check if the article already exists. For performance, it would be preferrable to use a SELECT that gets all the externalIds and then check if the article already exists in the array of externalIds - that way we only have to make the one DB call. You could then also use a bulk insert to insert all the articles at once and further improve performance. For large databases, it would be the most sensible way to do it. However, for the sake of simplicity in this example, I've chosen to use a try/catch block.
            try {
                await client.query('INSERT INTO articles (externalId, importDate, title, description, publicationDate, link, mainPicture) VALUES ($1, $2, $3, $4, $5, $6, $7)', [item[this.primaryKey], new Date(), item.title, item.contentSnippet, item.pubDate, item.link, item.image?.url ?? results.image?.url ?? ""]);
            } catch (error: any) {
                // If the article already exists, update it
                if (error.code === "23505") {
                    await client.query('UPDATE articles SET title = $1, description = $2, publicationDate = $3, link = $4, mainPicture = $5 WHERE externalId = $6', [item.title, item.contentSnippet, item.pubDate, item.link, item.image?.url ?? "", item[this.primaryKey]]);
                }
                else {
                    throw error;
                }
            }

        }

        client.release();

        // Again depending on the business use-case, we could return a wide range of values. For example, we could return the number of articles that were imported, or the number of articles that were updated, or the number of articles that were imported and the number of articles that were updated. For the sake of simplicity, I've chosen to just return the results. We could also just return "true", in which case we'd probably return "false" on error instead of throwing an error.
        return results;
    }

    /**
     * Get the word with the most vowels in a given string
     *
     * @param {string} title
     * @returns {string}
     */
    wordWithMostVowels = (title: string): string => {
        const words = title.split(' ');
        let wordWithMostVowels = '';
        let mostVowels = 0;

        for (let word of words) {
            let vowelCount = 0;
            for (let letter of word) {
                if (vowels.includes(letter)) {
                    vowelCount++;
                }
            }

            if (vowelCount > mostVowels) {
                mostVowels = vowelCount;
                wordWithMostVowels = word;
            }
            // Else, if the vowel count is the same, then we want to return the word that is longer
            else if (vowelCount === mostVowels && word.length > wordWithMostVowels.length) {
                wordWithMostVowels = word;
            }
        }


        return wordWithMostVowels;
    }

    /**
     * Check if a given URL is valid
     *
     * We'll try to create a new URL object. If it throws an error, then the URL is invalid. However, there are some cases that would pass this check, but would still be invalid. For example, if the URL is without a protocol or starts with `..`, so we add a few more checks to make sure the URL is valid.
     *
     * @see https://url.spec.whatwg.org/#example-url-parsing
     * @param {any} url
     * @returns {boolean}
     */
    isValidUrl = (url: any): boolean => {
        if (!url || typeof url !== 'string') {
            return false;
        }

        // We need to check both http:// and https:// instead of just looking for "http" because theoretically http:hello would be a valid URL for the URL constructor, but it's not a valid URL in our case.
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return false;
        }

        try {
            new URL(url);
            return this.isSupportedFeed(url);
        } catch (error) {
            return false;
        }
    }

    /**
     * We only want to support a few RSS feeds, so we'll check if the given URL is one of the supported RSS feeds
     *
     * @param {string} feedUrl
     * @returns {boolean}
     */
    isSupportedFeed = (feedUrl: string): boolean => {
        return this.supportedRssFeeds.includes(feedUrl);
    }

    /**
     * Run a query against the database. This is a helper function that we can use to run any query against the database. Its a good idea to have this function here because it can ensure that we always have a connection to the database, and that we always release the connection when we're done with it.
     *
     * @param {string} query
     * @param {any[]} data
     * @returns {Promise<any[]>}
     * @throws {Error}
     */
    runQuery = async (query: string, data: any[] = [] as any[]): Promise<any[]> => {
        const client = await pool.connect();

        try {
            const result = await client.query(query, data);

            return result.rows;

        } catch (error) {
            throw error;
        }

        finally {
            client.release();
        }
    }
}