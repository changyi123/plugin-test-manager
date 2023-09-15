import { useMemoizedFn, useRequest } from 'ahooks';
import { Button, message, Progress, Result as AntdResult } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { importMinderData } from '@/lib/api/minder';
import { getAppEnv } from '@/lib/appEnv';

import { StepComponentProp } from '../type';
import cx from './Result.less';

const useFakeProgress = testCaseCount => {
  const [percent, setPercent] = React.useState(0);
  const [start, setStart] = React.useState(false);
  const [status, setStatus] = React.useState<'active' | 'success' | 'exception'>('active');
  const MaxPercent = 95;
  const TestCaseCreateTimeCost = getAppEnv('ITEM_CREATE_COST') ?? 250;

  React.useEffect(() => {
    if (!start || !testCaseCount) return;
    const startTime = Date.now();
    const predictTotalCost = TestCaseCreateTimeCost * testCaseCount;
    const timer = setInterval(() => {
      if (!start) return;
      const fakePercent = Math.floor(((Date.now() - startTime) / predictTotalCost) * 100);
      const percent = Math.min(fakePercent, MaxPercent);
      if (fakePercent >= MaxPercent) {
        clearInterval(timer);
      }
      setPercent(percent);
    }, 500);
    return () => {
      clearInterval(timer);
    };
  }, [TestCaseCreateTimeCost, start, testCaseCount]);

  return {
    percent,
    node: <Progress status={status} percent={percent} />,
    start: useMemoizedFn(() => {
      setPercent(0);
      setStart(true);
    }),
    end: useMemoizedFn(() => {
      setStatus('success');
      setPercent(100);
      setStart(false);
    }),
    error: useMemoizedFn(() => {
      setStatus('exception');
      setStart(false);
    }),
  };
};

const Result: React.FC<StepComponentProp> = ({ sharedState }) => {
  const importTestCaseCount = React.useMemo(() => {
    let count = 0;
    const traverseMinderData = minderData => {
      if (minderData.data?.type === 'TestCase') {
        count++;
      }
      minderData.children?.forEach(traverseMinderData);
    };
    traverseMinderData(sharedState.submitMinderData);
    return count;
  }, [sharedState.submitMinderData]);

  const { percent, start, end, error, node: progressNode } = useFakeProgress(importTestCaseCount);
  const { t } = useTranslation('', {
    keyPrefix: 'page.xMindImport.resultStep',
  });

  // 保存脑图数据
  const { runAsync } = useRequest(
    async () => {
      start();
      try {
        await importMinderData({
          workspaceKey: sharedState.workspaceKey,
          minderData: sharedState.submitMinderData,
        });
      } catch (err) {
        error();
        err.message && message.error(err.message);
        return;
      }
      end();
    },
    {
      manual: true,
    },
  );

  React.useEffect(() => {
    runAsync();
  }, [runAsync]);

  const isFinished = percent >= 100;

  return (
    <div className={cx('container')}>
      {isFinished ? (
        <AntdResult
          status="success"
          title={t('success')}
          extra={
            sharedState.redirectLink ? (
              <Button
                type="primary"
                onClick={() => {
                  window.open(sharedState.redirectLink);
                }}
              >
                {t('redirectRepositoryPage')}
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="hint">{t('hint')}</div>
          <div className={cx('progress')}>{progressNode}</div>
          {/* <div className={cx('stats')}>{t('stats.label')}</div> */}
        </>
      )}
    </div>
  );
};

export default Result;
