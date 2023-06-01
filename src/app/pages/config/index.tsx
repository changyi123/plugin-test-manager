import { DownOutlined } from '@ant-design/icons';
import { useLocalStorageState, useSafeState } from 'ahooks';
import { Button, Checkbox, Dropdown, Layout, Menu, Result } from 'antd';
import { isNil } from 'lodash';
import React from 'react';

import useI18n from '@/lib/hooks/useI18n';

import DataProvider from './DataProvider';
import DefectMapping from './DefectMapping';
import ExecuteTestRunAction from './ExecuteTestRunAction';
import { useDataContext } from './hooks';
import cx from './index.less';
import IsolatedTestType from './IsolatedTestType';
import ItemTypeMapping from './ItemTypeMapping';
import IsolatedSystem from './MoreConfig/IsolatedSystem';
import WordTemplate from './MoreConfig/WordTemplate';
import TableFields from './TableFields';
import TestReportTemplate from './TestReportTemplate';

const { Sider, Content, Header } = Layout;

// 更多配置
const MORE_CONFIG_STORAGE_KEY = 'more-config';
const MoreConfigPages = [
  {
    key: 'IsolatedSystem',
    title: 'isolatedSystem',
    component: IsolatedSystem,
    description: 'isolatedSystem',
    isGlobalConfig: true,
  },
  {
    key: 'WordTemplate',
    title: 'wordTemplate',
    component: WordTemplate,
    description: 'wordTemplate',
    isGlobalConfig: true,
  },
];

const ConfigPages = [
  {
    key: 'TestReportTemplate',
    title: 'testReportTemplate',
    component: TestReportTemplate,
    isGlobalConfig: true,
  },
  {
    key: 'ItemTypeMapping',
    title: 'itemTypeMapping',
    component: ItemTypeMapping,
    description: 'itemTypeMapping',
  },
  {
    key: 'defectsMapping',
    title: 'defectMapping',
    component: DefectMapping,
    description: 'defectMapping',
  },
  {
    key: 'IsolatedTestType',
    title: 'isolatedTestType',
    component: IsolatedTestType,
    description: 'isolatedTestType',
  },
  {
    key: 'ExecuteTestRunAction',
    title: 'executeTestRunAction',
    component: ExecuteTestRunAction,
    description: 'executeTestRunAction',
  },
  {
    key: 'TableFields',
    title: 'tableFields',
    component: TableFields,
    description: 'tableFields',
  },
];

const ALLConfigPages = [].concat(ConfigPages, MoreConfigPages);

const WorkspaceSelector = () => {
  const {
    workspace,
    toggleWorkspace,
    showAllWorkspaceCheck,
    checkAllWorkspace,
    setCheckAllWorkspace,
  } = useDataContext();
  const { t } = useI18n();

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
          <Menu.Item key="toggleWorkspace">{t('page.config.changeWorkspace')}</Menu.Item>
          {showAllWorkspaceCheck && (
            <Checkbox
              className={cx('check-box')}
              checked={checkAllWorkspace}
              onChange={() => setCheckAllWorkspace(x => !x)}
            >
              {t('common.allWorkspace')}
            </Checkbox>
          )}
        </Menu>
      }
    >
      <Button>
        {t('common.workspace')}：
        {checkAllWorkspace ? (
          t('common.allWorkspace')
        ) : workspace ? (
          workspace.name
        ) : (
          <span style={{ color: '#999' }}>{t('page.config.notSelected')}</span>
        )}
        <DownOutlined />
      </Button>
    </Dropdown>
  );
};

const PageContent = ({ currentConfigPage }) => {
  const { t } = useI18n();
  const { workspace, toggleWorkspace } = useDataContext();
  if (!workspace && !currentConfigPage.isGlobalConfig)
    return (
      <Result
        title={t('page.config.resultTitle')}
        subTitle={<span style={{ color: '#999' }}>{t('page.config.resultSubTitle')}</span>}
        extra={
          <Button type="primary" onClick={toggleWorkspace}>
            {t('page.config.selectWorkspace')}
          </Button>
        }
      ></Result>
    );

  return React.createElement(currentConfigPage.component);
};

const Config = () => {
  const { t } = useI18n();
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
          <Menu.Item key={menu.key}>{t(`page.config.${menu.title}.title`)}</Menu.Item>
        ))}
      </>
    );
  };

  return (
    <Layout className={cx('page')}>
      <Sider className={cx('sider')} width={260}>
        <h1 className={cx('title')}>{t('common.testManagerConfig')}</h1>
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
              <Menu.SubMenu key="MORE_CONFIG" title={t('common.moreConfig')}>
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
              <h3 className={cx('title')}>{t(`page.config.${currentConfigPage.title}.title`)}</h3>
              {typeof currentConfigPage.description === 'string' && (
                <p className={cx('description')}>
                  {t(`page.config.${currentConfigPage.description}.description`)}
                </p>
              )}
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
