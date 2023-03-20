/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useCallback, useEffect } from 'react';
import { Button, Input, Spin } from 'antd';
import { BlockOutlined } from '@/icons';
import { useTestConfig } from '@/lib/hooks/useContext';
import { cloneDeep } from 'lodash';
import { useDebounceFn } from 'ahooks';

import { Item } from '@/lib/types/App';
import { updateItem } from '@/lib/api/common';
import { Step } from '@/lib/types/Test';
import TestStep from '@/components/business/TestStep';

import css from './index.less';

export interface fields {
  id: string;
  value: string;
}
export interface TestStep extends Step {
  itemData?: Item;
}

let firstLoad = true;

const Detail: React.FC = () => {
  const { testEntity, setTestEntity } = useTestConfig();
  const [steps, setStepsState] = useState<TestStep[]>([]);

  const { objectId: testDetailId } = testEntity || {};

  // 同步步骤
  useEffect(() => {
    setStepsState(testEntity.detail?.steps || []);
  }, [testEntity]);

  /** 保存步骤 */
  const saveStep = useCallback(
    async newSteps => {
      if (!newSteps) return;
      setStepsState(newSteps);

      const cpDetail = cloneDeep(testEntity.detail) || { steps: [] };
      cpDetail.steps = newSteps;
      const data = await updateItem(testEntity.objectId, { detail: cpDetail });
      setTestEntity(data);
    },
    [testEntity, setTestEntity],
  );

  const { run: handlePreconditionChange } = useDebounceFn(async precondition => {
    const cpDetail = cloneDeep(testEntity.detail) || { precondition: '' };
    cpDetail.precondition = precondition;
    const data = await updateItem(testEntity.objectId, { detail: cpDetail });
    setTestEntity(data);
  });

  const callTestLen = useCallback(() => {
    return steps.filter(item => item.callTestId).length;
  }, [steps]);

  if (firstLoad) {
    firstLoad = false;
    return <Spin />;
  }

  if (!testDetailId) {
    return (
      <div className={css('detail')}>
        <div>获取不了 Key</div>
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
      <h6>前置条件</h6>
      <div className={css('precondition-input')}>
        <Input.TextArea
          maxLength={2000}
          autoSize={{ minRows: 3, maxRows: 6 }}
          placeholder="请输入测试用例前置条件"
          defaultValue={testEntity.detail?.precondition}
          onBlur={e => handlePreconditionChange(e.target.value)}
          onChange={e => handlePreconditionChange(e.target.value)}
        />
      </div>
      <h6 className={css('step-header')}>用例步骤</h6>
      <div className={css('detail__content')}>
        <div className={css('detail__content__header')}>
          <div className={css('left detail__content__tips')}>
            <BlockOutlined />
            <span>{`当前用例继承 ${callTestLen()} 个用例`}</span>
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
  );
};

export default Detail;
