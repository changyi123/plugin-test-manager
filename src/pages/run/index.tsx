import React, { useCallback, useState } from 'react';
import { Row, Col, Divider, Empty, message } from '@osui/ui';
import ItemList from './components/ItemList';
import StepList, { IStepItem } from './components/StepList';
import { StatusBadge } from '@/components/common/Status';
import { useLocation } from 'react-router-dom';
import { GetTestRunDetail, toggleTestRunStatus } from '@/lib/api/runs';
import { useRequest } from 'ahooks';
import { updateTestStep, InitStepByTestId } from '@/lib/api/runs';
import Loading from '@/components/common/Loading';
import FieldsInput, {
  FieldsTimepicker,
} from '@/pages/panel/TestDetail/TestDetailPanel/components/FieldsInput';
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

const TestInfo: React.FC<TestInfoContent> = ({ detail, changeRunInfo }) => {
  const [info, setInfo] = useState<TestInfoContent['detail']>(detail);
  const changeStr = (key: keyof TestInfoContent['detail'], value: string | number) => {
    setInfo({
      ...info,
      [key]: value,
    });
    changeRunInfo({
      ...info,
      [key]: value,
    });
  };
  return (
    <Row gutter={[24, 24]} className={css('info')}>
      <Col xs={6} xl={4}>
        <div className={css('info__title')}>开始时间</div>
        <div className={css('info__val')}>
          <FieldsTimepicker
            borderColor="white"
            value={info?.startTime}
            change={(val: number) => changeStr('startTime', val)}
          />
        </div>
      </Col>

      <Col xs={6} xl={4}>
        <div className={css('info__title')}>完成时间</div>
        <div className={css('info__val')}>
          <FieldsTimepicker
            borderColor="white"
            value={info?.finishTime}
            change={(val: number) => changeStr('finishTime', val)}
          />
        </div>
      </Col>

      <Col xs={6} xl={4}>
        <div className={css('info__title')}>负责人</div>
        <div className={css('info__val')}>
          <FieldsInput
            borderColor="white"
            value={info?.assignee}
            change={(val: string) => changeStr('assignee', val)}
          />
        </div>
      </Col>

      <Col xs={6} xl={4}>
        <div className={css('info__title')}>执行人</div>
        <div className={css('info__val')}>
          <FieldsInput
            borderColor="white"
            value={info?.executedBy}
            change={(val: string) => changeStr('executedBy', val)}
          />
        </div>
      </Col>

      <Col xs={6} xl={4}>
        <div className={css('info__title')}>版本</div>
        <div className={css('info__val')}>
          <FieldsInput
            borderColor="white"
            value={info?.version}
            change={(val: string) => changeStr('version', val)}
          />
        </div>
      </Col>
    </Row>
  );
};

let firstLoad = true;
const TestRun: React.FC<{ testId?: string }> = ({ testId }) => {
  const query = useQuery();
  const currentTestId = query.get('id') || testId;
  // 从路由/弹窗拿
  const { data, loading, error, refresh } = useRequest(() => GetTestRunDetail(currentTestId));

  const checkRunInit = useCallback(() => {
    InitStepByTestId(currentTestId)
      .then(() => {
        message.success('初始化成功');
        refresh();
      })
      .catch(() => {
        message.warning('初始化失败');
      });
  }, [currentTestId, refresh]);

  const handleStatusChange = useCallback(
    async (testId, status) => {
      await toggleTestRunStatus(testId, status);
      message.success('修改成功');
      refresh();
    },
    [refresh],
  );

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

  const saveItem = (key: string) => {
    return value => {
      const runDetailBak = { ...runDetail };
      runDetailBak[key] = value;
      // saveList(itemBak, index);
      updateTestStep(runDetailBak, objectId, true).then(() => {
        message.success('修改成功');
        refresh && refresh();
      });
    };
  };

  const changeRunInfo = (info: IRunDetail['detail']) => {
    const detailBak: IRunDetail = { ...runDetail };
    detailBak.detail = info;
    updateTestStep(detailBak, objectId).then(() => {
      message.success('修改成功');
      refresh && refresh();
    });
  };

  return (
    <Loading loading={loading}>
      <div className={css('run')}>
        <div className={css('run__topic')}>
          <div className={css('run__topic__label')}>{itemDetail?.name}</div>
          <div className={css('run__topic__status')}>
            <StatusBadge
              status={status}
              onStatusChange={status => handleStatusChange(testId, status)}
            />
          </div>
        </div>

        <Divider className={css('run__divider')} />

        <TestInfo detail={runDetail.detail} changeRunInfo={changeRunInfo} />

        <div className={css('run__around')}>
          <div className={css('run__around__collapse')}>
            <div className={css('run__around__collapse__item')}>
              <CustomCollapse title="总结">
                <CustomCollapse.Panel
                  title="缺陷"
                  num={notRepeatNum}
                  titleExtra={[
                    <AddDefectBtn
                      currentDefectIds={runDetail.defectIds}
                      key="2"
                      testId={objectId}
                      save={val => saveItem('defectIds')(val)}
                    />,
                  ]}
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
                  <RelationTable itemId={itemDetail?.objectId} />
                </CustomCollapse.Panel>

                <CustomCollapse.Panel title="用例步骤" num={runDetail?.runs?.steps?.length || 0}>
                  <StepList
                    refresh={refresh}
                    detail={runDetail}
                    objectId={objectId}
                    testId={currentTestId}
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
