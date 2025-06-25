import { useUpdateEffect } from 'ahooks';
import { TestType } from 'common/constant';
import { useState } from 'react';

import { useTestConfig } from '@/lib/hooks/useContext';

import { TestCaseSetEntity } from '../type';

export const useTreeParams = (props: {
  workspaceKey: string;
  selectedTestCaseSet: TestCaseSetEntity | null;
}) => {
  const [treeParams, setTreeParams] = useState<any>(null);
  const { config } = useTestConfig();
  const { workspaceKey, selectedTestCaseSet } = props;

  useUpdateEffect(() => {
    if (!workspaceKey || !selectedTestCaseSet?.objectId || !config) return;
    setTreeParams({
      query: {
        workspaceKey: workspaceKey,
        type: TestType.Case,
      },
      selector: `'测试用例集' in ['${selectedTestCaseSet.objectId}']`,
    });
  }, [selectedTestCaseSet?.objectId, workspaceKey, config?.enableCaseSnapshot]);

  return treeParams;
};
