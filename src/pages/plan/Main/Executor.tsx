import React from 'react';
import { useGetUserNameByName } from '@/lib/hooks/useTest';

const Executor = ({ executor }: { executor?: string }) => {
  const name = useGetUserNameByName(executor);

  return <span>{name ?? '--'}</span>;
};

export default Executor;
