import React, { useEffect, useState } from 'react';
import { Descriptions, Typography, Collapse, Divider, Spin, Empty, message } from '@osui/ui';
import UploadFile from '@/components/common/UploadFile';
import Comment from '@/components/common/Comment';
import ItemList from './components/ItemList';
import StepList, { IStepItem } from './components/StepList';
import TestStatus from './components/TestStatus';
import { useLocation } from 'react-router-dom';
import { GetTestRunDetail } from '@/lib/api/runs';
import { useRequest } from 'ahooks';
import { updateTestStep, InitStepByTestId } from '@/lib/api/runs';

import css from './index.less';

const { Paragraph } = Typography;
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
    startTime?: string;
    assignee?: string;
    version?: string;
    finishTime?: string;
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
  const changeStr = (key: keyof TestInfoContent['detail'], value: string) => {
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
    <Descriptions title="执行信息">
      <Descriptions.Item label="开始时间" className={css('descriptions-top')}>
        <Paragraph editable={{ onChange: (val: string) => changeStr('startTime', val) }}>
          {info?.startTime}
        </Paragraph>
      </Descriptions.Item>
      <Descriptions.Item label="负责人" className={css('descriptions-top')}>
        <Paragraph editable={{ onChange: (val: string) => changeStr('assignee', val) }}>
          {info?.assignee}
        </Paragraph>
      </Descriptions.Item>
      <Descriptions.Item label="版本" className={css('descriptions-top')}>
        <Paragraph editable={{ onChange: (val: string) => changeStr('version', val) }}>
          {info?.version}
        </Paragraph>
      </Descriptions.Item>
      <Descriptions.Item label="完成时间">
        <Paragraph editable={{ onChange: (val: string) => changeStr('finishTime', val) }}>
          {info?.finishTime}
        </Paragraph>
      </Descriptions.Item>
      <Descriptions.Item label="执行人">
        <Paragraph editable={{ onChange: (val: string) => changeStr('executedBy', val) }}>
          {info?.executedBy}
        </Paragraph>
      </Descriptions.Item>
    </Descriptions>
  );
};

const TestRun: React.FC<{ testId?: string }> = ({ testId }) => {
  const query = useQuery();
  const currentTestId = query.get('id') || testId;
  // 从路由/弹窗拿
  const { data, loading, error, refresh } = useRequest(() => GetTestRunDetail(currentTestId));

  const checkRunInit = React.useCallback(() => {
    InitStepByTestId(currentTestId)
      .then(() => {
        message.success('初始化成功');
        refresh();
      })
      .catch(() => {
        message.warning('初始化失败');
      });
  }, [currentTestId, refresh]);

  if (!currentTestId) {
    return <div>无</div>;
  }

  if (error) {
    return <div>加载失败,原因{error?.message}</div>;
  }
  if (loading) {
    return <Spin tip="加载中..."></Spin>;
  }
  if (!data?.data) {
    return <Empty description="测试运行为空"></Empty>;
  }

  if (!data?.data || !data?.data?.runDetail?.runs?.steps) {
    checkRunInit();
    return <Spin tip="初始化runs中..."></Spin>;
  }

  const { itemDetail, runDetail, status, objectId } = data?.data;

  const changeRunInfo = (info: IRunDetail['detail']) => {
    const detailBak: IRunDetail = { ...runDetail };
    detailBak.detail = info;
    updateTestStep(detailBak, objectId).then(() => {
      message.success('修改成功');
      refresh && refresh();
    });
  };

  return (
    <div className={css('run')}>
      {/* <div>
        <Breadcrumb>
          <Breadcrumb.Item>首页</Breadcrumb.Item>
          <Breadcrumb.Item>
            <a href="">测试执行</a>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <a href="">测试用例</a>
          </Breadcrumb.Item>
        </Breadcrumb>
      </div> */}

      <div className={css('run__header')}>
        <div>
          <Typography.Text ellipsis>
            {itemDetail?.name}（{itemDetail?.key}）
          </Typography.Text>
        </div>

        <TestStatus status={status} testId={currentTestId} />
      </div>

      <Divider />

      <TestInfo detail={runDetail.detail} changeRunInfo={changeRunInfo} />

      <div className={css('run__total')}>
        <Collapse defaultActiveKey={['2']}>
          <Collapse.Panel header="总结" key="1">
            <Collapse defaultActiveKey={['1', '2', '3']}>
              {/* <Collapse.Panel header="缺陷" key="1">
                <ItemList />
              </Collapse.Panel>
              <Collapse.Panel header="附件" key="2">
                <UploadFile />
              </Collapse.Panel> */}
              <Collapse.Panel header="留言(点击文本编辑)" key="3">
                <Comment />
              </Collapse.Panel>
            </Collapse>
          </Collapse.Panel>
          <Collapse.Panel header="详情" key="2">
            <Collapse defaultActiveKey={['1', '2', '3']}>
              {/* <Collapse.Panel header="关联事项" key="1">
                <ItemList />
              </Collapse.Panel> */}
              {/* <Collapse.Panel header="前置条件" key="2.2">
                <UploadFile />
              </Collapse.Panel> */}
              <Collapse.Panel header="步骤" key="3">
                <StepList detail={runDetail} objectId={objectId} testId={currentTestId} />
              </Collapse.Panel>
            </Collapse>
          </Collapse.Panel>
        </Collapse>
      </div>
    </div>
  );
};

export default TestRun;
