import React from 'react';
import { TestConfigContext } from '@/components/common/TestManagerProvider/context';

export const useTestConfig = () => React.useContext(TestConfigContext);
