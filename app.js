require("dotenv-flow").config();

const fs = require("fs");
const colors = require("colors");
const prompt = require("prompt");

const { CurrenciesFetcher } = require("./CurrenciesFetcher");
const { CurrencyWebsiteDomainGuesser } = require("./CurrencyWebsiteDomainGuesser");

const CMC_API_KEY = process.env.CMC_API_KEY;
const CMC_ENDPOINT = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/info";
const CURRENCIES_MAX_ID = parseInt(process.env.CURRENCIES_MAX_ID, 10);
// Fetch X currencies data per request
const DOWNLOAD_STEP = parseInt(process.env.DOWNLOAD_STEP, 10);

function persistJSON(file, data)
{
    fs.writeFileSync(file, JSON.stringify(data), {
        encoding: "utf8",
        flag: "w"
    });
}

function loadJSON(file)
{
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function main()
{
    const action = process.argv[2];

    switch (action)
    {
        case "fetch":
            await fetchCurrencies();
            break;
        case "check":
            checkWebsites();
            break;
        case "missed":
            showMissedWebsites();
            break;
        default:
            console.log("<action> must be 'fetch', 'check' or 'missed'");
    }
}

async function fetchCurrencies()
{
    if (fs.existsSync("currencies.json"))
    {
        console.log("currencies.json already exist, type 'o' if you want to overwrite it");
        const result = await prompt.get([ "response" ]);

        if (result.response !== "o" && result.response !== "O")
        {
            return;
        }
    }

    const fetcher = new CurrenciesFetcher(1, CURRENCIES_MAX_ID, {
        CMC_API_KEY,
        CMC_ENDPOINT,
        DOWNLOAD_STEP
    });
    const currenciesData = await fetcher.poolForAllCurrenciesData();

    // Transform { "<id>": { id: "<id>", name: "...", symbol: "...", "otherData": "..." }, ... }
    // Into : [ { id: "<id>", name: "...", symbol: "...", "otherData": "..." }, ... ]
    persistJSON("currencies.json", Object.values(currenciesData));
}

function checkWebsites()
{
    const currencies = loadJSON("currencies.json");
    const websitesCount = currencies.reduce((acc, currency) => acc + currency.urls.website.length, 0);
    // [ [ "URL", Value: { name: "Name", symbol: "SYM" } ] ]
    const missedWebsites = [];
    const skippedURLs = [];
    let websiteCounter = 0;

    for (const currency of currencies)
    {
        const { name, symbol } = currency;
        const websitesURLs = currency.urls.website;

        for (const url of websitesURLs)
        {
            const domainGuesser = new CurrencyWebsiteDomainGuesser(name, symbol);
            const guessedDomains = domainGuesser.getDomains();
            const { hostname, pathname } = new URL(url);
            // Delete the first "www." if set
            const checkedHostname = hostname.startsWith("www.") ? hostname.substring(4) : hostname;

            const prefix = colors.bold(`[ ${++websiteCounter} / ${websitesCount} ] => `);

            if (checkedHostname === "github.com")
            {
                skippedURLs.push(url);
                console.log(prefix + colors.yellow(`Skip ${url}`))
            }
            else if (guessedDomains.includes(checkedHostname))
            {
                console.log(prefix + colors.green(`${checkedHostname}`));
            }
            else
            {
                missedWebsites.push([ url, { name, symbol } ]);
                console.log(prefix + colors.red(`${checkedHostname}`));
            }
        }
    }

    console.log(`Result : ${websitesCount - missedWebsites.length} / ${websitesCount - skippedURLs.length}`);
    persistJSON("missedWebsites.json", missedWebsites);
}

function showMissedWebsites()
{
    const missedWebsites = loadJSON("missedWebsites.json");

    console.log(missedWebsites);
}

main();
