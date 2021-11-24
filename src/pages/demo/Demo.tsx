import React from 'react';
import { Input, Rate } from '@osui/ui';
import Error from '@/statics/error.png';
import Logo from '@/statics/Gitee-Scan.svg';
import cx from './Demo.less';
import { Repository } from '@/lib/models';

const Demo: React.FC = () => {
  const handleClick = () => {
    const repository = new Repository();
    repository.set('name', '这个是第二个仓库');
    repository.save();
  };
  return (
    <div>
      <h2 className={cx('title')}>CSS Module啊嘎嘎 </h2>
      <Input placeholder="OSUI input 测试" />
      <Rate allowHalf defaultValue={2.5} />
      <button onClick={handleClick}>唤起卡片面板</button>
      <div>
        <img src={Error} />
      </div>
      <div>svg测试:</div>
      <Logo />
    </div>
  );
};

export default Demo;
