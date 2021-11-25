import React from 'react';
import { Button, message } from '@osui/ui';
import Parse from '@/lib/parse';

const Demo: React.FC = () => {
  const handleClick = async () => {
    await Parse.User.logIn('testmanager', 'testmanager');
    message.success('登录成功');
  };
  return (
    <div style={{ display: 'flex', height: '88vh' }}>
      <Button style={{ margin: 'auto' }} onClick={handleClick} type="primary" size="large">
        登录
      </Button>
    </div>
  );
};

export default Demo;
