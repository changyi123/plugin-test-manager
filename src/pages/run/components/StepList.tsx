import React, { useCallback } from 'react';
import { Popover, Row, Col, Space, Divider, Button, message } from '@osui/ui';
import {
  InfoCircleOutlined,
  PlusCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import Comment from '@/components//common/Comment';
import TestStatus, { IColor } from './TestStatus';
import { updateTestStep } from '@/lib/api/runs';

import css from './StepList.less';

export interface IStepItem {
  action: string;
  attachments: string[];
  data: string;
  index: number;
  result: string;
  id: string;
  actualResult: string;
  comment: string;
  status: IColor;
}

export interface IStepItemProps {
  item: IStepItem;
  index: number;
  testId: string;
  saveList: (item: IStepItem, index: number) => void;
}

export interface StepListProps {
  testId: string;
  detail?: {
    runs: {
      steps: Array<IStepItem>;
    };
  };
  objectId: string;
}

export const StepItem: React.FC<IStepItemProps> = ({ index, item, saveList, testId }) => {
  const saveItem = useCallback(
    (key: string) => {
      const itemBak = { ...item };
      return value => {
        itemBak[key] = value;
        saveList(itemBak, index);
      };
    },
    [item, saveList, index],
  );
  return (
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
            <div className={css('right__content')}>{item.action}</div>
          </Col>

          <Col className={css('right__item')} span={8}>
            <div className={css('right__topic')}>数据</div>
            <div className={css('right__content')}>{item.data}</div>
          </Col>

          <Col className={css('right__item')} span={8}>
            <div className={css('right__topic')}>预期结果</div>
            <div className={css('right__content')}>{item.data}</div>
          </Col>
        </Row>

        <div className={css('right__actual')}>
          <Col className={css('right__item')} span={24}>
            <div className={css('right__topic')}>实际结果</div>
            <div className={css('right__content')}>
              <Comment
                placeholder="点击输入实际结果"
                value={item.actualResult}
                save={() => saveItem('actualResult')}
              />
            </div>
          </Col>
        </div>

        <Col className={css('right__item')} span={24}>
          <div className={css('right__tools')}>
            <div className={css('right__tools__left')}>
              <Space split={<Divider type="vertical" />}>
                <div className={css('comment')}>
                  <Comment
                    placeholder="点击输入留言"
                    value={item.comment}
                    save={() => saveItem('comment')}
                  />
                </div>

                {/* <div className={css('btn')}>
                  <Button type="primary" icon={<PlusCircleOutlined />}>
                    添加缺陷
                  </Button>
                  <ExclamationCircleOutlined style={{ marginLeft: '10px', color: 'red' }} />
                  (1)
                </div> */}

                {/* <div className={css('btn')}>
                  <Button icon={<FileAddOutlined />}>添加附件</Button>

                  <ExclamationCircleOutlined style={{ marginLeft: '10px', color: 'red' }} />
                </div> */}
              </Space>
            </div>
            <div className={css('right__')}>
              <TestStatus status={item.status || 'todo'} testId={testId} />
            </div>
          </div>
        </Col>
      </div>
    </div>
  );
};

const StepList: React.FC<StepListProps> = ({ detail, objectId, testId }) => {
  const { steps } = detail?.runs;
  const saveList = useCallback(
    (item: IStepItem, index: number) => {
      const detailBak = { ...detail };
      detailBak.runs.steps[index] = item;
      updateTestStep(detailBak, objectId).then(() => {
        message.success('修改成功');
      });
    },
    [objectId, detail],
  );
  return (
    <div className={css('step-list')}>
      {steps &&
        steps?.map((item, index) => (
          <StepItem item={item} key={index} index={index} saveList={saveList} testId={testId} />
        ))}
    </div>
  );
};

export default StepList;
