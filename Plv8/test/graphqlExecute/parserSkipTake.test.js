const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');

test('Mock, LIMIT/OFFSET should be used', () =>
{
    const plv8 = require(appRoot + '/helpers/plv8Mock.js');

    testHelper.runMock('graphqlExecute', __filename);    

    expect(plv8.execute.mock.calls.length).toBe(4);

    const sql = plv8.execute.mock.calls[3][0];   
    const ast = testHelper.astifySql(sql);

    expect(ast.type).toBe("select");

    const columns = ast.columns;
    
    expect(columns).toHaveLength(1);
    expect(columns[0].expr.value).toBe("id");

    const limit = ast.limit;
    expect(limit.seperator).toBe("offset");

    expect(limit.value).toHaveLength(2);
    expect(limit.value[0].type).toBe("number");
    expect(limit.value[0].value).toBe(5);
    expect(limit.value[1].type).toBe("number");
    expect(limit.value[1].value).toBe(10);
});
