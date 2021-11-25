import React from 'react';
import { ConfigContext } from '@/components/common/ConfigProvider/context';

export const useConfigContext = () => React.useContext(ConfigContext);
