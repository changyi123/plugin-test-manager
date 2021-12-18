import React from 'react';
import { Popover, Row, Col, Space, Divider, Button } from '@osui/ui';
import {
  InfoCircleOutlined,
  PlusCircleOutlined,
  ExclamationCircleOutlined,
  FileAddOutlined,
} from '@ant-design/icons';
import Comment from '@/components//common/Comment';
import TestStatus from './TestStatus';

import css from './StepList.less';

const StepList: React.FC = () => {
  return (
    <div className={css('step-list')}>
      <div className={css('step-list__item')}>
        <div className={css('left')}>
          <div className={css('left__index')}>1</div>
          <div className={css('left__tips')}>
            <Popover content={<div>继承测试用例</div>}>
              <InfoCircleOutlined />
            </Popover>
          </div>
        </div>

        <div className={css('right')}>
          <Row gutter={[0, 0]}>
            <Col className={css('right__item')} span={8}>
              <div className={css('right__topic')}>行动</div>
              <div className={css('right__content')}>xxx</div>
            </Col>

            <Col className={css('right__item')} span={8}>
              <div className={css('right__topic')}>数据</div>
              <div className={css('right__content')}>xxx</div>
            </Col>

            <Col className={css('right__item')} span={8}>
              <div className={css('right__topic')}>预期结果</div>
              <div className={css('right__content')}>xxx</div>
            </Col>
          </Row>

          <div className={css('right__actual')}>
            <Col className={css('right__item')} span={24}>
              <div className={css('right__topic')}>实际结果</div>
              <div className={css('right__content')}>
                <Comment placeholder="点击输入实际结果" />
              </div>
            </Col>
          </div>

          <Col className={css('right__item')} span={24}>
            <div className={css('right__tools')}>
              <div className={css('right__tools__left')}>
                <Space split={<Divider type="vertical" />}>
                  <div className={css('comment')}>
                    <Comment placeholder="点击输入留言" />
                  </div>

                  <div className={css('btn')}>
                    <Button type="primary" icon={<PlusCircleOutlined />}>
                      添加缺陷
                    </Button>
                    <ExclamationCircleOutlined style={{ marginLeft: '10px', color: 'red' }} />
                    (1)
                  </div>

                  <div className={css('btn')}>
                    <Button icon={<FileAddOutlined />}>添加附件</Button>

                    <ExclamationCircleOutlined style={{ marginLeft: '10px', color: 'red' }} />
                  </div>
                </Space>
              </div>
              <div className={css('right__')}>
                <TestStatus status="todo" />
              </div>
            </div>
          </Col>
        </div>
      </div>
    </div>
  );
};

export default StepList;
