// import { getParseQuery } from '@giteeteam/apps-team-api';
import { i18n } from '@giteeteam/apps-api';

import { TestLinkType, TestType } from '../../../../common/constant';
import { iqlRequest } from '../../../lib/iqlRequest';
import { testEntityFieldTypeValidator } from '../../../lib/validator';

// https://proximahq.feishu.cn/wiki/wikcnKFmSI1feCDVyXERvfX7awc 徽商脚本
export const runHuishangScript = async () => {
  const { t } = i18n;

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

  async function fetchTestFromPlanItemId(id) {
    const {
      data: { list: executions },
    } = await queryLinkedTestEntity({
      linkQuery: {
        linkType: TestLinkType.CaseLinkPlan,
        sourceIds: [id],
        destinationType: TestType.Case,
      },
      fields: ['id'],
    });
    if (!executions?.length) {
      return { code: -1, message: t('trigger.web.script.huishangWorkflowMessage.0') };
    }
    return { code: 0, data: executions };
  }

  // 获取请求的参数
  const { itemId, action, checkStatus } = global.body;
  // eslint-disable-next-line
  console.log('global.body', global.body);

  if (action === 'has-test') {
    // 测试计划状态流转时，校验必须存在至少一个测试用例
    // 计划id -> 关联的用例
    const executionRes = await fetchTestFromPlanItemId(itemId);
    return executionRes;
  } else if (action === 'execution-done') {
    // 测试计划状态【已完成】时，校验所有的测试执行任务必须【已完成】
    const {
      data: { list: runs },
    } = await queryLinkedTestEntity({
      linkQuery: {
        linkType: TestLinkType.ExecutionLinkPlan,
        sourceIds: [itemId],
        destinationType: TestType.Execution,
      },
      fields: ['id', 'status'],
      limit: 9999,
    });
    if (!runs?.length)
      return { code: -1, message: t('trigger.web.script.huishangWorkflowMessage.1') };
    const hasUnPass = runs.find(item => !checkStatus.includes((item as any).status.name));
    if (hasUnPass) {
      return {
        code: -1,
        message: `${t('trigger.web.script.huishangWorkflowMessage.2')}${checkStatus.map(
          status => `【${status}】`,
        )}`,
      };
    }
    return { code: 0 };
  } else if (action === 'create-execution') {
    if (!itemId) return { code: 0 };
    // 界面脚本--创建测试执行任务保存时，校验测试计划状态是否符合要求
    // 获取这个任务关联的计划
    const {
      data: {
        list: [data],
      },
    } = await queryTestEntity({
      query: {
        id: [itemId],
        type: TestType.Plan,
      },
      fields: ['id', 'status'],
    });
    if (!checkStatus.includes((data as any)?.status.name)) {
      return {
        code: -1,
        message: `${t('trigger.web.script.huishangWorkflowMessage.3')}${checkStatus.join('、')}`,
      };
    }
    return { code: 0 };
  } else if (action === 'runs-done') {
    // 检测测试执行任务状态改为【已完成】时，校验下所有的用例是否都执行
    const {
      data: { list: testRuns },
    } = await queryLinkedTestEntity({
      linkQuery: {
        linkType: TestLinkType.RunLinkExecution,
        sourceIds: [itemId],
        destinationType: TestType.Run,
      },
      limit: 9999,
    });
    const todoTest = (testRuns as any[]).filter(test => !test.status || test.status === 'TODO');
    if (todoTest.length) {
      return { code: -1, message: t('trigger.web.script.huishangWorkflowMessage.4') };
    }
    return { code: 0 };
  }
};
