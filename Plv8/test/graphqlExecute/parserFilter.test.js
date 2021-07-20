const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');

test('Mock, Two filder conditions should be used', () =>
{
    const plv8 = require(appRoot + '/helpers/plv8Mock.js');

    testHelper.runMock('graphqlExecute', __filename);

    expect(plv8.execute.mock.calls.length).toBe(4);

    const sql = plv8.execute.mock.calls[3][0];
    const ast = testHelper.astifySql(sql);

    expect(ast.type).toBe("select");

    const where = ast.where;

    expect(where.type).toBe("binary_expr");
    expect(where.operator).toBe("AND");

    expect(where.left.operator).toBe(">=");
    expect(where.left.left.type).toBe("column_ref");
    expect(where.left.left.column).toBe("weight");
    expect(where.left.right.type).toBe("number");
    expect(where.left.right.value).toBe(5);

    expect(where.right.operator).toBe("<=");
    expect(where.right.left.type).toBe("column_ref");
    expect(where.right.left.column).toBe("weight");
    expect(where.right.right.type).toBe("number");
    expect(where.right.right.value).toBe(10);
});
