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

function simplifyHostname(hostname)
{
    // Delete the first "www." if set
    //const checkedHostname = hostname.startsWith("www.") ? hostname.substring(4) : hostname;

    // split by "." and get only the 2 last elements and rebuild the hostname
    // this will drop the subdomains like <www|launcher|app|...>.website.com
    // but it will not work for websites like website.gouv.eu
    const parts = hostname.split(".");
    const last2Parts = parts.slice(-2);
    return last2Parts.join(".").toLowerCase();
}

function checkWebsites()
{
    const currencies = loadJSON("currencies.json");
    const websitesCount = currencies.reduce((acc, currency) => acc + currency.urls.website.length, 0);
    // [ [ "URL", Value: { name: "Name", symbol: "SYM" } ] ]
    const missedWebsites = [];
    const skippedURLs = [];
    let websiteCounter = 0;
    let totalPotentialDomains = 0;

    const d = {};

    for (const currency of currencies)
    {
        const { name, symbol } = currency;
        const websitesURLs = currency.urls.website;

        for (const url of websitesURLs)
        {
            const domainGuesser = new CurrencyWebsiteDomainGuesser(name, symbol);
            const potentialDomains = domainGuesser.getDomains();
            console.log(potentialDomains.length)
            const httpRegex = /^https?:\/\//i;
            const safeUrl = httpRegex.test(url) ? url : `http://${url}`
            const { hostname, pathname } = new URL(safeUrl);
            const hostnameToTest = simplifyHostname(hostname);

            totalPotentialDomains += potentialDomains.length;

            const re=  /^.+\.(?<tld>.+)$/
            tld=hostname.match(re).groups.tld
            if (typeof(d[tld]) === "undefined") d[tld] = 0;
            d[tld]++;

            const prefix = colors.bold(`[ ${++websiteCounter} / ${websitesCount} ] => [ "${name}" / "${symbol}" ] => `);

            if (hostnameToTest === "github.com" || hostnameToTest === "bitcointalk.org" || hostnameToTest === "medium.com")
            {
                skippedURLs.push(url);
                console.log(prefix + colors.yellow(`Skip ${url}`))
            }
            else if (potentialDomains.includes(hostnameToTest))
            {
                console.log(prefix + colors.green(`${hostnameToTest}`));
            }
            else
            {
                missedWebsites.push([ url, { name, symbol } ]);
                console.log(prefix + colors.red(`${hostnameToTest}`));
            }
        }
    }

    const ttt = {};
    for (const key in d)
    {
        const v = d[key];
        if (v > 5) {
            ttt[key] = v;
        }
    }
    persistJSON("TLDs.json", ttt)

    console.log(`Result : ${websitesCount - missedWebsites.length} / ${websitesCount - skippedURLs.length}`);
    console.log(`Average number of domains checked per website : ${totalPotentialDomains / websitesCount}`);
    persistJSON("missedWebsites.json", missedWebsites);
}

async function showMissedWebsites()
{
    const missedWebsites = loadJSON("missedWebsites.json");
    const ignoredWebsites = loadJSON("ignoredWebsites.json");
    const filtered = missedWebsites.filter(([ website ]) => !ignoredWebsites.includes(website));

    console.log(`Showing ${filtered.length} tokens`);

    try
    {
        for (const [ website, crypto ] of filtered)
        {
            console.log(website);
            console.log(crypto);

            console.log("Ignore this website for the next times ? (Type Y)");
            const result = await prompt.get([ "ignore" ]);
            if (result.ignore === "Y" || result.ignore === "y")
            {
                ignoredWebsites.push(website);
            }
        }
    }
    catch (error)
    {
        console.log(error);
    }
    finally
    {
        persistJSON("ignoredWebsites.json", ignoredWebsites);
    }
}

main();
