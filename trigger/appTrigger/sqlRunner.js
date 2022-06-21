// 创建 test_manager_TestRelation 表唯一索引

const log = (msg, ...restArgs) => {
  console.info(`[testManager] ${msg}`, ...restArgs);
};

log('开始执行插件 SQL 脚本');

const createTestRelationTableUniqueSQL = async () => {
  /**
    * 存在重复关联需要执行下面 SQL
      delete
      from "test_manager_TestRelation"
      where "objectId" in (select max("objectId")
                          from "test_manager_TestRelation"
                          group by "from", "to", "relationType"
                          having count(*) > 1);
*/

  const createUniqueSQL = `
  create unique index if not exists test_manager_test_relation_table_from_to_unique
      on "test_manager_TestRelation" ("from", "to", "relationType");
`;

  try {
    await pgClient.query(createUniqueSQL);
    log('关联关系表唯一索引创建成功');
  } catch (err) {
    log('createUniqueSQL run error', err);
  }
};

try {
  await createTestRelationTableUniqueSQL();
} catch (err) {
  log('createTestRelationTableUniqueSQL run error', err);
}
