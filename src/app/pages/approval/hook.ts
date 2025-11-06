import React from 'react';

import { PageContext } from './PageProvider';

export const usePageContext = () => React.useContext(PageContext);
