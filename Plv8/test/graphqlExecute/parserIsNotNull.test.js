const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');

test('Mock, name IS NOT NULL expected', () =>
{
    const plv8 = require(appRoot + '/helpers/plv8Mock.js');

    testHelper.runMock('graphqlExecute', __filename);    

    expect(plv8.execute.mock.calls.length).toBe(4);

    const sql = plv8.execute.mock.calls[3][0];   
    const ast = testHelper.astifySql(sql);

    expect(ast.type).toBe("select");

    const where = ast.where;

    expect(where.left.type).toBe('column_ref');
    expect(where.left.column).toBe('name');
    expect(where.operator).toBe('IS NOT');
    expect(where.right.type).toBe('null');
});
