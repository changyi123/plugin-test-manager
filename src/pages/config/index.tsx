import React from 'react';
import { isNil } from 'lodash';
import { useDataContext } from './hooks';
import DataProvider from './DataProvider';
import DefectMapping from './DefectMapping';
import ItemTypeMapping from './ItemTypeMapping';
import IsolatedTestType from './IsolatedTestType';
import { DownOutlined } from '@ant-design/icons';
import { useLocalStorageState, useSafeState } from 'ahooks';
import { Menu, Layout, Dropdown, Button, Result } from 'antd';

import IsolatedSystem from './MoreConfig/IsolatedSystem';
import WordTemplate from './MoreConfig/WordTemplate';

import cx from './index.less';

const { Sider, Content, Header } = Layout;

// 更多配置
const MORE_CONFIG_STORAGE_KEY = 'more-config';
const MoreConfigPages = [
  {
    key: 'IsolatedSystem',
    title: '测试管理系统隔离',
    component: IsolatedSystem,
    description: '配置测试管理系统与业务系统进行隔离',
    isGlobalConfig: true,
  },
  {
    key: 'WordTemplate',
    title: '测试报告模板管理',
    component: WordTemplate,
    description: '模板管理',
    isGlobalConfig: true,
  },
];

const ConfigPages = [
  {
    key: 'ItemTypeMapping',
    title: '事项类型关联配置',
    component: ItemTypeMapping,
    description: '配置当前空间测试管理类型关联的事项类型',
  },
  {
    key: 'defectsMapping',
    title: '缺陷类型关联配置',
    component: DefectMapping,
    description:
      '配置当前空间测试管理的缺陷类型，缺陷表示测试中产生不正确或意外结果的错误、缺陷、故障或故障。',
  },
  {
    key: 'IsolatedTestType',
    title: '空间数据隔离配置',
    component: IsolatedTestType,
    description: '配置当前空间内对测试用例，测试计划，测试执行，测试缺陷的空间可见范围',
  },
];

const ALLConfigPages = [].concat(ConfigPages, MoreConfigPages);

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
  if (!workspace && !currentConfigPage.isGlobalConfig)
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
  const [showMoreConfigPages] = useLocalStorageState(MORE_CONFIG_STORAGE_KEY, {
    defaultValue: true,
    deserializer(val) {
      return !isNil(val);
    },
  });

  const [selectedKey, setSelectedKey] = useSafeState(ConfigPages[0].key);
  const currentConfigPage = ALLConfigPages.find(item => item.key === selectedKey) ?? ({} as any);

  const renderMenuItems = menuList => {
    return (
      <>
        {menuList.map(menu => (
          <Menu.Item key={menu.key}>{menu.title}</Menu.Item>
        ))}
      </>
    );
  };

  return (
    <Layout className={cx('page')}>
      <Sider className={cx('sider')} width={250}>
        <h1 className={cx('title')}>测试管理配置</h1>
        <Menu
          mode="inline"
          openKeys={['MORE_CONFIG']}
          selectedKeys={[selectedKey]}
          onClick={({ key }) => setSelectedKey(key)}
        >
          {renderMenuItems(ConfigPages)}
          {showMoreConfigPages ? (
            <>
              <Menu.Divider />
              <Menu.SubMenu key="MORE_CONFIG" title="更多配置">
                {renderMenuItems(MoreConfigPages)}
              </Menu.SubMenu>
            </>
          ) : null}
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
              {currentConfigPage.isGlobalConfig ? null : <WorkspaceSelector />}
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
