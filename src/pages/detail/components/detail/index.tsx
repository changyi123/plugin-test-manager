import React, { useState, useCallback } from 'react';
import { Button, Tooltip, Input, Dropdown, Menu } from '@osui/ui';
import {
  EditOutlined,
  ArrowsAltOutlined,
  ShrinkOutlined,
  SearchOutlined,
  QuestionCircleOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider, useDrop } from 'react-dnd';
import Breadcrumb from './components/Breadcrumb';
import StepItem from './components/List';
import BoxWithHandle from './test';
import update from 'immutability-helper';

import css from './index.less';

export interface fields {
  id: string;
  value: string;
}
export interface TestStep {
  resource: string;
  action: string;
  data: string;
  result: string;
  attachments: Array<string>;
  customFields: Array<fields>;
  index: number;
  callTestIssueId?: string;
  isEdit: boolean;
  id?: string;
}

const StepList: React.FC<{
  steps: TestStep[];
  moveCard: (id: string, atIndex: number) => void;
  findCard: (id: string) => { index: number };
}> = props => {
  const { steps, moveCard, findCard } = props;

  return (
    <DndProvider backend={HTML5Backend}>
      <BoxWithHandle />
      <StepDrop steps={steps} moveCard={moveCard} findCard={findCard} />
    </DndProvider>
  );
};

const StepDrop: React.FC<{
  steps: TestStep[];
  moveCard: (id: string, atIndex: number) => void;
  findCard: (id: string) => { index: number };
}> = props => {
  const { steps, moveCard, findCard } = props;
  const [, drop] = useDrop(() => ({ accept: 'card' }));
  return (
    <div ref={drop}>
      {steps.map(item => (
        <StepItem
          item={item}
          itemLen={steps.length}
          key={item.id}
          moveCard={moveCard}
          findCard={findCard}
        />
      ))}
    </div>
  );
};

const Detail: React.FC = () => {
  const [steps, setSteps] = useState<Array<TestStep>>([
    {
      resource: '1',
      action: '行动111',
      data: '数据111',
      result: '结果111',
      attachments: [],
      customFields: [],
      index: 0,
      isEdit: true,
      id: 'one',
    },
    {
      resource: '2',
      action: '行动2',
      data: '数据222',
      result: '结果222',
      attachments: [],
      customFields: [],
      index: 1,
      isEdit: false,
      id: 'two',
    },
    {
      resource: '3',
      action: '行动2333',
      data: '数据33',
      result: '结果3333',
      attachments: [],
      customFields: [],
      index: 2,
      isEdit: false,
      id: 'third',
    },
  ]);
  // console.log('刷新了');

  const findCard = useCallback(
    (id: string) => {
      const step = steps.filter(c => `${c.id}` === id)[0];
      const stepIndex = steps.findIndex(item => item.id === step.id);
      return {
        step,
        index: stepIndex,
      };
    },
    [steps],
  );

  const moveCard = useCallback(
    (id: string, atIndex: number) => {
      // console.log('执行了moveCARD', id, atIndex);
      const { step, index } = findCard(id);
      setSteps(
        update(steps, {
          $splice: [
            [index, 1],
            [atIndex, 0, step],
          ],
        }),
      );
    },
    [findCard, steps, setSteps],
  );

  return (
    <div className={css('detail')}>
      <div className={css('detail__breadcrumb')}>
        <Breadcrumb />
      </div>
      <div className={css('detail__content')}>
        <div className={css('detail__content__header')}>
          <div className={css('left')}>
            <Button type="primary" icon={<EditOutlined />}>
              弹窗编辑
            </Button>
            <div className={css('item')}>
              <Tooltip title="全部展开" placement="bottom">
                <Button icon={<ArrowsAltOutlined />} />
              </Tooltip>
            </div>
            <div className={css('item')}>
              <Tooltip title="全部收缩" placement="bottom">
                <Button icon={<ShrinkOutlined />} />
              </Tooltip>
            </div>
            <div className={css('input')}>
              <Input placeholder="搜索关键字" prefix={<SearchOutlined />} />
            </div>
            <div className={css('item')}>
              <Tooltip title="测试步骤教程">
                <QuestionCircleOutlined />
              </Tooltip>
            </div>
          </div>

          <div className={css('right')}>
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item key="1">新增步骤</Menu.Item>
                  <Menu.Item key="2">继承测试用例</Menu.Item>
                </Menu>
              }
            >
              <Button type="primary">
                添加步骤 <DownOutlined />
              </Button>
            </Dropdown>
          </div>
        </div>
        <StepList steps={steps} moveCard={moveCard} findCard={findCard} />
      </div>
    </div>
  );
};

export default Detail;
