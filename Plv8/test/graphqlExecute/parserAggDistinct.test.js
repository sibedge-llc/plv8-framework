const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');

test('Mock, array_agg with DISTINCT should be used', () =>
{
    const plv8 = require(appRoot + '/helpers/plv8Mock.js');

    testHelper.runMock('graphqlExecute', __filename);

    expect(plv8.execute.mock.calls.length).toBe(2);

    const sql = plv8.execute.mock.calls[1][0];   

    expect(sql).toContain('array_agg');
    expect(sql).toContain('DISTINCT');
 });
