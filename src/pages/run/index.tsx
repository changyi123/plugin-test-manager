import React, { useCallback, useState } from 'react';
import { Empty, message } from '@osui/ui';
import ItemList from './components/ItemList';
import StepList, { IStepItem } from './components/StepList';
import { StatusBadge } from '@/components/common/Status';
import { useLocation } from 'react-router-dom';
import { GetTestRunDetail, toggleTestRunStatus } from '@/lib/api/runs';
import { useRequest } from 'ahooks';
import { updateTestStep, InitStepByTestId } from '@/lib/api/runs';
import Loading from '@/components/common/Loading';
import FieldsInput from '@/pages/panel/TestDetail/TestDetailPanel/components/FieldsInput';
import CustomCollapse from './components/Collapse';
import AddDefectBtn from './components/AddDefectBtn';
import RelationTable from './components/RelationTable';

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

interface TestInfoContent {
  detail?: {
    startTime?: number;
    assignee?: string;
    version?: string;
    finishTime?: number;
    executedBy?: string;
  };
  changeRunInfo: (info: IRunDetail['detail']) => void;
}

export interface IRunDetail {
  detail?: TestInfoContent['detail'];
  runs: {
    steps: Array<IStepItem>;
  };
}

let firstLoad = true;
const TestRun: React.FC<{ testId?: string }> = ({ testId }) => {
  const query = useQuery();
  const currentTestId = query.get('id') || testId;
  // 从路由/弹窗拿
  const { data, loading, error, refresh } = useRequest(() => GetTestRunDetail(currentTestId));
  const [refreshNum, setRefreshNum] = useState(0);
  // 防止重复调用
  const isRunInitialRef = React.useRef(false);

  const checkRunInit = useCallback(async () => {
    if (isRunInitialRef.current || !currentTestId) return;
    isRunInitialRef.current = true;
    console.info('初始化测试执行数据');
    await InitStepByTestId(currentTestId);
    refresh();
  }, [currentTestId, refresh]);

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
    setRefreshNum(refreshNum + 1);
  }, [refresh, refreshNum]);

  if (!currentTestId) {
    return <div>无</div>;
  }

  if (error) {
    return <div>加载失败,原因{error?.message}</div>;
  }
  if (loading && firstLoad) {
    firstLoad = false;
    return <Loading />;
  }
  if (!data?.data) {
    return <Empty description="测试执行为空"></Empty>;
  }

  if (!data?.data?.runDetail?.runs) {
    checkRunInit();
    return <Loading tip="初始化runs中..."></Loading>;
  }

  const { itemDetail, runDetail, status, objectId, defectList, notRepeatNum } = data?.data;

  // 当前测试执行已经关联的缺陷 id
  const allRelationDefectIds = defectList.map(item => item.value);

  const saveItem = (key: string) => {
    return (value, refreshFun?: boolean) => {
      const runDetailBak = { ...runDetail };
      runDetailBak[key] = value;
      // saveList(itemBak, index);
      updateTestStep(runDetailBak, objectId).then(() => {
        /* message.success('修改成功'); */
        if (refreshFun) {
          setRefreshNum(refreshNum + 1);
        }
        refresh && refresh();
      });
    };
  };

  return (
    <Loading loading={loading}>
      <div className={css('run')}>
        <div className={css('run__topic')}>
          <div className={css('run__topic__label')}>{itemDetail?.name}</div>
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
                  num={notRepeatNum}
                  titleExtra={
                    <AddDefectBtn
                      testId={objectId}
                      currentDefectIds={runDetail.defectIds}
                      allRelationDefectIds={allRelationDefectIds}
                      save={val => saveItem('defectIds')(val, true)}
                    />
                  }
                >
                  <ItemList
                    defects={defectList}
                    testId={objectId}
                    save={() => saveItem('defectIds')}
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
                  <RelationTable itemId={itemDetail?.objectId} refreshNum={refreshNum} />
                </CustomCollapse.Panel>

                <CustomCollapse.Panel title="用例步骤" num={runDetail?.runs?.steps?.length || 0}>
                  <StepList
                    detail={runDetail}
                    objectId={objectId}
                    testId={currentTestId}
                    refresh={handleStepRefresh}
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
