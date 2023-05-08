import React from 'react';

import { useGetWorkspaceRepository } from '@/lib/hooks/useTest';

const RepositoryGroupCell = ({ repository, workspaceKey }) => {
  const getTestCaseRepositoryPath = useGetWorkspaceRepository(workspaceKey);
  return <span>{getTestCaseRepositoryPath(repository)}</span>;
};

export default React.memo(RepositoryGroupCell);
