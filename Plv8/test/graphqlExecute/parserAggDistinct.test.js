const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');

test('Mock, array_agg with DISTINCT should be used', () =>
{
    const plv8 = require(appRoot + '/helpers/plv8Mock.js');

    testHelper.runMock('graphqlExecute', __filename);

    console.log(plv8.execute.mock.calls);

    expect(plv8.execute.mock.calls.length).toBe(3);

    const sql = plv8.execute.mock.calls[2][0];

    expect(sql).toContain('array_agg');
    expect(sql).toContain('DISTINCT');
 });
