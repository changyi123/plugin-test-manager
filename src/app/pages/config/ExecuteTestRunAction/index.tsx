import { useMemoizedFn, useMount } from 'ahooks';
import { Button, message, Radio, Switch } from 'antd';
import { pick } from 'lodash';
import { components } from 'proxima-sdk';
import React from 'react';

import { getStatusByWorkspaceAndItemType, getWorkspaceRoleMembers } from '@/lib/api/proxima';
import useI18n from '@/lib/hooks/useI18n';

import { useCurrentTestConfig, useDataContext } from '../hooks';
import cx from './index.less';

const SearchPopoverSelect = components.Components.Common.SearchPopoverSelect;

const DefaultTestRunAction = {
  // 用例分配授权
  authUserList: [],
  // 测试人员仅可执行自己的测试用例
  canOnlyExecuteMineCase: false,
  // 未分配的测试用例无法执行
  canOnlyExecuteAssignedCase: false,
  // 当前空间可以规划的测试用例状态名单类型：黑 | 白
  listType: 'black',
  // 当前空间可以规划的测试用例状态名单
  statusList: [],
};

/** 获取空间成员列表 */
export const useWorkspaceMemberUserList = ({ workspaceId: workspaceId, selectedUserList }) => {
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
        memberUserList?.filter(user => !selectedUserIdSet.has(user.objectId)),
      )
      .filter(Boolean);
  });

  return {
    onUserKeywordSearch: fetchAndSetMemberUserList,
    workspaceMemberUserList: memberUserList,
  };
};

/** 获取空间成员列表 */
const useStatusList = ({ workspaceId, itemTypeKey, selectedStatusList }) => {
  // 首次请求用户列表请求
  const defaultStatusListCacheRef = React.useRef<any[]>([]);
  const [statusList, setStatusList] = React.useState([]);

  const fetchAndSetStatusList = useMemoizedFn(async keyword => {
    let statusList = defaultStatusListCacheRef.current;
    console.info(itemTypeKey, workspaceId);
    if (keyword?.trim() || (itemTypeKey && workspaceId)) {
      statusList = await getStatusByWorkspaceAndItemType({
        workspaceId,
        itemTypeKey,
        keyword,
      });
    }
    setStatusList(statusList);
    return statusList;
  });

  useMount(async () => {
    const selectedStatusIdSet = new Set(selectedStatusList?.map(status => status.statusId) ?? []);
    const statusList = await fetchAndSetStatusList('');
    if (!Array.isArray(statusList)) return;
    defaultStatusListCacheRef.current = []
      .concat(
        selectedStatusList,
        // 过滤已被选中的用户列表
        statusList.filter(status => !selectedStatusIdSet.has(status.statusId)),
      )
      .filter(Boolean);
  });

  return {
    onStatusKeywordSearch: fetchAndSetStatusList,
    statusList,
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
      listType: e => e.target.value,
      statusList: val => val.map(v => pick(v, ['statusId', 'name', 'isStartStatus'])),
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

  const { onStatusKeywordSearch, statusList } = useStatusList({
    workspaceId: workspace.objectId,
    itemTypeKey: testConfig?.get('itemTypeMap')?.TestCase,
    selectedStatusList: testRunAction.statusList,
  });

  const selectStatusListProp = React.useMemo(() => {
    return statusList.filter(Boolean).map(status => ({
      ...status,
    }));
  }, [statusList]);

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
        <span className={cx('section-label')}>
          {t('page.config.executeTestRunAction.testersCannotExecuteOtherCases')}：
        </span>
        <Switch
          checked={testRunAction.canOnlyExecuteMineCase}
          onChange={buildConfigChange('canOnlyExecuteMineCase')}
        />
      </div>
      <div className={cx('section')}>
        <span className={cx('section-label')}>
          {t('page.config.executeTestRunAction.unassignedCaseCannotBeExecuted')}：
        </span>
        <Switch
          checked={testRunAction.canOnlyExecuteAssignedCase}
          onChange={buildConfigChange('canOnlyExecuteAssignedCase')}
          disabled={canOnlyExecuteAssignedCaseSwitchDisabled}
        />
      </div>
      <div className={cx('section')}>
        <h3>{t('page.config.executeTestRunAction.caseToPlanRule')}</h3>
        <Radio.Group
          value={testRunAction.listType}
          defaultValue={testRunAction.listType}
          className={cx('section-radio-group')}
          options={[
            { label: t('page.config.executeTestRunAction.radioBlackLabel'), value: 'black' },
            { label: t('page.config.executeTestRunAction.radioWhiteLabel'), value: 'white' },
          ]}
          onChange={buildConfigChange('listType')}
        />
        <SearchPopoverSelect
          allowClear
          mode="multiple"
          valueKey="statusId"
          labelKey="name"
          list={selectStatusListProp}
          placeholder={t('page.config.executeTestRunAction.caseToPlanPlaceholder')}
          value={testRunAction.statusList}
          onSearchChange={onStatusKeywordSearch}
          onChange={buildConfigChange('statusList')}
        />
      </div>
      <Button type="primary" className={cx('action')} onClick={handleSave}>
        {t('common.save')}
      </Button>
    </div>
  );
};

export default ExecuteTestRunAction;
