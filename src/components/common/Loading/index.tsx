import React from 'react';
import { Spin } from '@osui/ui';
import css from './index.less';

interface ILoadingProps {
  tip?: string;
  loading?: boolean;
}

const Loading: React.FC<ILoadingProps> = ({ loading, tip = '加载中', children }) => {
  return (
    <div className={[css('loading'), loading !== undefined ? css('none') : ''].join(' ')}>
      <Spin spinning={loading} tip={tip}>
        {children}
      </Spin>
    </div>
  );
};

export default Loading;
