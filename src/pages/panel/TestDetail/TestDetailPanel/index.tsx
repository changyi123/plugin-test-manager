import React, { useState, useCallback, createRef } from 'react';
import { Button, Tooltip, Dropdown, Menu, Empty, message, Space, Input } from '@osui/ui';
import uuid from 'uuid/v4';
import {
  ArrowsAltOutlined,
  ShrinkOutlined,
  DownOutlined,
  SearchOutlined,
  BlockOutlined,
} from '@/icons';
import { useDrop } from 'react-dnd';
import StepItem from './components/List';
import { updateTestDetail } from '@/lib/api/detail';
import { checkHasDepsLink } from '@/lib/api/runs';
import { useTestConfig } from '@/lib/hooks/useContext';

import TestEntitySelectorModal, { ActionType } from '@/components/panel/TestEntitySelectorModal';

import GlobalDndContext from './DndContext';
import { TestType } from '@/lib/constants';
import Loading from '@/components/common/Loading';
import { useDebounceFn, useRequest } from 'ahooks';
import { CloseMore } from '@/icons';
import { clone, cloneDeep, keyBy, uniq } from 'lodash';

import { Step, TestEntity } from '@/lib/types/Test';
import { hasArrayItem } from '@/lib/utils/helper';
import { getTestEntities } from '@/lib/api/common';
import { Item } from '@/lib/types/App';

import css from './index.less';

// 测试详情实体类型
type TestDetailEntity = TestEntity<TestType.TestDetail>;

export interface fields {
  id: string;
  value: string;
}
export interface TestStep extends Step {
  itemData?: Item;
  isExpand?: boolean;
  showMore?: boolean;
}

const getEmptyTestStep = (callTestId?: string) => {
  const BaseTestStepFields = {
    id: uuid(),
    // ui 状态
    isExpand: true,
    showMore: false,
  };
  if (callTestId) {
    return Object.assign({}, BaseTestStepFields, {
      callTestId,
    }) as TestStep;
  } else {
    return Object.assign({}, BaseTestStepFields, {
      data: '',
      action: '',
      result: '',
    }) as TestStep;
  }
};

