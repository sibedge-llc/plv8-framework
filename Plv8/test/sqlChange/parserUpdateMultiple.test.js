const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');

test('Insert on conflict syntax test', () =>
{
    const plv8 = require(appRoot + '/helpers/plv8Mock.js');
    const funcName = 'sqlChange';

    testHelper.runMock(funcName, __filename);

    expect(plv8.execute.mock.calls.length).toBe(1);

    const onConflict = "ON CONFLICT";
    const sql = plv8.execute.mock.calls[0][0];
    expect(sql).toContain(onConflict);

    const parts = sql.split(onConflict);
    expect(parts.length).toBe(2);
});
