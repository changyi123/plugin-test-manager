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
import { checkHasDepsLink } from '@/lib/api/runs';
import { useTestConfig } from '@/lib/hooks/useContext';

import TestEntitySelectorModal, { ActionType } from '@/components/panel/TestEntitySelectorModal';

import GlobalDndContext from './DndContext';
import { TestType } from '@/lib/constants';
import Loading from '@/components/common/Loading';
import { useDebounceFn } from 'ahooks';
import { CloseMore } from '@/icons';

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
  search?: boolean;
}> = props => {
  const { steps, actionCard, search } = props;

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
            {!search && (
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
            )}
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

let stepsBak = [];
let firstLoad = true;
export const TestDetailContext = React.createContext({
  searchStatus: false,
});

const Detail: React.FC = () => {
  const { testEntity } = useTestConfig();
  const [steps, setSteps] = useState<Array<TestStep>>([]);
  const [search, setSearch] = useState<boolean>(false);
  const [testInfo, setTestInfo] = useState<TestInfor>({});
  const testEntitySelectorRef = createRef<ActionType>();

  const testDetailData = testEntity.toJSON();
  const { objectId: testDetailId } = testDetailData;
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetchTestSteps(testDetailId)
      .then(({ data }) => {
        setSteps(data?.steps || []);
        stepsBak = data?.steps;
        setSearch(false);
        setTestInfo(data);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [testDetailId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, testDetailId]);

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
        saveOrUpdateTestStep(newSteps, testInfo?.objectId, testDetailId).then(() => {
          message.success('操作成功');
          // setSteps([...newSteps]);
          fetchData();
        });
        return;
      }
      setSteps(newSteps);
    },
    [findCard, steps, setSteps, fetchData, testInfo?.objectId, testDetailId],
  );

  const expandCard = useCallback(
    (id?: string, isExpand?: boolean, showMore?: boolean) => {
      if (!id) {
        setSteps(
          steps.filter(item => {
            item.isExpand = isExpand === undefined ? false : isExpand;
            item.showMore = showMore;
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
      saveOrUpdateTestStep(stepsbak, testInfo?.objectId, testDetailId).then(() => {
        message.success('操作成功');
        fetchData();
      });
    },
    [steps, findCard, testInfo, fetchData, testDetailId],
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
      saveOrUpdateTestStep(stepsbak, testInfo?.objectId, testDetailId)
        .then(() => {
          message.success('操作成功');
          fetchData();
        })
        .catch(err => {
          message.warning(`删除失败，原因：${err}`);
        });
    },
    [steps, setSteps, findCard, testInfo?.objectId, fetchData, testDetailId],
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
    (index?: number, step?: TestStep, atIndex?: number) => {
      let stepsbak = [...steps];
      // 指定保存哪个位置，如果无则保存全部
      if (step) {
        stepsbak[index] = step;
      }
      // 新增继承测试用例
      if (atIndex !== undefined) {
        stepsbak = update(steps, {
          $splice: [[atIndex, 0, step]],
        });
      }
      saveOrUpdateTestStep(stepsbak, testInfo?.objectId, testDetailId).then(() => {
        message.success('保存成功');
        fetchData();
      });
    },
    [testDetailId, fetchData, steps, testInfo?.objectId],
  );

  const callTestLen = useCallback(() => {
    return steps.filter(item => item.callTestId).length;
  }, [steps]);

  const openCallTestModal = async (index: number) => {
    const selectedEntity = await testEntitySelectorRef.current?.open();
    const selectedItemId = selectedEntity.reference.objectId;
    try {
      // 验证继承的测试用例是否又循环依赖
      await checkHasDepsLink(testDetailId, selectedItemId);
    } catch (err) {
      message.error(err.message);
    }
    saveCard(
      undefined,
      {
        callTestId: selectedItemId,
      },
      index,
    );
  };

  const { run } = useDebounceFn(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!stepsBak.length) {
        return;
      }
      if (!e.target.value) {
        fetchData();
        return;
      }
      const coverSteps = [];
      const val = e.target.value;
      stepsBak?.forEach(item => {
        const str = `${item?.action} ${item?.data} ${item?.result} ${item?.itemObject?.name} ${item?.itemObject?.key}`;
        if (str.indexOf(val) >= 0) {
          coverSteps.push(item);
        }
      });
      setSteps(coverSteps);
      setSearch(true);
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

  if (loading && firstLoad) {
    firstLoad = false;
    return <Loading />;
  }

  if (!testDetailId) {
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
    <Loading loading={loading}>
      <div className={css('detail')}>
        <TestEntitySelectorModal
          isSingleMode
          needFillValue
          title="请选择继承测试用例"
          testType={TestType.TestDetail}
          actionRef={testEntitySelectorRef}
          // 继承测试用例不能继承自己
          ignoreTestEntityIds={[testDetailId]}
        />
        <div className={css('detail__content')}>
          <div className={css('detail__content__header')}>
            <div className={css('left')}>
              <div className={css('input')}>
                <Input
                  placeholder="搜索步骤"
                  onChange={e => run(e)}
                  allowClear={true}
                  suffix={<SearchOutlined />}
                />
              </div>
            </div>

            <div className={css('right')}>
              <div className={css('item')}>
                <Tooltip title="全部展开" placement="bottom">
                  <Button
                    icon={<ArrowsAltOutlined />}
                    onClick={() => expandCard(undefined, true, true)}
                  />
                </Tooltip>
              </div>
              <div className={css('item')}>
                <Tooltip title="全部收起" placement="bottom">
                  <Button icon={<ShrinkOutlined />} onClick={() => expandCard()} />
                </Tooltip>
              </div>
              <div className={css('item')}>
                <Tooltip title="收起更多信息" placement="bottom">
                  <Button icon={<CloseMore />} onClick={() => expandCard(undefined, true, false)} />
                </Tooltip>
              </div>
              <Dropdown
                className={css('add-step')}
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

          <div className={css('detail__content__tips')}>
            {!search ? <BlockOutlined /> : null}
            <span>
              {search
                ? `显示${stepsBak.length}个步骤中的${steps.length}个`
                : `当前用例调用 ${callTestLen()} 个用例`}
            </span>
          </div>

          <TestDetailContext.Provider
            value={{
              searchStatus: search,
            }}
          >
            <StepList steps={steps} actionCard={actionCard} search={search} />
          </TestDetailContext.Provider>
        </div>
      </div>
    </Loading>
  );
};

export default Detail;
