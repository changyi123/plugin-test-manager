import React, { useState } from 'react';
import { Breadcrumb, Row, Col, Typography, Collapse, Divider } from '@osui/ui';
import UploadFile from '@/components/common/UploadFile';
import Comment from '@/components/common/Comment';
import ItemList from './components/ItemList';
import StepList from './components/StepList';
import TestStatus from './components/TestStatus';

import css from './index.less';
export interface ITestInfo {
  topic: string;
  content: string;
  key: string;
}

const TestInfo: React.FC = () => {
  const info: Array<ITestInfo> = [
    {
      key: 'startTime',
      topic: '开始时间',
      content: 'xxx',
    },
    {
      key: 'assignee',
      topic: '负责人',
      content: 'xxx',
    },
    {
      key: 'version',
      topic: '版本',
      content: 'xxx',
    },
    {
      key: 'env',
      topic: '测试环境',
      content: 'xxx',
    },
    {
      key: 'finishTime',
      topic: '完成时间',
      content: 'xxx',
    },
    {
      key: 'executedBy',
      topic: '执行人',
      content: 'xxx',
    },
    {
      key: 'Revision',
      topic: '修订版本',
      content: 'xxx',
    },
  ];

  return (
    <div className={css('run__info')}>
      <Row gutter={[16, 16]}>
        {info.map(item => (
          <Col key={item.key} className={css('run__info')} span={6}>
            <Typography.Title level={5}>{item.topic}</Typography.Title>
            <div className={css('run__info__content')}>{item.content}</div>
          </Col>
        ))}
      </Row>
    </div>
  );
};

const TestRun: React.FC = () => {
  return (
    <div className={css('run')}>
      <div>
        <Breadcrumb>
          <Breadcrumb.Item>首页</Breadcrumb.Item>

          <Breadcrumb.Item>
            <a href="">测试执行</a>
          </Breadcrumb.Item>

          <Breadcrumb.Item>
            <a href="">测试用例</a>
          </Breadcrumb.Item>
        </Breadcrumb>
      </div>

      <div className={css('run__header')}>
        <div>
          <Typography.Link ellipsis href="#">
            测试用例11111
          </Typography.Link>
        </div>

        <TestStatus />
      </div>

      <Divider />

      <TestInfo />

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
