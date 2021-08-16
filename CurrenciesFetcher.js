// @ts-check
const fetch = require("node-fetch");

const { wait, createRange } = require("./Tools");

class CurrenciesFetcher
{
    constructor(fromId, toId, config)
    {
        this.fromId = fromId;
        this.toId = toId;
        this.config = config;
    }

    get CMC_ENDPOINT()
    {
        return this.config.CMC_ENDPOINT;
    }

    get CMC_API_KEY()
    {
        return this.config.CMC_API_KEY;
    }

    get DOWNLOAD_STEP()
    {
        return this.config.DOWNLOAD_STEP;
    }

    async getCurrenciesInfoRequest(currenciesIds)
    {
        const queryString = new URLSearchParams({
            id: currenciesIds.join(","),
            aux: "urls"
        });
        const URL = `${this.CMC_ENDPOINT}?${queryString}`;

        const res = await fetch(URL, {
            method: "GET",
            headers: {
                'X-CMC_PRO_API_KEY': this.CMC_API_KEY
            }
        });

        return res.json();
    }

    // excluded is to indicate ids of currencies to not fetch
    async fetchRange(fromId, toId, excluded = [])
    {
        const ids = createRange(fromId, toId, excluded);
        const { status, data } = await this.getCurrenciesInfoRequest(ids);

        if (status.error_code === 0)
        {
            console.log(`[+] Data from #${fromId} to #${toId} fetched`);

            return {
                status: 0,
                // data contains the currencies data
                data
            };
        }
        // Error like : Invalid values for "id": "509,559,581"
        else if (status.error_code === 400)
        {
            console.log(`[-] Cannot fetch data from #${fromId} to #${toId} : ${status.error_message} (${status.error_code})`);

            const regex = /Invalid values? for "id": "(?<ids>.+)"/;
            const result = status.error_message.match(regex);
            const { ids } = result.groups;

            return {
                status: 1,
                // data contains an array of ids to not fetch
                data: ids.split(",").map(id => parseInt(id, 10))
            }
        }
        else
        {
            console.log(`[-] Cannot fetch data from #${fromId} to #${toId} : ${status.error_message} (${status.error_code})`);

            return {
                status: 2
            };
        }
    }

    async poolForAllCurrenciesData()
    {
        // Key : id, Value : object with data
        let currenciesData = {};
        let excluded = [];

        for (let id = this.fromId; id < this.toId;)
        {
            const targetId = id + this.DOWNLOAD_STEP;

            if (targetId > this.toId)
            {
                break;
            }

            const { status, data } = await this.fetchRange(id, targetId, excluded);

            // OK
            if (status === 0)
            {
                currenciesData = {
                    ...currenciesData,
                    ...data
                };

                id += this.DOWNLOAD_STEP;
            }
            // Cannot fetch some currencies, data contains the list of invalid ids (number)
            else if (status === 1)
            {
                excluded = data;
                console.log(`[~] Another try excluding these ids : ${excluded.join()}`);
                // Try again excluding these currencies by providing their ids
            }
            // Unhandled error
            else
            {
                break;
            }

            // Maximum of 30 requests/minute
            await wait(2);
        }

        return currenciesData;
    }
}

module.exports = {
    CurrenciesFetcher
};