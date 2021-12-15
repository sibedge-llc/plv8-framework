const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');

test('Insert on conflict syntax test', () =>
{
    const plv8 = require(appRoot + '/helpers/plv8Mock.js');
    const funcName = 'sqlChange';

    testHelper.runMock(funcName, __filename);

    expect(plv8.execute.mock.calls.length).toBe(2);

    const sql = plv8.execute.mock.calls[1][0];

    const ast = testHelper.astifySql(sql);

    expect(ast.type).toBe("update");

    const cond = ast.where.right;

    expect(cond.left.type).toBe('number');
    expect(cond.left.value).toBe(2);
    
    expect(cond.operator).toBe('=');
    
    expect(cond.right.type).toBe('function');
    expect(cond.right.name).toBe('ANY');

    const expr = cond.right.args.value[0];
    expect(expr.type).toBe('column_ref');
    expect(expr.column).toBe('company_types');
});
