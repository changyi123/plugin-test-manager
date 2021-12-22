import React from 'react';
import { Button, message } from '@osui/ui';
import Parse from '@/lib/parse';

const Demo: React.FC = () => {
  const handleClick = async () => {
    await Parse.User.logIn('onion', '123456');
    message.success('登录成功');
  };
  return (
    <div style={{ display: 'flex', height: '88vh' }}>
      <Button
        onClick={() => Parse.User.logIn('yinqian', 'proxima0719')}
        style={{ margin: 'auto' }}
        type="primary"
        size="large"
      >
        登录
      </Button>
      <Button
        onClick={() => Parse.User.logIn('onion', '123456')}
        style={{ margin: 'auto' }}
        type="primary"
        size="large"
      >
        正常用户
      </Button>
    </div>
  );
};

export default Demo;
