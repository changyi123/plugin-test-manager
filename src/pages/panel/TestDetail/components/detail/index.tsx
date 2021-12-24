import React, { useState, useCallback, useEffect, createRef } from 'react';
import { Button, Tooltip, Dropdown, Menu, Empty, Spin, message } from '@osui/ui';
import { ArrowsAltOutlined, ShrinkOutlined, DownOutlined } from '@ant-design/icons';
import { useDrop } from 'react-dnd';
// import Breadcrumb from './components/Breadcrumb';
import StepItem from './components/List';
import update from 'immutability-helper';
import { fetchTestSteps, saveOrUpdateTestStep, Item } from '@/lib/api/detail';

import ItemTypeModal from './components/ItemTypeModal';
import type { ItemTypeModalHandle } from './components/ItemTypeModal';
import GlobalDndContext from './DndContext';
import { TestType } from '@/lib/constants';
import { PanelItemId } from '@/devEnv';

import css from './index.less';

export interface fields {
  id: string;
  value: string;
}
export interface TestStep {
  action?: string;
  data?: string;
  result?: string;
  attachments?: Array<string>;
  customFields?: Array<fields>;
  index?: number;
  callTestId?: string;
  itemObject?: Item;
  isExpand?: boolean;
  isEdit?: boolean;
  id?: string;
  objectId?: string;
}

export interface TestInfor {
  objectId?: string;
  resource?: string;
}

export type IExpandCard = (id?: string, isExpand?: boolean) => void;

export interface IActionCard {
  moveCard: (id: string, atIndex: number, saveSteps?: boolean) => void;
  expandCard: IExpandCard;
  findCard: (id: string) => { index: number };
  cloneCard: (id: string) => void;
  deleteCard: (id: string) => void;
  addCard: (id?: string) => void;
  saveCard: (index?: number, step?: TestStep, atIndex?: number) => void;
  openCallTestModal: (index: number) => void;
}

