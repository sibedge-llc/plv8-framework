const appRoot = require('app-root-path');
const testHelper = require(appRoot + '/helpers/testHelper.js');

test('Mock, TRUE expected', () =>
{
    const plv8 = require(appRoot + '/helpers/plv8Mock.js');

    testHelper.runMock('graphqlExecute', __filename);    

    expect(plv8.execute.mock.calls.length).toBe(4);

    const sql = plv8.execute.mock.calls[3][0];   
    const ast = testHelper.astifySql(sql);

    expect(ast.type).toBe("select");

    const where = ast.where;

    console.log(where);

    expect(where.left.type).toBe('column_ref');
    expect(where.left.column).toBe('data');
    expect(where.left.arrow).toBe('->>');
    expect(where.left.property.value).toBe('id');

    expect(where.operator).toBe('=');
    
    expect(where.right.type).toBe('number');
    expect(where.right.value).toBe(10);
});
