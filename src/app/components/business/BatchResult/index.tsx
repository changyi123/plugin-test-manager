import { Button, Collapse, ConfigProvider, Progress, Typography } from 'antd/lib';
import React, { useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';

import {
  IProgressBarUpdateProps,
  useWatchProgressUpdate,
} from '@/lib/hooks/useWatchProgressUpdate';

import { retryWithProcess } from './hooks';

const ellipsis = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  wordBreak: 'break-all',
  whiteSpace: 'pre-line',
  WebkitLineClamp: 1,
} as any;

const errorBox = {
  paddingLeft: '1em',
  maxHeight: '200px',
  overflow: 'auto',
};

interface BatchResultRefMethod {
  start: () => void;
  reset: () => void;
}

const DEFAULT_RESULT = {
  retryId: null,
  items: [],
  message: [],
  total: 0,
  fail: 0,
  success: 0,
  skip: 0,
};

const BatchResult: React.ForwardRefRenderFunction<BatchResultRefMethod, IProgressBarUpdateProps> = (
  props,
  ref,
) => {
  const [visible, setVisible] = useState(false);
  const { percent, processDesc, execSubscription, reset } = useWatchProgressUpdate(props);

  const batchResult = useMemo(() => {
    let result = DEFAULT_RESULT;
    if (processDesc) {
      try {
        result = JSON.parse(processDesc);
      } catch (e) {
        result = {
          ...DEFAULT_RESULT,
          message: [processDesc],
        };
      }
    }
    return result;
  }, [processDesc]);

  const showError = useMemo(() => !!batchResult?.message?.length, [batchResult]);
  useImperativeHandle(
    ref,
    () => ({
      start: () => {
        setVisible(true);
        execSubscription();
      },
      reset,
      batchResult,
    }),
    [batchResult, execSubscription, reset],
  );

  useEffect(() => {
    setVisible(true);
    execSubscription();
    return () => setVisible(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = useCallback(async () => {
    await retryWithProcess({
      retryId: batchResult.retryId,
      handleSuccess: () => false,
    });
  }, [batchResult.retryId]);

  const hasFail = useMemo(() => batchResult?.fail > 0, [batchResult?.fail]);

  if (!visible) return null;

  return (
    <>
      <Progress percent={percent} size={['100%', 12]} />
      <div style={{ marginBottom: '8px' }}>
        <span style={{ marginRight: '1em' }}>
          <strong>成功:</strong>
          <span style={{ color: '#09b866' }}> {batchResult?.success ?? 0} </span>
          <strong>条</strong>
        </span>
        {hasFail && (
          <span>
            <strong>失败:</strong>
            <span>
              {' '}
              <Typography.Text
                type="danger"
                copyable={{ text: `id in ${JSON.stringify(batchResult?.items || [])}` }}
              >
                {batchResult.fail}
              </Typography.Text>{' '}
            </span>
            <strong>条</strong>
            <Button type="link" onClick={retry}>
              重试
            </Button>
          </span>
        )}
      </div>

      {showError ? (
        <ConfigProvider
          theme={{
            components: {
              Collapse: {
                headerPadding: 0,
                contentPadding: 0,
              },
            },
          }}
        >
          <Collapse
            ghost
            items={[
              {
                key: 'error',
                label: <strong>操作出现以下错误:</strong>,
                children: (
                  <ul style={errorBox}>
                    {batchResult?.message?.map((text, key) => (
                      <li key={key} style={ellipsis} title={text}>
                        {text}
                      </li>
                    ))}
                  </ul>
                ),
              },
            ]}
            defaultActiveKey={['error']}
          />
        </ConfigProvider>
      ) : null}
    </>
  );
};

export default BatchResult;
