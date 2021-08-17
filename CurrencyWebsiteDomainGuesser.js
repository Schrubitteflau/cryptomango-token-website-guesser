// @ts-check

//const TLDs = require("./tld-list-reduced.json");
const TLDs = require("./tld-test.json");

// https://tld-list.com/free-downloads
const allTLDs = require("./tld-list-basic.json");

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

        const stripped = this.removeBadCharacters(name);
        const splitted = stripped.split(" ");

        this.name = {
            raw: _name,
            stripped,
            splitted,
            firstPart: splitted[0],
            partsWithoutLast: splitted.slice(0, -1),
            lastPart: splitted[splitted.length - 1]
        };
    }

    /**
     * 
     * @param {Array<string>} arr 
     */
    removeDuplicates(arr)
    {
        return [ ...new Set(arr) ];
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

    /*rem(arr)
    {
        return arr.map(this.removeBadCharacters);
    }*/

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
            withTLD: this.removeDuplicates([
                ...namePossibilities.withTLD,
                ...symbolPossibilities.withTLD
            ]),
            withoutTLD: this.removeDuplicates([
                ...namePossibilities.withoutTLD,
                ...symbolPossibilities.withoutTLD
            ])
        };
    }

    derivateName()
    {
        const { stripped, splitted, firstPart, partsWithoutLast, lastPart } = this.name;

        // A TLD will not be added for these elements
        const withTLD = [];

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

        const withoutTLD = [
            splitted.join("-"),
            splitted.join(""),
            firstPart,
            `${firstPart}swap`,
            `${firstPart}defi`,
            `${firstPart}token`,
            `${firstPart}platform`,
            `${firstPart}coin`,
            `${firstPart}s`,
            `${firstPart}finance`,
            `${firstPart}bsc`,
            `${splitted.join("")}token`,
            `app.${firstPart}`,
            `about.${firstPart}`,
            `launch.${firstPart}`,
            `${partsWithoutLast.join("")}`
        ];

        //console.log(withTLD)
        //console.log(withoutTLD)

        return {
            withTLD,
            withoutTLD
        };
    }

    derivateSymbol()
    {
        const withTLD = [];
        const withoutTLD = [ this.symbol.stripped ];

        return {
            withTLD,
            withoutTLD
        };
    }
}

module.exports = {
    CurrencyWebsiteDomainGuesser
};
