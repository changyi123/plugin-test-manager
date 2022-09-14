import { TestType } from '@/lib/constants';
import { TestEntity } from '@/lib/types/Test';
import { compactStepModel } from '@/lib/utils/modelTransfer';

// 测试详情实体类型
type TestDetailEntity = TestEntity<TestType.TestDetail>;
export interface ICommonRes<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

/**
 * @deprecated 更新或者保存测试用例
 */
export const updateTestDetail = async (
  testEntity: Parse.Object<TestDetailEntity>,
  params: {
    precondition?: string;
    steps?: Record<string, any>[];
  },
) => {
  const testEntityData = testEntity.toJSON();
  const needUpdateAttrs = {
    detail: Object.assign({}, testEntityData.detail),
  };

  if (params.precondition) {
    needUpdateAttrs.detail.precondition = params.precondition;
  }

  if (params.steps) {
    needUpdateAttrs.detail.steps = params.steps.map(compactStepModel);
  }

  return testEntity.save(needUpdateAttrs);
};
