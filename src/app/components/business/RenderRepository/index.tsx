import React from 'react';

import { useBaseAction } from '@/lib/hooks/useContext';

const RenderRepository = ({ repository }) => {
  const { getTestCaseRepositoryPath } = useBaseAction();
  const value = getTestCaseRepositoryPath(repository);
  return (
    <span title={value} className="ellipsis">
      {value}
    </span>
  );
};

export default RenderRepository;
