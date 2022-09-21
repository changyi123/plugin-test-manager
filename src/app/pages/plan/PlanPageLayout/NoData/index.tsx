import React from 'react';
import { Button, Empty, notification, Spin } from 'antd';
import { useBaseAction } from '@/lib/hooks/useContext';
import { TestLinkType, TestType } from '@/lib/constants';
import emptyImg from '@/icons/svg/empty-data.png';
import { usePageContext } from '../../hook';

import cx from './index.less';
import { batchCreateTestRun, getlinkedTestEntityByQuery, updateTestEntity } from '@/lib/api/item';
import { generateSortIndex } from '@/lib/utils/helper';

interface NoDataProps {
  setRefreshExecution?: (val: boolean) => void;
}

const NoData: React.FC<NoDataProps> = ({ setRefreshExecution }) => {
  const { workspaceKey, selectedTestPlan } = usePageContext();
  const { createItemUseModal } = useBaseAction();

  // 创建测试执行任务
  const createTestExecution = async () => {
    const { item, extraData } = await createItemUseModal({
      type: TestType.Execution,
      extraData: { planId: selectedTestPlan?.objectId },
    });

    // 测试执行任务更新后，拿全部测试计划创建测试执行

    // TODO 创建测试执行，创建测试执行任务和执行关系，创建执行和用例关系
    try {
      notification.open({
        message: '测试执行任务正在创建中',
        icon: <Spin spinning={true} />,
        duration: null,
      });

      const { list: caseIds } = await getlinkedTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
        },
        limit: 9999,
        linkType: TestLinkType.CaseLinkPlan,
        sourceIds: [selectedTestPlan.objectId],
        destinationType: TestType.Case,
        descending: [],
        onlySelectId: true,
      });

      // 创建完测试执行任务事项，更新测试执行任务关联测试计划
      await updateTestEntity([
        {
          objectId: item.objectId,
          type: TestType.Execution,
          linkType: TestLinkType.ExecutionLinkPlan,
          linkItems: {
            action: 'add',
            value: [extraData?.planId],
          },
          sortIndex: generateSortIndex(),
        },
      ]);

      // 创建测试执行
      await batchCreateTestRun({
        executionId: item.objectId,
        caseIds,
      });

      notification.destroy();
      notification.success({
        message: `测试执行任务【${item.name}】新建成功`,
      });
      setRefreshExecution(true);
    } catch (err) {
      notification.error({
        message: '测试执行任务新建失败',
      });
      notification.destroy();
    }
  };
  return (
    <div className={cx('no-data-box')}>
      <Empty description="暂无测试执行任务" image={emptyImg}>
        <Button type="primary" onClick={createTestExecution}>
          新建测试执行任务
        </Button>
      </Empty>
    </div>
  );
};

export default NoData;
