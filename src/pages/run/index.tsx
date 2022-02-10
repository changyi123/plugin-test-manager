import React, { useCallback } from 'react';
import { Empty, message } from '@osui/ui';
import ItemList from './components/ItemList';
import StepList, { TestStep } from './components/StepList';
import { StatusBadge } from '@/components/common/Status';
import { useLocation } from 'react-router-dom';
import { toggleTestRunStatus } from '@/lib/api/runs';
import { useRequest } from 'ahooks';
import Loading from '@/components/common/Loading';
import FieldsInput from '@/pages/panel/TestDetail/TestDetailPanel/components/FieldsInput';
import CustomCollapse from './components/Collapse';
import AddDefectBtn from './components/AddDefectBtn';
import RelationTable from './components/RelationTable';
import { getTestEntities } from '@/lib/api/common';
import { updateTestRun, getTestStepsByTestDetailId } from '@/lib/api/runs';

import css from './index.less';
export interface ITestInfo {
  topic: string;
  content: string;
  key: string;
}

function useQuery() {
  const { search } = useLocation();

  return React.useMemo(() => new URLSearchParams(search), [search]);
}

export interface IRunDetail {
  runs: {
    steps: TestStep[];
  };
}

const TestRun: React.FC<{ testId?: string }> = ({ testId }) => {
  const query = useQuery();
  const relationTableActionRef = React.useRef();
  const currentTestId = query.get('id') ?? testId;

  // 从路由/弹窗拿
  const {
    data: runDetailData,
    loading,
    error,
    refresh,
  } = useRequest(
    async () => {
      let [testRunEntity] = await getTestEntities(
        { id: currentTestId },
        { include: ['runReferenceDetail.reference'] },
      );

      let testRunData = testRunEntity.toJSON();

      // 需要初始化测试执行详情数据
      if (!Array.isArray(testRunData.runDetail?.steps)) {
        try {
          const steps = await getTestStepsByTestDetailId(testRunData.runReferenceDetail.objectId);
          testRunEntity = await testRunEntity.save({
            runDetail: Object.assign({ steps }, testRunData.runDetail),
          });

          testRunData = testRunEntity.toJSON();
        } catch (err) {
          message.error(err.message);
        }
      }

      // 缺陷列表
      const defectList = [];

      testRunData?.runDetail?.defectItemIds?.forEach((item: string) => {
        defectList.push({
          label: '全局',
          value: item,
        });
      });
      testRunData?.runDetail?.steps?.forEach((item, index) => {
        item?.defectItemIds?.forEach((item2: string) => {
          defectList.push({
            label: `步骤${index + 1}`,
            value: item2,
          });
        });
      });

      // 测试执行关联的测试用例事项数据
      const runRefTestDetailItemData = testRunData.runReferenceDetail.reference;

      return { ...testRunData, runRefTestDetailItemData, testRunEntity, defectList };
    },
    {
      ready: Boolean(testId),
    },
  );
  const handleStatusChange = useCallback(
    async (testId, status) => {
      await toggleTestRunStatus(testId, status);
      message.success('修改成功');
      refresh();
    },
    [refresh],
  );

  const handleStepRefresh = useCallback(() => {
    refresh();
    (relationTableActionRef.current as any).refresh();
  }, [refresh]);

  if (error) {
    return <div>加载失败,原因{error?.message}</div>;
  }

  if (!runDetailData) {
    return <Empty description="测试执行为空"></Empty>;
  }

  const {
    runRefTestDetailItemData,
    runDetail = {},
    status,
    objectId,
    defectList,
    testRunEntity,
  } = runDetailData;

  // 当前测试执行已经关联的缺陷 id
  const allRelationDefectIds = defectList.map(item => item.value);

  const saveItem = (key: string) => {
    return async value => {
      await updateTestRun(testRunEntity, {
        runDetail: {
          [key]: value,
        },
      });
      handleStepRefresh();
    };
  };

  return (
    <Loading loading={loading}>
      <div className={css('run')}>
        <div className={css('run__topic')}>
          <div className={css('run__topic__label')}>{runRefTestDetailItemData?.name}</div>
          <div className={css('run__topic__status')}>
            <StatusBadge
              showBg={true}
              status={status}
              onStatusChange={status => handleStatusChange(testId, status)}
            />
          </div>
        </div>

        <div className={css('run__around')}>
          <div className={css('run__around__collapse')}>
            <div className={css('run__around__collapse__item')}>
              <CustomCollapse title="总结">
                <CustomCollapse.Panel
                  title="缺陷"
                  num={runDetail.defectItemIds?.length}
                  titleExtra={
                    <AddDefectBtn
                      testId={objectId}
                      currentDefectIds={runDetail.defectItemIds}
                      allRelationDefectIds={allRelationDefectIds}
                      save={val => saveItem('defectItemIds')(val)}
                    />
                  }
                >
                  <ItemList
                    defects={defectList}
                    testId={objectId}
                    save={val => saveItem('defectItemIds')(val)}
                  />
                </CustomCollapse.Panel>

                <CustomCollapse.Panel title="评论">
                  <FieldsInput
                    borderColor="white"
                    value={runDetail.comment}
                    change={val => saveItem('comment')(val)}
                  />
                </CustomCollapse.Panel>
              </CustomCollapse>
            </div>

            <div className={css('run__around__collapse__item')}>
              <CustomCollapse title="测试用例详情">
                <CustomCollapse.Panel title="测试用例关联事项" num={defectList.length}>
                  <RelationTable
                    itemId={runRefTestDetailItemData?.objectId}
                    actionRef={relationTableActionRef}
                  />
                </CustomCollapse.Panel>

                <CustomCollapse.Panel title="用例步骤" num={runDetail?.steps?.length ?? 0}>
                  <StepList
                    objectId={objectId}
                    testId={currentTestId}
                    steps={runDetail?.steps}
                    refresh={handleStepRefresh}
                    testRunEntity={testRunEntity}
                    allRelationDefectIds={allRelationDefectIds}
                  />
                </CustomCollapse.Panel>
              </CustomCollapse>
            </div>
          </div>
        </div>
      </div>
    </Loading>
  );
};

export default TestRun;
