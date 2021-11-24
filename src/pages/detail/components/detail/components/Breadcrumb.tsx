import React from 'react';
import { Breadcrumb } from '@osui/ui';

const BreadcrumbInstance: React.FC = () => {
  return (
    <Breadcrumb>
      <Breadcrumb.Item>Home</Breadcrumb.Item>
      <Breadcrumb.Item>
        <a href="">测试仓库</a>
      </Breadcrumb.Item>
      <Breadcrumb.Item>
        <a href="">测试子仓库</a>
      </Breadcrumb.Item>
      <Breadcrumb.Item>测试用例</Breadcrumb.Item>
    </Breadcrumb>
  );
};

export default BreadcrumbInstance;
