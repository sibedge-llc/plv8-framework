exports.distinct = function(value, index, self)
{
    return self.indexOf(value) === index;
}

exports.groupBy = function(input, key)
{
    return input.reduce((acc, currentValue) =>
    {
        let groupKey = currentValue[key];
        if (!acc[groupKey]) {
            acc[groupKey] = [];
        }

        acc[groupKey].push(currentValue);
        return acc;
    }, {});
};
