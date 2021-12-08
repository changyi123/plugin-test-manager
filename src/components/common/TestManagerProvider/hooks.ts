import React from 'react';
import { useEventEmitter } from 'ahooks';
// import { EventBusContextType } from './context';

export const useEventBusContextValue = () => {
  // 事项创建通知
  const itemCreated$ = useEventEmitter<{
    itemId: string;
    testId: string;
  }>();

  const events = React.useMemo(
    () => ({
      itemCreated$,
    }),
    [itemCreated$],
  );

  return events;
};