export interface IActionCard {
  addStep: (index?: number) => void;
  cloneStep: (id: string) => void;
  deleteStep: (id: string) => void;
  openCallTestModal: (index: number) => void;
  findStep: (id: string) => { index: number };
  expandStep: (id?: string, isExpand?: boolean) => void;
  moveStep: (id: string, atIndex: number, saveSteps?: boolean) => void;
  saveStep: (index?: number, step?: Partial<TestStep>, atIndex?: number) => void;
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
                  <Button type="primary" onClick={() => actionCard.addStep()}>
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

let firstLoad = true;
export const TestDetailContext = React.createContext({
  searchStatus: false,
});

const Detail: React.FC = () => {
  const { testEntity } = useTestConfig();
  const [search, setSearch] = useState(false);
  const testEntitySelectorRef = createRef<ActionType>();
  const stepsStateRef = React.useRef<TestStep[]>([]);
  const [steps, setStepsState] = useState<TestStep[]>([]);
  const testEntityDictRef = React.useRef<Record<string, TestDetailEntity>>({});

  const setSteps = useCallback(
    (steps, notStoreToStateRef?: boolean) => {
      setStepsState(steps);
      if (!notStoreToStateRef) {
        stepsStateRef.current = steps;
      }
    },
    [setStepsState],
  );

  const testDetailData = testEntity.toJSON();
  const { objectId: testDetailId } = testDetailData;

  const { loading, runAsync: fetchData } = useRequest(
    async () => {
      let { steps } = Object.assign(
        {
          steps: [],
        },
        testDetailData.detail,
      );

      // 判断 callTestIds 是否在 testEntityDict 缓存中
      const callTestIds = uniq(steps.map(step => step.callTestId).filter(Boolean));
      const testEntityDictIds = Object.keys(testEntityDictRef.current);
      const hasNotExistedIdInDict = callTestIds.some(id => !testEntityDictIds.includes(id));

      if (hasArrayItem(callTestIds)) {
        // 没有缓存请求
        if (hasNotExistedIdInDict) {
          const testEntities = await getTestEntities(
            { id: callTestIds },
            { include: ['reference'] },
          );
          const testEntityDict = keyBy(
            testEntities.map(entity => entity.toJSON()),
            'objectId',
          );
          testEntityDictRef.current = Object.assign({}, testEntityDictRef.current, testEntityDict);
        }

        steps = steps.map(step => {
          if (!step.callTestId) return step;
          return Object.assign(
            { itemData: testEntityDictRef.current[step.callTestId]?.reference },
            step,
          );
        });
      }

      return {
        steps,
      };
    },
    {
      onSuccess({ steps }) {
        setSteps(() => {
          const prevSteps = stepsStateRef.current;
          const firstLoad = !hasArrayItem(prevSteps);
          // 默认 ui 状态
          const defaultStepUIState = {
            isExpand: true,
            showMore: false,
          };
          if (firstLoad) {
            return steps.map(step => Object.assign({}, defaultStepUIState, step));
          }
          return steps.map(step => {
            // 混入 ui 状态
            const stepState = prevSteps.find(item => item.id === step.id);
            return Object.assign({}, stepState, step);
          });
        });
      },
      ready: Boolean(testDetailData),
    },
  );

  const findStep = useCallback(
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

  const moveStep = useCallback(
    async (id: string, atIndex: number, saveSteps?: boolean) => {
      const { step, index } = findStep(id);
      const newSteps = clone(steps);
      newSteps.splice(index, 1);
      newSteps.splice(atIndex, 0, step);
      if (saveSteps) {
        await updateTestDetail(testEntity, {
          steps: newSteps,
        });
        message.success('移动成功');
        fetchData();
        return;
      }
      setSteps(newSteps);
    },
    [findStep, steps, setSteps, testEntity, fetchData],
  );

  const expandStep = useCallback(
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

  const cloneStep = useCallback(
    async (id: string) => {
      const { step, index } = findStep(id);
      const newSteps = [...steps];
      newSteps.splice(
        index,
        0,
        Object.assign(getEmptyTestStep(step.callTestId), step, { id: uuid() }),
      );
      setSteps(newSteps);
      await updateTestDetail(testEntity, {
        steps: newSteps,
      });
      message.success('克隆成功');
      fetchData();
    },
    [findStep, steps, setSteps, testEntity, fetchData],
  );

  const deleteStep = useCallback(
    async (id: string) => {
      const { index } = findStep(id);
      const newSteps = cloneDeep(steps);
      newSteps.splice(index, 1);
      await updateTestDetail(testEntity, {
        steps: newSteps,
      });
      fetchData();
      message.success('删除成功');
    },
    [findStep, steps, testEntity, fetchData],
  );

  /** 新增步骤，非 callTest */
  const addStep = useCallback(
    async (index?: number) => {
      const newSteps = cloneDeep(steps);
      newSteps.splice(index ?? newSteps.length, 0, getEmptyTestStep());
      setSteps(newSteps);
    },
    [steps, setSteps],
  );

  /** 保存步骤 */
  const saveStep = useCallback(
    async (index?: number, step?: TestStep, atIndex?: number) => {
      const newSteps = cloneDeep(steps);
      // 指定保存哪个位置，如果无则保存全部
      if (step) {
        newSteps[index] = step;
      }
      // 新增继承测试用例
      if (atIndex !== undefined) {
        newSteps.splice(atIndex, 0, step);
      }
      setSteps(newSteps);
      await updateTestDetail(testEntity, {
        steps: newSteps,
      });
      fetchData();
      message.success('保存成功');
    },
    [steps, setSteps, testEntity, fetchData],
  );

  const callTestLen = useCallback(() => {
    return steps.filter(item => item.callTestId).length;
  }, [steps]);

  const openCallTestModal = async (index: number) => {
    const callTestId = await testEntitySelectorRef.current?.open();
    try {
      // 验证继承的测试用例是否又循环依赖
      await checkHasDepsLink(testDetailId, callTestId);
    } catch (err) {
      message.error(err.message);
    }

    saveStep(undefined, getEmptyTestStep(callTestId), index);
  };

  const { run } = useDebounceFn(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!steps.length) {
        return;
      }
      if (!e.target.value) {
        fetchData();
        return;
      }
      const coverSteps = [];
      const val = e.target.value;
      steps?.forEach(item => {
        const str = `${item?.action} ${item?.data} ${item?.result} ${item?.itemData?.name} ${item?.itemData?.key}`;
        if (str.indexOf(val) >= 0) {
          coverSteps.push(item);
        }
      });
      setSteps(coverSteps, true);
      setSearch(true);
    },
    {
      wait: 500,
    },
  );

  const actionCard: IActionCard = {
    moveStep,
    findStep,
    cloneStep,
    expandStep,
    deleteStep,
    addStep,
    saveStep,
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
                    onClick={() => expandStep(undefined, true, true)}
                  />
                </Tooltip>
              </div>
              <div className={css('item')}>
                <Tooltip title="全部收起" placement="bottom">
                  <Button icon={<ShrinkOutlined />} onClick={() => expandStep()} />
                </Tooltip>
              </div>
              <div className={css('item')}>
                <Tooltip title="收起更多信息" placement="bottom">
                  <Button icon={<CloseMore />} onClick={() => expandStep(undefined, true, false)} />
                </Tooltip>
              </div>
              <Dropdown
                className={css('add-step')}
                overlay={
                  <Menu>
                    <Menu.Item key="1" onClick={() => addStep()}>
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
                ? `显示${steps.length}个步骤中的${steps.length}个`
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
