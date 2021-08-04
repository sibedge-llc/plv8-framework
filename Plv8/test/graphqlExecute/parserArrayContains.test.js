const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');

test('Mock, =ANY expected', () =>
{
    const plv8 = require(appRoot + '/helpers/plv8Mock.js');

    testHelper.runMock('graphqlExecute', __filename);    

    expect(plv8.execute.mock.calls.length).toBe(4);

    const sql = plv8.execute.mock.calls[3][0];   
    const ast = testHelper.astifySql(sql);

    expect(ast.type).toBe("select");

    const where = ast.where;

    expect(where.left.type).toBe('number');
    expect(where.left.value).toBe(10);
    
    expect(where.operator).toBe('=');
    
    expect(where.right.type).toBe('function');
    expect(where.right.name).toBe('ANY');

    const expr = where.right.args.value[0];
    expect(expr.type).toBe('column_ref');
    expect(expr.table).toBe('a1');
    expect(expr.column).toBe('roles');
});
