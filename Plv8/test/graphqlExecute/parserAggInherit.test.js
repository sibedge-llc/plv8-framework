const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');

test('Mock, aggregate operators should be used', () =>
{
    const plv8 = require(appRoot + '/helpers/plv8Mock.js');

    testHelper.runMock('graphqlExecute', __filename);

    expect(plv8.execute.mock.calls.length).toBe(3);

    const sql = plv8.execute.mock.calls[2][0];
    const ast = testHelper.astifySql(sql);

    expect(ast).toHaveLength(1);
    expect(ast[0].type).toBe("select");

    const columns = ast[0].columns;
    expect(columns).toHaveLength(1);
    
    expect(columns[0].expr.type).toBe("aggr_func");
    expect(columns[0].expr.name).toBe("COUNT");
});
