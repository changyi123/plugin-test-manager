import { Result } from 'antd';
import { t } from 'i18next';
import React from 'react';

import { getAppEnv } from '@/lib/appEnv';
import Parse from '@/lib/parse';

import { Guard } from './base';

/** 是否能够访问页面 */
class PageGuard implements Guard {
  private guardConfig = null;

  private resultMessage = '';

  activated = true;

  constructor(pageKey: string) {
    this.guardConfig = getAppEnv('PAGE_USER_GUARD')?.[pageKey];
    this.resultMessage = this.guardConfig?.resultMessage || t('common.noPermissionToAccess');
  }

  canActive = async authInfo => {
    // 校验数据结构是否合规，不合规则不做校验，直接返回 true
    const { guardConfig } = this;
    // 黑白名单只能存在一个，如果同时存在或都不存在，则不做校验，直接返回 true
    if (!guardConfig || (guardConfig.blacklist && guardConfig.whitelist)) return true;

    // 用户和角色包含校验
    function userOrRoleIncludeCheck(authConfig) {
      if (!authConfig) return true;
      return Object.keys(authInfo)
        .filter(key => Array.isArray(authConfig[key]))
        .some(key => {
          return authConfig[key].includes(authInfo.key);
        });
    }

    // 白名单校验
    if (guardConfig.whitelist) {
      this.activated = !userOrRoleIncludeCheck(guardConfig.whitelist);
    }
    // 黑名单校验
    if (guardConfig.blacklist) {
      this.activated = userOrRoleIncludeCheck(guardConfig.blacklist);
    }

    return this.activated;
  };

  // 渲染结果页面
  renderResultPage = () => <Result title={this.resultMessage} />;
}

export const withPageGuard = (pageKey, WrappedComponent) => {
  const PageGuardComponent = (...restProps) => {
    const guardRef = React.useRef(new PageGuard(pageKey));
    const [authInfo, setAuthInfo] = React.useState(null);
    const [active, setActive] = React.useState(true);

    React.useEffect(() => {
      const runner = async () => {
        const user = await Parse.User.current();
        const userData = user.toJSON();
        console.info('authInfo', {
          usernames: userData.username,
          roles: userData?.role?.name,
        });
        setAuthInfo({
          usernames: userData.username,
          roles: userData?.role?.name,
        });
      };

      runner();
    }, []);

    React.useEffect(() => {
      const runner = async () => {
        if (authInfo) {
          const active = await guardRef.current.canActive(authInfo);
          setActive(active);
        }
      };
      runner();
    }, [authInfo]);

    return active ? <WrappedComponent {...restProps} /> : guardRef.current?.renderResultPage();
  };

  return PageGuardComponent;
};
