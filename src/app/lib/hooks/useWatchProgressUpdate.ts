import { floor } from 'lodash-es';
import { useCallback, useEffect, useRef, useState } from 'react';

import Parse from '@/lib/parse';
import { ProcessBar } from '@/services/models';

export interface IProgressBarUpdateProps {
  processBarKey: string;
  handleSuccess?: (msg?: string) => void;
  handleFail?: (error?: Error) => void;
}

interface IProgressBarUpdateReturn {
  percent: number;
  processDesc: string;
  execSubscription: () => void;
  reset: () => void;
}

const SUCCESS_PERCENTAGE = 100;

export function useWatchProgressUpdate(props: IProgressBarUpdateProps): IProgressBarUpdateReturn {
  const { processBarKey, handleFail, handleSuccess } = props;

  const [processDesc, setProcessDesc] = useState('');
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState(false);
  const subscription = useRef(null);

  const handleError = useCallback(
    errorString => {
      setError(true);
      try {
        new Parse.Query(ProcessBar)
          .equalTo('key', processBarKey)
          .first()
          .then(res => {
            if (res) {
              ProcessBar.createWithoutData(res.id).save({
                percentage: SUCCESS_PERCENTAGE,
                desc: null,
              });
            }
          });
      } catch (e) {
        console.error(e.message);
      }

      // 进度条字段为字符串，转Error
      let error;
      if (errorString) {
        try {
          error = JSON.parse(errorString);
        } catch (e) {
          error = new Error(errorString);
        }
      }
      handleFail && handleFail(error);
    },
    [handleFail, processBarKey],
  );

  const reset = useCallback(() => {
    try {
      if (subscription.current) {
        subscription.current?.unsubscribe();
        subscription.current = null;
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (subscription.current) subscription.current = null;
      setPercent(0);
      setError(false);
    }
  }, []);

  const execSubscription = useCallback(() => {
    const subscribe = async () => {
      try {
        console.info('execSubscription');
        const query = new Parse.Query(ProcessBar).equalTo('key', processBarKey);
        if (subscription.current) {
          subscription.current?.unsubscribe();
          subscription.current = null;
        }
        subscription.current = await query.subscribe();
        subscription.current.on('update', async object => {
          setPercent(floor(object.get('percentage'), 1));
          const desc = object.get('desc');
          if (desc) {
            setProcessDesc(desc);
          }
          if (object.get('percentage') === -1) {
            handleError(desc);
          }
          if (object.get('percentage') >= SUCCESS_PERCENTAGE) {
            if (subscription.current) {
              await subscription.current?.unsubscribe();
              subscription.current = null;
            }
            await new ProcessBar({ objectId: object.id }).destroy();
            !error && handleSuccess && handleSuccess(desc);
            setError(false);
          }
        });
      } catch (e) {
        console.error(e.message);
        handleSuccess();
      }
    };
    subscribe();
  }, [processBarKey, handleError, error, handleSuccess]);

  useEffect(() => {
    reset();
    return () => reset();
  }, [reset]);

  return { percent, processDesc, execSubscription, reset };
}
