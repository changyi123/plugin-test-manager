import React from 'react';
import { useGetTestRepoGroup } from '@/lib/hooks/useTest';

const RepositoryGroup = ({ rowData }: { rowData: any }) => {
  const testRepoGroup = useGetTestRepoGroup(rowData);

  return (
    <>
      <span>{testRepoGroup ?? '未分组'}</span>
    </>
  );
};

export default RepositoryGroup;
