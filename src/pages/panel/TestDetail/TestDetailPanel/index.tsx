import React, { useState, useCallback, useEffect, createRef } from 'react';
import { Button, Tooltip, Dropdown, Menu, Empty, message, Space, Input } from '@osui/ui';
import {
  ArrowsAltOutlined,
  ShrinkOutlined,
  DownOutlined,
  SearchOutlined,
  BlockOutlined,
} from '@ant-design/icons';
import { useDrop } from 'react-dnd';
import StepItem from './components/List';
import update from 'immutability-helper';
import { fetchTestSteps, saveOrUpdateTestStep, Item } from '@/lib/api/detail';

import ItemTypeModal from './components/ItemTypeModal';
import type { ItemTypeModalHandle } from './components/ItemTypeModal';
import GlobalDndContext from './DndContext';
import { TestType } from '@/lib/constants';
import { getDevConfig } from '@/devEnv';
import Loading from '@/components/common/Loading';
import { useDebounceFn } from 'ahooks';

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
  showMore?: boolean;
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
  saveCard: (index?: number, step?: TestStep, atIndex?: number, doNotRefresh?: boolean) => void;
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
        className={css('empty')}
        description={
          <div className={css('empty__content')}>
            <div className={css('empty__content__topic')}>暂无定义测试</div>
            <div className={css('empty__content__tips')}>
              测试是与条件、测试输入和预期结果相结合的一系列步骤。创建测试步骤来定义测试。
            </div>
            <div className={css('empty__content__btn')}>
              <Space size={8}>
                <Button type="primary" onClick={() => actionCard.addCard()}>
                  新建步骤
                </Button>
                <Button type="default" onClick={() => actionCard.openCallTestModal(0)}>
                  继承用例
                </Button>
              </Space>
            </div>
          </div>
        }
      ></Empty>
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
  const currentObjectId: string = window?.QiankunProps?.context?.itemId || getDevConfig().itemId;
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
          // setSteps([...newSteps]);
          fetchData();
        });
        return;
      }
      setSteps(newSteps);
    },
    [findCard, steps, setSteps, fetchData, testInfo?.objectId, currentObjectId],
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
        stepsbak.splice(stepsbak.length, 0, { ...emptyStep });
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
    (index?: number, step?: TestStep, atIndex?: number, doNotRefresh?: boolean) => {
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
        message.success('保存成功');
        if (doNotRefresh) {
          return;
        }
        fetchData();
      });
    },
    [currentObjectId, fetchData, steps, testInfo?.objectId],
  );

  const callTestLen = useCallback(() => {
    return steps.filter(item => item.callTestId).length;
  }, [steps]);

  const openCallTestModal = (index: number) => {
    ItemTypeModalRef.current?.open(index);
  };

  const { run } = useDebounceFn(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      console.log('e', e);
      if (!steps.length) {
        return;
      }
    },
    {
      wait: 500,
    },
  );

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
    return <Loading />;
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
      <ItemTypeModal
        type={TestType.TestDetail}
        itemId={currentObjectId}
        ref={ItemTypeModalRef}
        saveCard={saveCard}
      />
      <div className={css('detail__content')}>
        <div className={css('detail__content__header')}>
          <div className={css('left')}>
            {/* <div className={css('input')}>
              <Input placeholder="搜索步骤" onChange={e => run(e)} suffix={<SearchOutlined />} />
            </div> */}
          </div>

          <div className={css('right')}>
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
            <Dropdown
              className={css('item')}
              overlay={
                <Menu>
                  <Menu.Item key="1" onClick={() => addCard()}>
                    新增步骤
                  </Menu.Item>
                  <Menu.Item key="2" onClick={() => openCallTestModal(steps.length)}>
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

        {/* <div className={css('detail__content__tips')}>
          <BlockOutlined />
          <span>当前用例被 {callTestLen()} 个用例调用</span>
        </div> */}

        <StepList steps={steps} actionCard={actionCard} />
      </div>
    </div>
  );
};

export default Detail;
