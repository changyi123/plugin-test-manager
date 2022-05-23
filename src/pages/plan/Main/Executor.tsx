import React from 'react';
import { useGetUserNameByName } from '@/lib/hooks/useTest';
import { Executor } from '@/lib/types/Test';

const Executor = ({ executor }: { executor?: Executor[] }) => {
  const name = useGetUserNameByName(executor?.filter(d => d.isCurrent)?.[0]?.username);

  return <span>{name ?? '--'}</span>;
};

export default Executor;
