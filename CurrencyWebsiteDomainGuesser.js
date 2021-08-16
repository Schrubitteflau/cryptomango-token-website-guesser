class CurrencyWebsiteDomainGuesser
{
    constructor(name, symbol)
    {
        this.name = name.toLowerCase();
        this.symbol = symbol.toLowerCase();
    }

    getDomains()
    {
        return [ this.name + ".org" ];
    }
}

module.exports = {
    CurrencyWebsiteDomainGuesser
};
