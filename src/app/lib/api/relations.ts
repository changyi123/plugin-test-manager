import { updateItem } from '@/lib/api/common';
import { BaseTestEntity } from 'common/types/test';
import { TestLinkType } from 'common/constant';
import { uniq } from 'lodash';

/** 测试用例添加至测试计划 1:N */
export const createRelations = async (params: {
  linkType: TestLinkType;
  link: string[]; // 测试计划id
  targetItem: BaseTestEntity; // 测试用例数据
}) => {
  // 获取当前测试用例已有的测试计划id
  const { linkType, linkItems, objectId } = params.targetItem;
  // 提交数据
  return updateItem(objectId, {
    linkType,
    linkItems: uniq([...(linkItems || []), ...params.link]), // 合并测试计划列表，并去重
  });
};

/**
 * @deprecated 将测试任务添加至测试计划 1:N
 */
export const createTestExecutionToPlanRelations = async () => {};
