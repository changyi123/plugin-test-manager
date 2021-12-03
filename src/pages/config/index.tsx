import React from 'react';
import { Menu, Layout, Button, Row, Col, Modal, Select } from '@osui/ui';
import { getRootContainer } from '@/lib/utils/helper';

import cx from './style.less';

const { Header, Sider, Content } = Layout;

const Config = () => {
  const handleSelectWorkspace = () => {
    Modal.info({
      getContainer: getRootContainer,
      content: (
        <div>
          选择空间：
          <Select placeholder="请选择需要配置空间"></Select>
        </div>
      ),
      icon: null,
    });
  };

  return (
    <Layout className={cx('page')}>
      <Sider theme="light" collapsible>
        <Menu>
          <Menu.Item>事项类型关联配置</Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Header className={cx('page-header')}>
          <Row>
            <Col>事项类型关联配置</Col>
            <Col style={{ marginLeft: 'auto' }}>
              当前选择空间：
              <Button onClick={handleSelectWorkspace} type="primary">
                选择空间
              </Button>
            </Col>
          </Row>
        </Header>
        <Content></Content>
      </Layout>
    </Layout>
  );
};

export default React.memo(Config);
