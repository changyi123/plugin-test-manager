import React from 'react';
import ReactDOM from 'react-dom';
import { useMount } from 'ahooks';
import { Tabs, Alert } from '@osui/ui';
import { AlertProps } from 'antd/lib/alert';
import { TabPaneProps, TabsProps } from 'antd/lib/tabs';

import cx from './index.less';

// alter 容器 id
const AlertDOMContainerId = 'pane-alert-container';

type PanelLayoutProps = {
  title?: string;
  tabsProps?: TabsProps;
  tabs?: ({ Component: any; key: string } & TabPaneProps)[];
};

const PanelLayout: React.FC<PanelLayoutProps> = props => {
  const { tabs, tabsProps = {}, title = '测试管理', children } = props;

  useMount(() => {
    // TODO: 修改插件 pane title
    console.info(title);
  });

  const useTabsComponent = Array.isArray(tabs) && tabs.length > 0;

  return (
    <div className={cx('panel')}>
      {useTabsComponent ? (
        <Tabs destroyInactiveTabPane defaultActiveKey={tabs[0]?.key} {...tabsProps}>
          {tabs.map(tab => {
            const { Component } = tab;
            return (
              <Tabs.TabPane key={tab.key} {...tab}>
                <div id={AlertDOMContainerId} />
                <Component />
              </Tabs.TabPane>
            );
          })}
        </Tabs>
      ) : (
        <>
          <div id={AlertDOMContainerId} />
          {children}
        </>
      )}
    </div>
  );
};

/** 消息提示 */
export const alert = (props: AlertProps & { duration?: number }) => {
  const { duration = 3000 } = props;
  const DOMContainer = document.getElementById(AlertDOMContainerId);
  if (!DOMContainer) {
    // 不存在 DOMContainer 使用 notification 代替
    return;
  }
  const container = document.createElement('div');
  // 删除挂载点
  const removeContainerDOM = () => {
    container.remove();
  };
  ReactDOM.render(
    <Alert className={cx('alert')} afterClose={removeContainerDOM} showIcon closable {...props} />,
    container,
  );
  DOMContainer.appendChild(container);
  if (duration > 0) {
    setTimeout(removeContainerDOM, duration);
  }
};

export default PanelLayout;
