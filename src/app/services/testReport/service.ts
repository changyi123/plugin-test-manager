import fetch from '@/lib/utils/fetch';
import { getPluginWebTriggerBaseUrl } from '@/lib/utils/helper';

import { Workspace } from '../models';
import { default as TestReport, TestReportModelType } from './model';

const pluginWebTriggerBaseUrl = getPluginWebTriggerBaseUrl();

/** 创建测试报告模板 */
export const createReportTemplate = async (data: Partial<TestReportModelType>) => {
  const testReportObject = new TestReport();
  await testReportObject.createTemplate(data);
  return testReportObject.toJSON();
};

/** 设置默认模板 */
export const setDefaultReportTemplate = async (objectId: string) => {
  const defaultTemplateKey = 'isDefaultTemplate';

  const currentTemplateData = (await new Parse.Query(TestReport)
    .equalTo('objectId', objectId)
    .select(['objectId', 'isGlobalTemplate', 'workspace'])
    .first({ json: true } as any)) as any;

  // 模板存在空间默认模板和全局默认模板，所以需要根据当前模板的空间和全局属性来查询默认模板
  const defaultTemplateQuery = new Parse.Query(TestReport).equalTo(defaultTemplateKey, true);

  if (currentTemplateData.isGlobalTemplate) {
    defaultTemplateQuery.equalTo('isGlobalTemplate', true);
  }
  if (currentTemplateData.workspace) {
    defaultTemplateQuery.equalTo(
      'workspace',
      Workspace.createWithoutData(currentTemplateData.workspace),
    );
  }

  const defaultTemplateObjects = await defaultTemplateQuery.findAll();

  const currentTemplateObject = new TestReport({ objectId });

  // 取消原来的默认模板
  if (defaultTemplateObjects?.length) {
    defaultTemplateObjects.forEach(obj => obj.set(defaultTemplateKey, false));
  }

  currentTemplateObject.set(defaultTemplateKey, true);

  return await Parse.Object.saveAll(
    [...defaultTemplateObjects, currentTemplateObject].filter(Boolean),
  );
};

/** 更新测试报告或者模板 */
export const updateTestReport = async (
  data: Pick<TestReportModelType, 'objectId'> & Partial<TestReportModelType>,
) => {
  // const SyncUpdateChartGroupKeys = ['name'];
  const testReportObject = new TestReport();
  // const chartGroupNeedUpdateKeys = Object.keys(data).filter(key =>
  //   SyncUpdateChartGroupKeys.includes(key),
  // );
  testReportObject.set(data);
  await testReportObject.save();
  return testReportObject.toJSON();
};

/** 删除测试报告或模板 */
export const deleteTestReport = async (objectId: string) => {
  await new TestReport().delete(objectId);
};

/** 生成测试报告离线文档 */
export const generateTestReportOfflineFile = (testReportId: string, exportPdf?: boolean) => {
  return fetch.$post(`${pluginWebTriggerBaseUrl}/api-generate-offline-report`, {
    testReportId,
    exportPdf,
  });
};
