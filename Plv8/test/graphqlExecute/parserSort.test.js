const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');

test('Mock, ORDER BY should be used', () =>
{
    const plv8 = require(appRoot + '/helpers/plv8Mock.js');

    testHelper.runMock('graphqlExecute', __filename);    

    expect(plv8.execute.mock.calls.length).toBe(4);

    const sql = plv8.execute.mock.calls[3][0];   
    const ast = testHelper.astifySql(sql);

    expect(ast.type).toBe("select");

    const columns = ast.columns;
    
    expect(columns).toHaveLength(1);
    expect(columns[0].expr.table).toBe("a1");
    expect(columns[0].expr.column).toBe("id");

    const { type, expr } = ast.orderby[0];
    expect(type).toBe("ASC");

    expect(expr.type).toBe("column_ref");
    expect(expr.table).toBe("a1");
    expect(expr.column).toBe("name");
});
