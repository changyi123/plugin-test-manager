import React from 'react';
import { Menu, Layout } from '@osui/ui';
import DefectMapping from './DefectMapping';
import ItemTypeMapping from './ItemTypeMapping';
import WorkspaceSelector from './WorkspaceSelector';
import { useSafeState } from 'ahooks';

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
      <Layout className={cx('main')}>
        <Header className={cx('header')}>
          <div className={cx('left')}>
            <h3 className={cx('title')}>{currentConfigPage.title}</h3>
            <p className={cx('description')}>{currentConfigPage.description}</p>
          </div>
          <WorkspaceSelector className={cx('workspace-selector')} />
        </Header>
        <Content className={cx('content')}>
          {React.createElement(currentConfigPage.component)}
        </Content>
      </Layout>
    </Layout>
  );
};

export default React.memo(Config);
