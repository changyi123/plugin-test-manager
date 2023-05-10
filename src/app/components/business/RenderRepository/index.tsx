import React from 'react';
import { useBaseAction } from '@/lib/hooks/useContext';

const RenderRepository = ({ repository }) => {
  const { getTestCaseRepositoryPath } = useBaseAction();
  return <span>{getTestCaseRepositoryPath(repository)}</span>;
};

export default RenderRepository;
