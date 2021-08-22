// @ts-check

//const TLDs = require("./tld-list-reduced.json");
const TLDs = require("./tld-test.json");

// https://tld-list.com/free-downloads
const allTLDs = require("./tld-list-basic.json");
const { removeDuplicates } = require("./Tools");

class CurrencyWebsiteDomainGuesser
{
    /**
     * 
     * @param {string} _name 
     * @param {string} _symbol 
     */
    constructor(_name, _symbol)
    {
        const name = _name.trim().toLowerCase();
        const symbol = _symbol.trim().toLowerCase();

        this.symbol = {
            raw: _symbol,
            stripped: this.removeBadCharacters(symbol)
        };

        const strippedWithSpaces = this.removeBadCharacters(name);
        const splitted = strippedWithSpaces.split(" ");

        this.name = {
            raw: _name,
            strippedWithSpaces,
            stripped: splitted.join(""),
            splitted,
            firstPart: splitted[0],
            partsWithoutLast: splitted.slice(0, -1),
            partsWithoutFirst: splitted.slice(1),
            lastPart: splitted[splitted.length - 1]
        };
    }

    /**
     * 
     * @param {string} str 
     * @returns {string}
     */
    removeBadCharacters(str)
    {
        // Valid characters for a hostname : [a-z0-9-]
        // I don't remove the space because it will be used as a delimitor
        const validChars = /[^a-z0-9- ]/g;
        return str.replace(validChars, "");
    }

    getDomains()
    {
        const { withTLD, withoutTLD } = this.derivate();

        return [
            ...TLDs.map(TLD => withoutTLD.map(possibility => `${possibility}.${TLD}`)).flat(1),
            ...withTLD
        ];
    }

    derivate()
    {
        const namePossibilities = this.derivateName();
        const symbolPossibilities = this.derivateSymbol();

        return {
            withTLD: removeDuplicates([
                ...namePossibilities.withTLD,
                ...symbolPossibilities.withTLD
            ]),
            withoutTLD: removeDuplicates([
                ...namePossibilities.withoutTLD,
                ...symbolPossibilities.withoutTLD
            ])
        };
    }

    derivateName()
    {
        // Result : 8332 / 11631 - 3002
        const { stripped, splitted, firstPart, partsWithoutLast, partsWithoutFirst, lastPart } = this.name;

        // A TLD will not be added for these elements
        const withTLD = [
            `${stripped}.wordpress.com`,
            `${stripped}.wix.com`,
            `${stripped}.alcurex.info`,
            `${stripped}.github.io`,
            `medium.com/@${firstPart}`,
            `medium.com/${firstPart}`,
            `medium.com/@${stripped}`,
            `medium.com/${stripped}`
        ];

        const withoutTLD = [
            splitted.join("-"),
            stripped,
            firstPart,
            `${partsWithoutLast.join("")}`
        ];

        // If the last part is a valid TLD, let's use it
        for (const TLD of allTLDs)
        {
            // Chain Link -> chain.link
            if (TLD === lastPart)
            {
                withTLD.push(`${partsWithoutLast.join("")}.${TLD}`);
            }
            // Chainlink -> chain.link
            else if (stripped.endsWith(TLD))
            {
                // Drop the last par corresponding to the TLD : Chain
                const fragment = stripped.slice(0, -TLD.length);

                withTLD.push(`${fragment}.${TLD}`);
            }
        }

        /*const hyphenKeywords = [
            "doge",
            "swap",
            "defi",
            "coin",
            "token"
        ];

        // Example for "cryptodoge"
        for (const keyword of hyphenKeywords)
        {
            if (stripped.endsWith(keyword))
            {
                //const 
            }
        }

        if (stripped.endsWith("token"))
        {

        }*/

        const numbers = [
            "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven",
            "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"
        ];
        for (let number = 0; number < numbers.length; number++)
        {
            // "DeFi11" will give "DeFi11", "DeFioneone" and "DeFieleven"
            const regex = new RegExp(`${number}`, "g");
            withoutTLD.push(stripped.replace(regex, numbers[number]));
        }

        // "Wrapped Bitcoin" -> "Bitcoin"
        if (firstPart === "wrapped")
        {
            withoutTLD.push(partsWithoutFirst.join(""));
        }

        // "WrappedBTC" -> "BTC"
        if (stripped.startsWith("wrapped"))
        {
            withoutTLD.push(stripped.slice("wrapped".length));
        }

        /*
        si termine par : doge, swap, defi, protocol, token, coin, tenter en mettant un "-", ex : cryptodoge -> crypto-doge.com
        si termine par coin ou token, ajouter "s"
        si termine par coin ou token, supprimer ce mot
        */

        const prefixes = [
            // "my",
            // "get",
            // "the",
            // "baby",
            // "live",
            // "e",
            // "crypto"
        ];
        const suffixes = [
            "swap",
            "defi",
            "token",
            "platform",
            "coin",
            "s",
            "finance",
            "bsc",
            // "official",
            // "app",
            // "crypto",
            // "foundation",
            // "project",
            // "web",
            // "-project",
            // "layer",
            // "network",
            // "xchange",
            // "exchange",
            // "wiki",
            // "co",
            // "pay",
            // "foundation"
        ];

        for (const prefix of prefixes)
        {
            withoutTLD.push(`${prefix}${stripped}`);
        }

        for (const suffix of suffixes)
        {
            withoutTLD.push(`${stripped}${suffix}`);
        }

        // ajouter TLD :
        // is
        // es
        // pt
        // pl




        //console.log(withTLD)
        //console.log(withoutTLD)

        return {
            withTLD,
            withoutTLD
        };
    }

    derivateSymbol() // 8164 1684
    {
        const { stripped } = this.symbol;

        const withTLD = [];
        const withoutTLD = [
            stripped,
            // `${stripped}token`,
            // `${stripped}coin`,
            // `${stripped}co`,
            // `${stripped}net`,
            // `${stripped}wiki`,
            // `project${stripped}`,
            // `${this.name.raw}-${stripped}`,
            // `${this.name.raw}${stripped}`
        ];

        if (allTLDs.includes(stripped))
        {
            // name.sym if sym is a valid TLD
            withTLD.push(`${this.name.stripped}.${stripped}`);
        }

        return {
            withTLD,
            withoutTLD
        };
    }
}

module.exports = {
    CurrencyWebsiteDomainGuesser
};
