import React from 'react';
import {
  TestConfigContext,
  BaseActionContext,
} from '@/components/common/TestManagerProvider/context';

export const useTestConfig = () => React.useContext(TestConfigContext);
export const useBaseAction = () => React.useContext(BaseActionContext);
