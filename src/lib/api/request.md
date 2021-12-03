1. 测试用例查询被关联的测试计划（反向）

   ```javascript
   // reference
   new Parse.Query(Reference)
     .equalTo('type', ETestType.TestSet)
     .containedIn('testPlan', ItemPointer);
   ```

2. 查询测计划关联的测试用例，测试执行（正向）

   ```javascript
   // testPlan testExecution
   new Parse.Query(Reference)
     .include(['testPlan', 'testExecution'])
     .equalTo('reference', ItemPointer);
   ```

3. 事项类型与测试类型改变关联，重新索引

   ```javascript
   // destroyAll
   new Parse.Query(Reference)
     .equalTo('workspace', WorkspacePointer)
     .equalTo('type', ETestType.TestPlan);
   ```

4. 创建测试计划并关联测试用例

   ```javascript
   // 1. 创建测试计划类型事项
   const item = createItem();
   // 2. 创建测试用例
   new Reference({
     reference: item,
     type: ETestType.TestPlan,
     // 测试用例 item
     testPlan: [ItemPointer],
   });
   ```

5. 添加测试用例到测试计划
