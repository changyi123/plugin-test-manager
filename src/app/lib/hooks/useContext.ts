import React from 'react';

import {
  BaseActionContext,
  TestConfigContext,
} from '@/components/business/TestManagerProvider/context';

export const useTestConfig = () => React.useContext(TestConfigContext);
export const useBaseAction = () => React.useContext(BaseActionContext);
