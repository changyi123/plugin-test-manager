import React from 'react';
import { useGetTestRepoGroup } from '@/lib/hooks/useTest';

const RepositoryGroup = ({ rowData }: { rowData: any }) => {
  const { data: testRepoGroup, loading } = useGetTestRepoGroup(rowData);

  return (
    <>
      <span>{!loading ? testRepoGroup ?? '--'}</span>
    </>
  );
};

export default RepositoryGroup;
