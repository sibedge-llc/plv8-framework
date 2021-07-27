const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');

test('Mock, Group by "role" should be used', () =>
{
    const plv8 = require(appRoot + '/helpers/plv8Mock.js');

    testHelper.runMock('graphqlExecute', __filename);

    expect(plv8.execute.mock.calls.length).toBe(3);

    const sql = plv8.execute.mock.calls[2][0];
    const ast = testHelper.astifySql(sql);
    
    expect(ast[0].type).toBe("select");
    
    const groupby = ast[0].groupby[0];
    expect(groupby.type).toBe("column_ref");
    expect(groupby.column).toBe("role");

    expect(ast[0].columns.length).toBe(1);

    const roleExpr = ast[0].columns[0].expr;
    expect(roleExpr.type).toBe("column_ref");
    expect(roleExpr.column).toBe("role");
});
