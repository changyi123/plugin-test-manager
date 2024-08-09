import { upsertAuditLogAction, upsertAuditLogCategory } from '@giteeteam/apps-team-api';

export const installAuditLog = async () => {
  await upsertAuditLogCategory({
    key: 'TESTMAMAGER',
    name: '测试管理',
    area: 'GLOBAL_CONFIGURATION_AND_ADMINISTRATION',
    locales: [
      {
        locale: 'zh-CN',
        transName: '测试管理',
        transDesc: '测试管理',
      },
      {
        locale: 'en-US',
        transName: 'test management',
        transDesc: 'test management',
      },
    ],
  });
  await upsertAuditLogAction({
    key: 'plungin_test_respository_batch_copy.action',
    name: '批量复制测试用例事项',
    category: 'TESTMAMAGER',
    level: 'BASE',
    locales: [
      {
        locale: 'zh-CN',
        transName: '批量复制测试用例事项',
        transDesc: '批量复制测试用例事项',
      },
      {
        locale: 'en-US',
        transName: 'Batch copy test case matters',
        transDesc: 'Batch copy test case matters',
      },
    ],
  });
  await upsertAuditLogAction({
    key: 'plungin_test_respository_batch_delete.action',
    name: '批量删除测试用例事项',
    category: 'TESTMAMAGER',
    level: 'BASE',
    locales: [
      {
        locale: 'zh-CN',
        transName: '批量删除测试用例事项',
        transDesc: '批量删除测试用例事项',
      },
      {
        locale: 'en-US',
        transName: 'Batch delete test case matters',
        transDesc: 'Batch delete test case matters',
      },
    ],
  });
  await upsertAuditLogAction({
    key: 'plungin_test_respository_batch_assignee.action',
    name: '批量设置测试用例事项负责人',
    category: 'TESTMAMAGER',
    level: 'BASE',
    locales: [
      {
        locale: 'zh-CN',
        transName: '批量设置测试用例事项负责人',
        transDesc: '批量设置测试用例事项负责人',
      },
      {
        locale: 'en-US',
        transName: 'Batch set repository items assigner',
        transDesc: 'Batch set repository items assigner',
      },
    ],
  });
};
