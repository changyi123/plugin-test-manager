import React, { useEffect, useState } from 'react';
import { Breadcrumb, Descriptions, Typography, Collapse, Divider, Spin, Empty } from '@osui/ui';
import UploadFile from '@/components/common/UploadFile';
import Comment from '@/components/common/Comment';
import ItemList from './components/ItemList';
import StepList from './components/StepList';
import TestStatus from './components/TestStatus';
import { useLocation } from 'react-router-dom';
import { GetTestRunDetail } from '@/lib/api/runs';
import { useRequest } from 'ahooks';

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
  detail: any;
}

const TestInfo: React.FC<TestInfoContent> = ({ detail }) => {
  return (
    <Descriptions title="执行信息">
      <Descriptions.Item label="开始时间">{detail.startTime || '-'}</Descriptions.Item>
      <Descriptions.Item label="负责人">{detail.assignee || '-'}</Descriptions.Item>
      <Descriptions.Item label="版本">{detail.version || '-'}</Descriptions.Item>
      <Descriptions.Item label="完成时间">{detail.finishTime || '-'}</Descriptions.Item>
      <Descriptions.Item label="执行人">{detail.executedBy || '-'}</Descriptions.Item>
    </Descriptions>
  );
};

const TestRun: React.FC = () => {
  const query = useQuery();
  const [testRunId, setTestRunId] = useState<string>(query.get('id'));
  const { data, loading, error } = useRequest(() => GetTestRunDetail(testRunId));

  useEffect(() => {
    if (query.get('id') !== testRunId) {
      setTestRunId(query.get('id'));
    }
  }, [query, testRunId]);

  if (!query.get('id')) {
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

  console.log('主线按时', data?.data);
  const { reference, runDetail, status } = data?.data;

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
          <Typography.Link ellipsis href="#">
            {reference.name}（{reference.key}）
          </Typography.Link>
        </div>

        <TestStatus status={status} />
      </div>

      <Divider />

      <TestInfo detail={runDetail} />

      <div className={css('run__total')}>
        <Collapse defaultActiveKey={['2']}>
          <Collapse.Panel header="总结" key="1">
            <Collapse defaultActiveKey={['1', '2', '3']}>
              <Collapse.Panel header="缺陷" key="1">
                <ItemList />
              </Collapse.Panel>
              <Collapse.Panel header="附件" key="2">
                <UploadFile />
              </Collapse.Panel>
              <Collapse.Panel header="留言(点击文本编辑)" key="3">
                <Comment />
              </Collapse.Panel>
            </Collapse>
          </Collapse.Panel>

          <Collapse.Panel header="详情" key="2">
            <Collapse defaultActiveKey={['1', '2', '3']}>
              <Collapse.Panel header="关联事项" key="1">
                <ItemList />
              </Collapse.Panel>
              {/* <Collapse.Panel header="前置条件" key="2.2">
                <UploadFile />
              </Collapse.Panel> */}
              <Collapse.Panel header="步骤" key="3">
                <StepList />
              </Collapse.Panel>
            </Collapse>
          </Collapse.Panel>
        </Collapse>
      </div>
    </div>
  );
};

export default TestRun;
