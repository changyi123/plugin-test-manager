/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useCallback } from 'react';
import { Button, Input, Spin } from '@osui/ui';
import { updateTestDetail } from '@/lib/api/detail';
import { SearchOutlined, BlockOutlined } from '@/icons';
import { useTestConfig } from '@/lib/hooks/useContext';
import { TestType } from '@/lib/constants';
import { keyBy, uniq } from 'lodash';
import { useDebounceFn, useRequest } from 'ahooks';

import { Item } from '@/lib/types/App';
import { hasArrayItem } from '@/lib/utils/helper';
import { getTestEntities } from '@/lib/api/common';
import { Step, TestEntity } from '@/lib/types/Test';
import TestStep from '@/components/business/TestStep';

import css from './index.less';
import { getStepInitialData } from '@/components/business/TestStep/helper';

// 测试详情实体类型
type TestDetailEntity = TestEntity<TestType.TestDetail>;

export interface fields {
  id: string;
  value: string;
}
export interface TestStep extends Step {
  itemData?: Item;
}

let firstLoad = true;

const Detail: React.FC = () => {
  const { testEntity } = useTestConfig();
  const [search, setSearch] = useState(false);
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
        setSteps(steps.length ? steps : [getStepInitialData()]);
      },
      ready: Boolean(testDetailData),
    },
  );

  /** 保存步骤 */
  const saveStep = useCallback(
    async newSteps => {
      if (!newSteps) return;
      setSteps(newSteps);

      await updateTestDetail(testEntity, {
        steps: newSteps,
      });
    },
    [setSteps, testEntity],
  );

  const { run: handlePreconditionChange } = useDebounceFn(precondition => {
    updateTestDetail(testEntity, {
      precondition,
    });
  });

  const callTestLen = useCallback(() => {
    return steps.filter(item => item.callTestId).length;
  }, [steps]);

  const { run: filterSteps } = useDebounceFn(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!stepsStateRef.current?.length) {
        return;
      }
      const inputVal = e.target.value;
      if (!inputVal) {
        fetchData();
        return;
      }
      const coverSteps = [];
      stepsStateRef.current?.forEach(item => {
        const str = `${item?.action} ${item?.data} ${item?.result} ${item?.itemData?.name} ${item?.itemData?.key}`;
        if (str.indexOf(inputVal) >= 0) {
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

  if (loading && firstLoad) {
    firstLoad = false;
    return <Spin />;
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
    <Spin spinning={loading}>
      <div className={css('detail')}>
        <h6>前置条件</h6>
        <div className={css('precondition-input')}>
          <Input.TextArea
            maxLength={1000}
            autoSize={{ minRows: 3, maxRows: 6 }}
            placeholder="请输入测试用例前置条件"
            defaultValue={testDetailData.detail?.precondition}
            onBlur={e => handlePreconditionChange(e.target.value)}
            onChange={e => handlePreconditionChange(e.target.value)}
          />
        </div>
        <h6 className={css('step-header')}>用例步骤</h6>
        <div className={css('detail__content')}>
          <div className={css('detail__content__header')}>
            <div className={css('left detail__content__tips')}>
              {!search ? <BlockOutlined /> : null}
              <span>
                {search
                  ? `显示${steps.length}个步骤中的${steps.length}个`
                  : `当前用例继承 ${callTestLen()} 个用例`}
              </span>
            </div>
            <div className={css('right')}>
              <div className={css('input')}>
                {/* <Input
                  allowClear={true}
                  placeholder="搜索步骤"
                  suffix={<SearchOutlined />}
                  onChange={e => filterSteps(e)}
                /> */}
              </div>
            </div>
          </div>
          <TestStep
            canCallTest
            steps={steps}
            testDetailId={testDetailId}
            onChange={steps => saveStep(steps)}
          />
        </div>
      </div>
    </Spin>
  );
};

export default Detail;
