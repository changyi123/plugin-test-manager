import React from 'react';
import { pick } from 'lodash';
import { Button, Switch, message } from 'antd';
import { useMemoizedFn, useMount } from 'ahooks';
import { getWorkspaceRoleMembers } from '@/lib/api/proxima';
import { useDataContext, useCurrentTestConfig } from '../hooks';
import { components } from 'proxima-sdk';
import useI18n from '@/lib/hooks/useI18n';

import cx from './index.less';

const SearchPopoverSelect = components.Components.Common.SearchPopoverSelect;

const DefaultTestRunAction = {
  // 用例分配授权
  authUserList: [],
  // 测试人员仅可执行自己的测试用例
  canOnlyExecuteMineCase: false,
  // 未分配的测试用例无法执行
  canOnlyExecuteAssignedCase: false,
};

/** 获取空间成员列表 */
const useWorkspaceMemberUserList = ({ workspaceId: workspaceId, selectedUserList }) => {
  // 首次请求用户列表请求
  const defaultMemberUserListCacheRef = React.useRef<any[]>();
  const [memberUserList, setMemberUserList] = React.useState([]);

  const fetchAndSetMemberUserList = useMemoizedFn(async keyword => {
    let userList = defaultMemberUserListCacheRef.current;
    if (!workspaceId) return;
    if (keyword?.trim() || !Array.isArray(userList)) {
      userList = await getWorkspaceRoleMembers({
        workspaceId,
        keyword,
      });
    }
    setMemberUserList(userList);
    return userList;
  });

  useMount(async () => {
    const selectedUserIdSet = new Set(selectedUserList?.map(user => user.objectId) ?? []);
    const memberUserList = await fetchAndSetMemberUserList('');
    defaultMemberUserListCacheRef.current = []
      .concat(
        selectedUserList,
        // 过滤已被选中的用户列表
        memberUserList.filter(user => !selectedUserIdSet.has(user.objectId)),
      )
      .filter(Boolean);
  });

  return {
    onUserKeywordSearch: fetchAndSetMemberUserList,
    workspaceMemberUserList: memberUserList,
  };
};

/** 过滤无效字段 */
const getUsefulUserInfo = user => {
  return pick(user, ['username', 'nickname', 'displayName', 'objectId', 'enabled', 'deleted']);
};

const ExecuteTestRunAction = () => {
  const { t } = useI18n();
  const { workspace } = useDataContext();

  const testConfig = useCurrentTestConfig(workspace?.key);
  const [testRunAction, setTestRunAction] = React.useState(DefaultTestRunAction);

  React.useEffect(() => {
    setTestRunAction(testConfig?.get('testRunAction') ?? DefaultTestRunAction);
  }, [testConfig]);

  const handleSave = async () => {
    if (testConfig && testRunAction) {
      await testConfig.save({
        testRunAction,
      });
      message.success(t('common.saveSuccess'));
    }
  };

  const buildConfigChange = key => {
    const dataProcessStrategies = {
      authUserList: val => val.map(getUsefulUserInfo),
      canOnlyExecuteMineCase: val => {
        // 测试人员仅可执行自己的测试用例关闭时，未分配的测试用例无法执行也需要同步关闭
        if (!val)
          Promise.resolve().then(() => buildConfigChange('canOnlyExecuteAssignedCase')(false));
        return val;
      },
    };

    const handleConfigChange = data => {
      setTestRunAction(prev => ({
        ...prev,
        [key]:
          typeof dataProcessStrategies[key] === 'function'
            ? dataProcessStrategies[key](data)
            : data,
      }));
    };
    return handleConfigChange;
  };

  const { onUserKeywordSearch, workspaceMemberUserList } = useWorkspaceMemberUserList({
    workspaceId: workspace.objectId,
    selectedUserList: testRunAction.authUserList,
  });

  const selectListProp = React.useMemo(() => {
    return workspaceMemberUserList.filter(Boolean).map(user => ({
      ...user,
      displayName: `${user.nickname}(${user.username})`,
    }));
  }, [workspaceMemberUserList]);

  // 测试人员仅可执行自己的测试用例
  const canOnlyExecuteAssignedCaseSwitchDisabled = React.useMemo(() => {
    return !testRunAction.canOnlyExecuteMineCase;
  }, [testRunAction]);

  return (
    <div className={cx('container')}>
      <div className={cx('section')}>
        <h3>{t('page.config.executeTestRunAction.caseToPlan')}</h3>
        <SearchPopoverSelect
          allowClear
          mode="multiple"
          valueKey="objectId"
          labelKey="displayName"
          list={selectListProp}
          placeholder={t('page.config.executeTestRunAction.placeholder')}
          value={testRunAction.authUserList}
          onSearchChange={onUserKeywordSearch}
          onChange={buildConfigChange('authUserList')}
        />
      </div>
      <div className={cx('section')}>
        <span className={cx('label')}>
          {t('page.config.executeTestRunAction.testersCannotExecuteOtherCases')}：
        </span>
        <Switch
          checked={testRunAction.canOnlyExecuteMineCase}
          onChange={buildConfigChange('canOnlyExecuteMineCase')}
        />
      </div>
      <div className={cx('section')}>
        <span className={cx('label')}>
          {t('page.config.executeTestRunAction.unassignedCaseCannotBeExecuted')}：
        </span>
        <Switch
          checked={testRunAction.canOnlyExecuteAssignedCase}
          onChange={buildConfigChange('canOnlyExecuteAssignedCase')}
          disabled={canOnlyExecuteAssignedCaseSwitchDisabled}
        />
      </div>
      <Button type="primary" className={cx('action')} onClick={handleSave}>
        {t('common.save')}
      </Button>
    </div>
  );
};

export default ExecuteTestRunAction;