const StepList: React.FC<{
  steps: TestStep[];
  actionCard: IActionCard;
}> = props => {
  const { steps, actionCard } = props;

  if (!steps.length) {
    return (
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
              <Menu.Item key="1" onClick={() => actionCard.addCard()}>
                新增步骤
              </Menu.Item>
              <Menu.Item key="2" onClick={() => actionCard.openCallTestModal(0)}>
                继承测试用例
              </Menu.Item>
            </Menu>
          }
        >
          <Button type="primary">
            添加步骤 <DownOutlined />
          </Button>
        </Dropdown>
      </Empty>
    );
  }

  return (
    <GlobalDndContext>
      <StepDrop steps={steps} actionCard={actionCard} />
    </GlobalDndContext>
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
  const [steps, setSteps] = useState<Array<TestStep>>([]);
  const [testInfo, setTestInfo] = useState<TestInfor>({});
  const currentObjectId: string = window?.QiankunProps?.context?.itemId || PanelItemId;
  const ItemTypeModalRef = createRef<ItemTypeModalHandle>();
  console.log('QiankunProps', window?.QiankunProps);

  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetchTestSteps(currentObjectId)
      .then(({ data }) => {
        setSteps(data?.steps || []);
        setTestInfo(data);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentObjectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, currentObjectId]);

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
    (id: string, atIndex: number, saveSteps?: boolean) => {
      const { step, index } = findCard(id);
      const newSteps = update(steps, {
        $splice: [
          [index, 1],
          [atIndex, 0, step],
        ],
      });
      if (saveSteps) {
        saveOrUpdateTestStep(newSteps, testInfo?.objectId, currentObjectId).then(() => {
          message.success('操作成功');
          setSteps(newSteps);
        });
        return;
      }
      setSteps(newSteps);
    },
    [findCard, steps, setSteps, testInfo?.objectId, currentObjectId],
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
            item.isExpand = isExpand === undefined ? false : isExpand;
            return item;
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
      saveOrUpdateTestStep(stepsbak, testInfo?.objectId, currentObjectId).then(() => {
        message.success('操作成功');
        fetchData();
      });
    },
    [steps, findCard, testInfo, fetchData, currentObjectId],
  );

  const deleteCard = useCallback(
    (id: string) => {
      if (id === '-1') {
        const { index } = findCard(id);
        const stepsbak = [...steps];
        stepsbak.splice(index, 1);
        setSteps(stepsbak);
        return;
      }
      const { index } = findCard(id);
      const stepsbak = [...steps];
      stepsbak.splice(index, 1);
      saveOrUpdateTestStep(stepsbak, testInfo?.objectId, currentObjectId)
        .then(() => {
          message.success('操作成功');
          fetchData();
        })
        .catch(err => {
          message.warning(`删除失败，原因：${err}`);
        });
    },
    [steps, setSteps, findCard, testInfo?.objectId, fetchData, currentObjectId],
  );

  const addCard = useCallback(
    (id?: string) => {
      const hasEmptyIdStep = steps.some(item => item.id === '-1');
      if (hasEmptyIdStep) {
        return message.warning('含有未保存的新步骤');
      }
      const emptyStep: TestStep = {
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
      const stepsbak = [...steps].filter(item => item.id !== '-1');
      if (!id) {
        stepsbak.splice(0, 0, { ...emptyStep });
        setSteps(stepsbak);
        return;
      }
      const { index } = findCard(id);
      stepsbak.splice(index, 0, { ...emptyStep, index });
      setSteps(stepsbak);
    },
    [steps, setSteps, findCard],
  );

  const saveCard = useCallback(
    (index?: number, step?: TestStep, atIndex?: number) => {
      let stepsbak = [...steps];
      // 指定保存哪个位置，如果无则保存全部
      if (step) {
        step.isEdit = false;
        stepsbak[index] = step;
      }
      // 新增继承测试用例
      if (atIndex !== undefined) {
        stepsbak = update(steps, {
          $splice: [[atIndex, 0, step]],
        });
      }
      saveOrUpdateTestStep(stepsbak, testInfo?.objectId, currentObjectId).then(() => {
        message.success('操作成功');
        fetchData();
      });
    },
    [currentObjectId, fetchData, steps, testInfo?.objectId],
  );

  const openCallTestModal = (index: number) => {
    ItemTypeModalRef.current?.open(index);
  };

  const actionCard: IActionCard = {
    moveCard,
    findCard,
    cloneCard,
    expandCard,
    deleteCard,
    addCard,
    saveCard,
    openCallTestModal,
  };

  if (loading) {
    return (
      <div className={css('detail')}>
        <Spin tip="加载中..."></Spin>
      </div>
    );
  }

  if (!currentObjectId) {
    return (
      <div className={css('detail')}>
        <div>获取不了事项Id</div>
        <div>
          <Button type="primary" onClick={() => window?.QiankunProps?.onRefreshContext()}>
            重新加载
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={css('detail')}>
      <ItemTypeModal type={TestType.TestDetail} ref={ItemTypeModalRef} saveCard={saveCard} />
      {/* <div className={css('detail__breadcrumb')}>
        <Breadcrumb />
      </div> */}
      <div className={css('detail__content')}>
        <div className={css('detail__content__header')}>
          <div className={css('left')}>
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
            {/* <div className={css('input')}>
              <Input placeholder="搜索关键字" prefix={<SearchOutlined />} />
            </div>
            <div className={css('item')}>
              <Tooltip title="测试步骤教程">
                <QuestionCircleOutlined />
              </Tooltip>
            </div> */}
          </div>

          <div className={css('right')}>
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item key="1" onClick={() => addCard()}>
                    新增步骤
                  </Menu.Item>
                  <Menu.Item key="2" onClick={() => openCallTestModal(0)}>
                    继承测试用例
                  </Menu.Item>
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
    </div>
  );
};

export default Detail;
