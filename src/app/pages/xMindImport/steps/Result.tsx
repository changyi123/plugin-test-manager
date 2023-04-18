import React from 'react';
import { Progress, Result as AntdResult, Button } from 'antd';
import { StepComponentProp } from '../type';
import { useTranslation } from 'react-i18next';
import { useMemoizedFn, useRequest } from 'ahooks';
import { importMinderData } from '@/lib/api/minder';

import cx from './Result.less';

const useFakeProgress = () => {
  const [percent, setPercent] = React.useState(0);
  const [start, setStart] = React.useState(false);
  React.useEffect(() => {
    if (!start) return;
    const MaxPercent = 80;
    const timer = setInterval(() => {
      setPercent(percent => {
        if (percent >= MaxPercent) {
          clearInterval(timer);
        }
        return percent + 5;
      });
    }, 500);
    return () => {
      clearInterval(timer);
    };
  }, [start]);

  return {
    percent,
    node: <Progress percent={percent} />,
    start: useMemoizedFn(() => {
      setPercent(0);
      setStart(true);
    }),
    end: useMemoizedFn(() => {
      setPercent(100);
      setStart(false);
    }),
  };
};

const Result: React.FC<StepComponentProp> = ({ sharedState }) => {
  const { percent, start, end, node: progressNode } = useFakeProgress();
  const { t } = useTranslation('', {
    keyPrefix: 'page.xMindImport.resultStep',
  });

  // 保存脑图数据
  const { runAsync } = useRequest(
    async () => {
      start();
      await importMinderData({
        workspaceKey: sharedState.workspaceKey,
        minderData: sharedState.submitMinderData,
      });
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
