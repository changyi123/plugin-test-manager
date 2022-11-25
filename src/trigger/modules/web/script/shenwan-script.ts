import { iqlRequest } from '../../../lib/iqlRequest';
import { testEntityFieldTypeValidator } from '../../../lib/validator';
import { TestLinkType, TestType } from '../../../../common/constant';

export const runShenWanScript = async () => {
  // const ParseBaseQueryOptions = {
  //   sessionToken: global.sessionToken,
  // };
  const queryTestEntity = async props => {
    const { offset, limit, ascending, query = {}, fields, selector, descending } = props;
    return iqlRequest({
      query,
      selector,
      ascending,
      descending,
      fields,
      pagination: { limit, offset },
    });
  };

  const queryLinkedTestEntity = async props => {
    const { limit, query, offset, linkQuery, selector, fields, ascending, descending } = props;

    // 请求参数校验
    testEntityFieldTypeValidator({
      linkType: linkQuery.linkType,
      type: linkQuery.destinationType,
      linkItems: linkQuery.sourceIds,
    });

    return iqlRequest({
      query,
      selector,
      ascending,
      descending,
      fields,
      pagination: { limit, offset },
      linkQuery,
    });
  };

  // 获取请求的参数
  const { itemId, workspace } = global.body;
  // 查询测试计划信息
  const {
    data: {
      list: [data],
    },
  } = await queryTestEntity({
    query: {
      id: [itemId],
      type: TestType.Plan,
    },
    fields: ['id', 'workspace'],
  });

  // 事项非测试计划不进行工作流脚本校验
  if (!data) {
    return { code: 0 };
  }

  // 申万限制部分空间工作流校验
  if (!workspace?.includes(data.workspace.objectId) && !workspace?.includes(data.workspace.key)) {
    return { code: 0 };
  }

  // 查询当前测试计划下所有测试用例
  const {
    data: { list: testCases },
  } = await queryLinkedTestEntity({
    linkQuery: {
      linkType: TestLinkType.CaseLinkPlan,
      sourceIds: [itemId],
      destinationType: TestType.Case,
    },
    limit: 9999,
  });

  if (!testCases?.length) {
    return { code: 0 };
  }

  const caseStatus = (testCases as any[]).filter(d => d.caseStatus?.[itemId] !== 'PASSED');

  if (caseStatus?.length) {
    return {
      code: -1,
      message: `测试计划下有${caseStatus?.length}条测试用例未通过，请执行通过在进行状态流转`,
    };
  }

  return {
    code: 0,
  };
};
