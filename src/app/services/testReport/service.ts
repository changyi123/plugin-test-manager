import { default as TestReport, TestReportModelType } from './model';

/** 创建测试报告模板 */
export const createReportTemplate = async (data: Partial<TestReportModelType>) => {
  const testReportObject = new TestReport();
  await testReportObject.createTemplate(data);
  return testReportObject.toJSON();
};

/** 设置默认模板 */
export const setDefaultReportTemplate = async (objectId: string) => {
  const defaultTemplateKey = 'isDefaultTemplate';

  const defaultTemplateObject = await new Parse.Query(TestReport)
    .equalTo(defaultTemplateKey, true)
    .first();

  const currentTemplateObject = new TestReport({ objectId });
  // 取消原来的默认模板
  if (defaultTemplateObject) {
    defaultTemplateObject.set(defaultTemplateKey, false);
  }
  currentTemplateObject.set(defaultTemplateKey, true);

  return await Parse.Object.saveAll([defaultTemplateObject, currentTemplateObject].filter(Boolean));
};

/** 更新测试报告或者模板 */
export const updateTestReport = async (
  data: Pick<TestReportModelType, 'objectId'> & Partial<TestReportModelType>,
) => {
  const testReportObject = new TestReport();
  testReportObject.set(data);
  await testReportObject.save();
  return testReportObject.toJSON();
};

/** 删除测试报告或模板 */
export const deleteTestReport = async (objectId: string) => {
  await new TestReport().delete(objectId);
};
