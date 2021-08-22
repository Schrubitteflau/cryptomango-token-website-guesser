function wait(seconds)
{
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// Min included, max excluded : min = 1, max = 5 => [ 1, 2, 3, 4 ]
// Excluded arrays contains values to delete from the range
function createRange(min, max, excluded)
{
    const diff = max - min;
    const range = Array.from({ length: diff }, (value, key) => key + min);

    return range.filter(value => !excluded.includes(value));
}

/**
* @param {Array<string>} arr 
*/
function removeDuplicates(arr)
{
   return [ ...new Set(arr) ];
}

module.exports = {
    wait,
    createRange,
    removeDuplicates
};
