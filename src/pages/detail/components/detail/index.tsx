import React, { useState, useCallback, useEffect } from 'react';
import { Button, Tooltip, Input, Dropdown, Menu, Empty } from '@osui/ui';
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
import update from 'immutability-helper';
import { fetchTestExecution } from '@/lib/api/detail';

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
  isExpand: boolean;
  isEdit?: boolean;
  id?: string;
}

export type IExpandCard = (id?: string, isExpand?: boolean) => void;

export interface IActionCard {
  moveCard: (id: string, atIndex: number) => void;
  expandCard: IExpandCard;
  findCard: (id: string) => { index: number };
  cloneCard: (id: string) => void;
  deleteCard: (id: string) => void;
  addCard: (id: string) => void;
  saveCard: (index: number, step: TestStep) => void;
}

const StepList: React.FC<{
  steps: TestStep[];
  actionCard: IActionCard;
}> = props => {
  const { steps, actionCard } = props;

  return (
    <DndProvider backend={HTML5Backend}>
      <StepDrop steps={steps} actionCard={actionCard} />
    </DndProvider>
  );
};

const StepDrop: React.FC<{
  steps: TestStep[];
  actionCard: IActionCard;
}> = props => {
  const { steps, actionCard } = props;
  const [, drop] = useDrop(() => ({ accept: 'card' }));
  return (
    <div ref={drop}>
      {steps.map((item, index) => (
        <StepItem
          item={item}
          key={item.id}
          index={index}
          itemLen={steps.length}
          actionCard={actionCard}
        />
      ))}
    </div>
  );
};

const Detail: React.FC = () => {
  const [steps, setSteps] = useState<Array<TestStep>>([
    // {
    //   resource: '1',
    //   action: '行动111',
    //   data: '数据111',
    //   result: '结果111',
    //   attachments: [],
    //   customFields: [],
    //   index: 0,
    //   isExpand: true,
    //   id: 'one',
    // },
    // {
    //   resource: '2',
    //   action: '行动2',
    //   data: '数据222',
    //   result: '结果222',
    //   attachments: [],
    //   customFields: [],
    //   index: 1,
    //   isExpand: false,
    //   id: 'two',
    // },
    // {
    //   resource: '3',
    //   action: '行动2333',
    //   data: '数据33',
    //   result: '结果3333',
    //   attachments: [],
    //   customFields: [],
    //   index: 2,
    //   isExpand: false,
    //   id: 'third',
    // },
  ]);
  // console.log('刷新了');

  useEffect(() => {
    fetchTestExecution('WDDKjgIg8G').then(({ data }) => {
      console.log('rerere', data);
      setSteps(data);
    });
  }, []);

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

  const expandCard = useCallback(
    (id?: string, isExpand?: boolean) => {
      if (!id) {
        setSteps(
          steps.filter(item => {
            item.isExpand = isExpand === undefined ? false : isExpand;
            if (item.id !== '-1') {
              return item;
            }
          }),
        );
        return;
      }
      setSteps(
        steps.filter(item => {
          if (item.id === id) {
            return { ...item, isExpand: isExpand === undefined ? false : isExpand };
          }
          if (item.id !== '-1') {
            return item;
          }
        }),
      );
    },
    [steps, setSteps],
  );

  const cloneCard = useCallback(
    (id: string) => {
      const { step, index } = findCard(id);
      const stepsbak = [...steps];
      stepsbak.splice(index, 0, { ...step, id: `${step.id}1` });
      setSteps(stepsbak);
    },
    [steps, setSteps, findCard],
  );

  const deleteCard = useCallback(
    (id: string) => {
      const { index } = findCard(id);
      const stepsbak = [...steps];
      stepsbak.splice(index, 1);
      setSteps(stepsbak);
    },
    [steps, setSteps, findCard],
  );

  const addCard = useCallback(
    (id?: string) => {
      const emptyStep: TestStep = {
        resource: '-1',
        action: '',
        data: '',
        result: '',
        attachments: [],
        customFields: [],
        index: 0,
        isExpand: true,
        isEdit: true,
        id: '-1',
      };
      if (!id) {
        const stepsbak = [...steps];
        stepsbak.splice(0, 0, { ...emptyStep });
        setSteps(stepsbak);
        return;
      }
      const { index } = findCard(id);
      const stepsbak = [...steps];
      stepsbak.splice(index, 0, { ...emptyStep, index });
      setSteps(stepsbak);
    },
    [steps, setSteps, findCard],
  );

  const saveCard = (index: number, step: TestStep) => {
    const stepsbak = [...steps];
    stepsbak[index] = step;
    setSteps(stepsbak);
  };

  const actionCard: IActionCard = {
    moveCard,
    findCard,
    cloneCard,
    expandCard,
    deleteCard,
    addCard,
    saveCard,
  };

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
                <Button icon={<ArrowsAltOutlined />} onClick={() => expandCard(undefined, true)} />
              </Tooltip>
            </div>
            <div className={css('item')}>
              <Tooltip title="全部收缩" placement="bottom">
                <Button icon={<ShrinkOutlined />} onClick={() => expandCard()} />
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
                  <Menu.Item key="1" onClick={() => addCard()}>
                    新增步骤
                  </Menu.Item>
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
        <StepList steps={steps} actionCard={actionCard} />
      </div>
      {!steps.length && (
        <Empty
          description={
            <div>
              <h3>暂无定义测试</h3>
              <p>测试是与条件、测试输入和预期结果相结合的一系列步骤。创建测试步骤来定义测试。</p>
            </div>
          }
        >
          <Dropdown
            overlay={
              <Menu>
                <Menu.Item key="1" onClick={() => addCard()}>
                  新增步骤
                </Menu.Item>
                <Menu.Item key="2">继承测试用例</Menu.Item>
              </Menu>
            }
          >
            <Button type="primary">
              添加步骤 <DownOutlined />
            </Button>
          </Dropdown>
        </Empty>
      )}
    </div>
  );
};

export default Detail;
