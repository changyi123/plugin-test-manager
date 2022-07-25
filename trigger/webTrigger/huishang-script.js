const ParseBaseQueryOptions = {
  sessionToken: global.sessionToken,
};
// 获取请求的参数
const { itemId, action, planId, checkStatus } = global.body;
console.log('global.body', global.body);

// async function fetchItemTypeById(id) {
//   const ItemTypeQuery = await apis.getParseQuery(false, 'ItemType');
//   const typeInfo = await ItemTypeQuery.equalTo('objectId', id).first(ParseBaseQueryOptions);

//   return typeInfo.get('key');
// }

// 根据事项id获取计划id
async function fetchPlanFromItemId(id) {
  const testQuery = await apis.getParseQuery(false, 'test_manager_Test');
  return testQuery
    .equalTo('type', 'TestPlan')
    .equalTo('reference', id)
    .first(ParseBaseQueryOptions);
}

// 根据计划id获取下面的测试用例
async function fetchTestFromPlanId(id) {
  const relateQuery = await apis.getParseQuery(false, 'test_manager_TestRelation');
  return relateQuery
    .equalTo('relationType', 'PlanRelDetail')
    .equalTo('from', id)
    .findAll(ParseBaseQueryOptions);
}

// 通过测试计划id获取测试执行
async function fetchRunsFromPlanId(id) {
  // 获取testExecution
  const relateQuery = await apis.getParseQuery(false, 'test_manager_TestRelation');
  const executions = await relateQuery
    .equalTo('relationType', 'PlanRelExecution')
    .equalTo('from', id)
    .findAll(ParseBaseQueryOptions);
  // 获取测试执行
  const executeQuery = await apis.getParseQuery(false, 'test_manager_TestRelation');
  const runs = await executeQuery
    .containedIn(
      'from',
      executions.map(item => item.get('to').id),
    )
    .include('to')
    .equalTo('relationType', 'ExecutionRelRun')
    .findAll(ParseBaseQueryOptions);
  return runs;
}

// 通过测试执行任务 id 判断测试执行是否都执行
async function fetchTestRunStatusByExecutionId(id) {
  const relateQuery = await apis.getParseQuery(false, 'test_manager_TestRelation');
  const executions = await relateQuery
    .equalTo('relationType', 'ExecutionRelRun')
    .equalTo('from', id)
    .include('to')
    .findAll(ParseBaseQueryOptions);

  return executions;
}

async function fetchTestFromPlanItemId(id) {
  const targetPlan = await fetchPlanFromItemId(id);
  if (!targetPlan?.id) return { code: -1, message: '计划不存在' };
  // 获取计划下的用例
  const executions = await fetchTestFromPlanId(targetPlan.id);
  if (!executions?.length) {
    return { code: -1, message: '没有关联的测试用例' };
  }
  return { code: 0, data: executions };
}

// const itemTypeKey = await fetchItemTypeById(itemType);

if (action === 'has-test') {
  // 测试计划状态流转时，校验必须存在至少一个测试用例
  // 事项id -> 计划id -> 关联的用例
  const executionRes = await fetchTestFromPlanItemId(itemId);
  return executionRes;
} else if (action === 'execution-done') {
  // itemTypeKey === 'test_manager_plan' &&
  // 测试计划状态【已完成】时，校验所有的测试执行任务必须【已完成】
  const plan = await fetchPlanFromItemId(itemId);
  const runs = await fetchRunsFromPlanId(plan.id);
  if (!runs?.length) return { code: -1, message: '没有测试执行任务' };
  const hasUnPass = runs.find(item => item.get('to').get('status') !== 'PASSED');
  if (hasUnPass) {
    return { code: -1, message: '所有的测试执行任务必须【已完成】' };
  }
  return { code: 0 };
} else if (action === 'create-execution') {
  if (!planId) return { code: 0 };
  // 界面脚本--创建测试执行任务保存时，校验测试计划状态是否符合要求
  // 获取这个任务关联的计划
  const testQuery = await apis.getParseQuery(false, 'test_manager_Test');
  const data = await testQuery
    .include('reference.status')
    .equalTo('type', 'TestPlan')
    .equalTo('objectId', planId)
    .first(ParseBaseQueryOptions);
  if (!checkStatus.includes(data.get('reference').get('status').get('name'))) {
    return { code: -1, message: `测试计划状态不属于${checkStatus.join('、')}` };
  }
  return { code: 0 };
} else if (action === 'runs-done') {
  // itemTypeKey === 'test_manager_execution' &&
  // 检测测试执行任务状态改为【已完成】时，校验下所有的用例是否都执行
  const testQuery = await apis.getParseQuery(false, 'test_manager_Test');
  const itemQuery = await apis.getParseModel(false, 'Item');
  const testData = await testQuery
    .equalTo('reference', itemQuery.createWithoutData(itemId))
    .first(ParseBaseQueryOptions);
  const testRuns = await fetchTestRunStatusByExecutionId(testData.get('objectId'));
  const todoTest = testRuns.filter(
    test => !test.get('to').get('status') || test.get('to').get('status') === 'TODO',
  );
  if (todoTest.length) {
    return { code: -1, message: '存在未执行的测试用例，请执行完成后在进行状态流转' };
  }
  return { code: 0 };
}
