import React from 'react';
import { useDataContext } from './hooks';
import DataProvider from './DataProvider';
import DefectMapping from './DefectMapping';
import ItemTypeMapping from './ItemTypeMapping';
import { useSafeState, useMount } from 'ahooks';
import { DownOutlined } from '@ant-design/icons';
import { Menu, Layout, Dropdown, Button, Result } from '@osui/ui';

import cx from './index.less';

const { Sider, Content, Header } = Layout;

const ConfigPages = [
  {
    key: 'ItemTypeMapping',
    title: '事项类型关联配置',
    component: ItemTypeMapping,
    description: '配置当前空间测试管理类型关联的事项类型',
  },
  {
    key: 'defectsMapping',
    title: '缺陷类型关联',
    component: DefectMapping,
    description:
      '配置当前空间测试管理的缺陷类型，缺陷表示测试中产生不正确或意外结果的错误、缺陷、故障或故障。',
  },
];

const WorkspaceSelector = () => {
  const { workspace, toggleWorkspace } = useDataContext();
  return (
    <Dropdown
      overlay={
        <Menu
          onClick={({ key }) => {
            if (key === 'toggleWorkspace') {
              toggleWorkspace();
            }
          }}
        >
          <Menu.Item key="toggleWorkspace">切换所选空间</Menu.Item>
        </Menu>
      }
    >
      <Button>
        空间：{workspace ? workspace.name : <span style={{ color: '#999' }}>未选择</span>}
        <DownOutlined />
      </Button>
    </Dropdown>
  );
};

const PageContent = ({ currentConfigPage }) => {
  const { workspace, toggleWorkspace } = useDataContext();
  useMount(() => {
    if (!workspace) {
      toggleWorkspace();
    }
  });
  if (!workspace)
    return (
      <Result
        title="请选择需要配置的空间"
        subTitle={
          <span style={{ color: '#999' }}>该配置属于空间级别配置，请选择需要配置的空间</span>
        }
        extra={
          <Button type="primary" onClick={toggleWorkspace}>
            选择空间
          </Button>
        }
      ></Result>
    );

  return React.createElement(currentConfigPage.component);
};

const Config = () => {
  const [selectedKey, setSelectedKey] = useSafeState(ConfigPages[0].key);
  const currentConfigPage = ConfigPages.find(item => item.key === selectedKey);

  return (
    <Layout className={cx('page')}>
      <Sider className={cx('sider')} width={250}>
        <h1 className={cx('title')}>测试管理配置</h1>
        <Menu selectedKeys={[selectedKey]} onClick={({ key }) => setSelectedKey(key)}>
          {ConfigPages.map(menu => (
            <Menu.Item key={menu.key}>{menu.title}</Menu.Item>
          ))}
        </Menu>
      </Sider>
      <DataProvider>
        <Layout className={cx('main')}>
          <Header className={cx('header')}>
            <div className={cx('left')}>
              <h3 className={cx('title')}>{currentConfigPage.title}</h3>
              <p className={cx('description')}>{currentConfigPage.description}</p>
            </div>
            <div className={cx('right')}>
              <WorkspaceSelector />
            </div>
          </Header>
          <Content className={cx('content')}>
            <PageContent currentConfigPage={currentConfigPage} />
          </Content>
        </Layout>
      </DataProvider>
    </Layout>
  );
};

export default React.memo(Config);
