let data = {
    plv8: "../helpers/plv8PgNative.js",
    funcArgs: {}
}

exports.data = data;

exports.createApi = function (config)
{
    let api = {};
    config.apiFunctions.map(f => api = { ...api, ...require(`../api/${f}.js`) });
    return api;
}
