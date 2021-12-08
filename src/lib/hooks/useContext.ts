import React from 'react';
import {
  TestConfigContext,
  BaseActionContext,
  EventBusContext,
} from '@/components/common/TestManagerProvider/context';

export const useTestConfig = () => React.useContext(TestConfigContext);
export const useBaseAction = () => React.useContext(BaseActionContext);
export const useEventBus = () => React.useContext(EventBusContext);
