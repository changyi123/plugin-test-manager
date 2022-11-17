import React, { useCallback, useRef, useState } from 'react';
import { Button, Empty, notification, Spin } from 'antd';
import { useBaseAction } from '@/lib/hooks/useContext';
import { TestLinkType, TestType } from '@/lib/constants';
import emptyImg from '@/icons/svg/empty-data.png';
import { usePageContext } from '../../hook';
import { batchCreateTestRun, updateTestEntity } from '@/lib/api/item';
import { generateSortIndex } from '@/lib/utils/helper';
import TestEntitySelectorModal, {
  ActionType as ModelActionType,
} from '@/components/business/TestEntitySelectorModal';
import { useListener } from '@projectproxima/proxima-sdk-js';
import { PROXIMA_EVENT_KEY } from '@/lib/constants';
import createProximaSdk from '@projectproxima/proxima-sdk-js';
const proxima = createProximaSdk();

import cx from './index.less';

interface NoDataProps {
  setRefreshExecution?: (val: boolean) => void;
}

const NoData: React.FC<NoDataProps> = ({ setRefreshExecution }) => {
  const { selectedTestPlan } = usePageContext();
  const { createItemUseModal } = useBaseAction();
  const testEntitySelectorRef = useRef<ModelActionType>();
  const [selectValue, setSelectValue] = useState<string[] | undefined>(undefined);
  const [treeType, setTreeType] = React.useState<string | undefined>('plan');

  const getSelectCaseIds = useCallback(async () => {
    if (!testEntitySelectorRef.current?.open) return;
    const data = await testEntitySelectorRef.current?.open({
      selectValue,
      treeType,
      modelProps: {
        title: '第 1 步：选择关联用例',
        footer: {
          ok: {
            name: '下一步',
          },
          cancel: {
            name: '取消',
          },
        },
      },
    });

    return data;
  }, [selectValue, treeType]);

  const createExecution = useCallback(
    async (caseIds = [], createNext = false) => {
      const res = await createItemUseModal({
        type: TestType.Execution,
        extraData: {
          planId: selectedTestPlan?.objectId,
          customCreateItem: true,
          checkCreateNext: createNext,
          showPrevButton: true,
          modalProps: {
            title: `第 2 步：新建测试执行任务（已选 ${caseIds.length} 条用例）`,
            footer: {
              cancel: {
                name: '上一步',
              },
            },
          },
        },
      });

      return res;
    },
    [createItemUseModal, selectedTestPlan?.objectId],
  );

  // 创建测试执行任务
  const createTestExecution = useCallback(
    async (createNext?: boolean) => {
      const data = await getSelectCaseIds();
      if (!data) return;
      const { selectedData: caseIds, treeType } = data;
      setSelectValue(caseIds);
      setTreeType(treeType);
      const { item, extraData } = await createExecution(caseIds, createNext);
      const checkCreateNext: boolean = (extraData as any)?.checkCreateNext;

      // TODO 创建测试执行，创建测试执行任务和执行关系，创建执行和用例关系
      try {
        notification.open({
          message: '测试执行任务正在创建中',
          icon: <Spin spinning={true} />,
          duration: null,
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
        if (caseIds.length > 0) {
          await batchCreateTestRun({
            executionId: item.objectId,
            caseIds,
          });
        }

        notification.destroy();
        notification.success({
          message: `测试执行任务【${item.name}】新建成功`,
        });
        if (checkCreateNext) {
          proxima.execute('CreateExecutionNext', checkCreateNext);
        }
        setRefreshExecution(true);
      } catch (err) {
        notification.destroy();
        notification.error({
          message: '测试执行任务新建失败',
        });
      }
    },
    [createExecution, getSelectCaseIds, setRefreshExecution],
  );

  const cancelCallback = useCallback(
    async params => {
      if (params?.type === 'prev') {
        await createTestExecution();
      }
    },
    [createTestExecution],
  );

  useListener('CreateItemModalPrev', cancelCallback);
  useListener(PROXIMA_EVENT_KEY.itemBatchCreateSuccess, () => {
    setSelectValue([]);
    setTreeType('plan');
  });

  return (
    <div className={cx('no-data-box')}>
      <Empty description="暂无测试执行任务" image={emptyImg}>
        <Button
          type="primary"
          onClick={async () => {
            await createTestExecution();
          }}
        >
          新建测试执行任务
        </Button>
        <TestEntitySelectorModal
          title="选择规划的测试用例"
          testType={TestType.Case}
          actionRef={testEntitySelectorRef}
          onCancel={() => {
            setSelectValue([]);
            setTreeType('plan');
          }}
          planId={selectedTestPlan?.objectId}
        />
      </Empty>
    </div>
  );
};

export default NoData;
