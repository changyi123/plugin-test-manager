import React from 'react';
import { Spin } from '@osui/ui';
import css from './index.less';

interface ILoadingProps {
  tip?: string;
}

const Loading: React.FC<ILoadingProps> = ({ tip = '加载中' }) => {
  return (
    <div className={css('loading')}>
      <Spin tip={tip} />
    </div>
  );
};

export default Loading;
