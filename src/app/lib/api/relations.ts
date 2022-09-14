import { updateItem } from '@/lib/api/common';
import { BaseTestEntity } from 'common/types/test';
import { TestLinkType } from 'common/constant';
import { uniq } from 'lodash';

/** 测试用例添加至测试计划 1:N */
export const createTestDetailToPlanRelations = async (params: {
  testPlan: string[]; // 测试计划id
  testDetail: BaseTestEntity; // 测试用例数据
}) => {
  // 获取当前测试用例已有的测试计划id
  const { linkItems, objectId } = params.testDetail;
  // 提交数据
  return updateItem(objectId, {
    linkType: TestLinkType.CaseLinkPlan,
    linkItems: uniq([...(linkItems || []), ...params.testPlan]), // 合并测试计划列表，并去重
  });
};

/**
 * @deprecated 将测试任务添加至测试计划 1:N
 */
export const createTestExecutionToPlanRelations = async () => {};
