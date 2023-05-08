/* eslint-disable @typescript-eslint/no-unused-vars */
import { useDebounceFn } from 'ahooks';
import { Button, Input, message, Spin } from 'antd';
import { cloneDeep } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';

import TestStep from '@/components/business/TestStep';
import { BlockOutlined } from '@/icons';
import { updateTestEntity } from '@/lib/api/item';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { Item } from '@/lib/types/App';
import { Step } from '@/lib/types/Test';

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
  const { t } = useI18n();
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
      const data = await updateTestEntity([
        {
          objectId: testEntity.objectId,
          detail: cpDetail,
        },
      ]);
      if (data?.status === 'error') {
        message.error(data.data);
        return;
      }
      setTestEntity(data?.[0]);
    },
    [testEntity, setTestEntity],
  );

  const { run: handlePreconditionChange } = useDebounceFn(async precondition => {
    const cpDetail = cloneDeep(testEntity.detail) || { precondition: '' };
    cpDetail.precondition = precondition;
    const data = await updateTestEntity([
      {
        objectId: testEntity.objectId,
        detail: cpDetail,
      },
    ]);
    if (data?.status === 'error') {
      message.error(data.data);
      return;
    }
    setTestEntity(data?.[0]);
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
        <div>{t('modules.panel.testDetail.testDetailPanel.detailTips')} Key</div>
        <div>
          <Button type="primary" onClick={() => window?.QiankunProps?.onRefreshContext()}>
            {t('modules.panel.testDetail.testDetailPanel.refreshButton')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={css('detail')}>
      <h6>{t('common.precondition')}</h6>
      <div className={css('precondition-input')}>
        <Input.TextArea
          maxLength={2000}
          autoSize={{ minRows: 3, maxRows: 6 }}
          placeholder={t('common.preconditionPlaceholder')}
          defaultValue={testEntity.detail?.precondition}
          onBlur={e => handlePreconditionChange(e.target.value)}
          onChange={e => handlePreconditionChange(e.target.value)}
        />
      </div>
      <h6 className={css('step-header')}>{t('common.testStep')}</h6>
      <div className={css('detail__content')}>
        <div className={css('detail__content__header')}>
          <div className={css('left detail__content__tips')}>
            <BlockOutlined />
            <span>{`${t(
              'modules.panel.testDetail.testDetailPanel.testStepTips.0',
            )} ${callTestLen()} ${t(
              'modules.panel.testDetail.testDetailPanel.testStepTips.1',
            )}`}</span>
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
