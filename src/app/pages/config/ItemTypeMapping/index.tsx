import { useRequest, useSafeState } from 'ahooks';
import { Button, message, Select } from 'antd';
import { components } from 'proxima-sdk';
import React, { useMemo } from 'react';

import { getTopItemTypeFromHierarchy } from '@/lib/api/proxima';
import { TestType } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';

import { useCurrentTestConfig, useDataContext } from '../hooks';

const { ItemIcon } = components.Components.Common;

import { useSDK } from '@giteeteam/plugin-sdk';

import { savePanelDisplayConditions } from '@/lib/api/common';
import { judgeTestReportVersion, TEST_REPORT_VERSION } from '@/lib/appEnv';
import Parse from '@/lib/parse';
import { TestConfig } from '@/services/models';

import cx from './index.less';

const TestTypes = [
  {
    type: TestType.Case,
    title: 'testCase',
  },
  {
    type: TestType.Plan,
    title: 'testPlan',
  },
  {
    type: TestType.Execution,
    title: 'testExecution',
  },
  {
    type: TestType.CaseSet,
    title: 'testCaseSet',
  },
];

async function getAllItemType() {
  const pageSize = 350;
  const total = await new Parse.Query(TestConfig)
    .select('itemTypeMap')
    .equalTo('global', false)
    .count();
  if (total === 0) {
    return [];
  }
  const page = total / pageSize;
  const requestQueue = [];
  for (let i = 0; i <= page; i++) {
    const request = new Parse.Query(TestConfig)
      .select('itemTypeMap')
      .equalTo('global', false)
      .skip(i * pageSize)
      .limit(pageSize) as Parse.Query<Parse.Object>;
    requestQueue.push(request);
  }
  return Promise.all(requestQueue.map(request => request.find())).then(data =>
    data.reduce((prev, curr) => {
      return prev.concat(curr);
    }, []),
  );
}

const ItemTypeMapping = () => {
  const { t } = useI18n();
  const { context } = useSDK();
  const { workspace, globalConfig } = useDataContext();
  const isolatedSystem = Boolean(globalConfig?.extra?.isolatedSystem);
  const workspaceKey = workspace?.key;
  const workspaceId = workspace?.objectId;

  const [topItemTypes, setTopItemTypes] = useSafeState([]);
  const [itemTypeMapping, setItemTypeMapping] = useSafeState({} as Record<TestType, string>);

  const getAllItemTypeValues = async () => {
    const allTestConfigs = await getAllItemType();
    const allItemMapValues = allTestConfigs
      .map(config => config.toJSON())
      ?.map(config => config?.itemTypeMap)
      ?.filter(item => item && Object.keys(item).length)
      ?.map(item => Object.values(item))
      ?.flat();
    return [...new Set(allItemMapValues)];
  };

  useRequest(() => getTopItemTypeFromHierarchy(workspaceId), {
    ready: !!workspaceId,
    refreshDeps: [workspaceId],
    onSuccess(itemTypes) {
      const uniqueItemTypes = Object.values(
        itemTypes.reduce((set, itemType) => ({ ...set, [itemType.key]: itemType }), {}),
      );
      setTopItemTypes(uniqueItemTypes ?? []);
    },
  });

  const testConfig = useCurrentTestConfig(workspaceKey);

  React.useEffect(() => {
    const data = testConfig?.toJSON();
    setItemTypeMapping(data?.itemTypeMap ?? {});
  }, [setItemTypeMapping, testConfig]);

  const renderItemTypeSelector = React.useCallback(
    type => {
      const options = topItemTypes.map(itemType => ({
        label: (
          <span className={cx('item-type-selector-label')}>
            <ItemIcon className={cx('icon')} icon={itemType.icon}></ItemIcon>
            <span>{itemType.name}</span>
            <span style={{ fontSize: '0.8em', color: '#888', marginLeft: '0.5em' }}>
              ({itemType.key})
            </span>
          </span>
        ),
        value: itemType.key,
        searchValue: itemType.key + itemType.name,
      }));
      const selectedItemType = itemTypeMapping[type];
      return (
        <Select
          showSearch
          optionFilterProp="searchValue"
          options={options}
          disabled={isolatedSystem}
          onChange={val => {
            setItemTypeMapping(prev => ({
              ...prev,
              [type]: val,
            }));
          }}
          value={selectedItemType}
          placeholder={t('common.pleaseSelectType')}
          className={cx('item-type-selector')}
        ></Select>
      );
    },
    [topItemTypes, itemTypeMapping, isolatedSystem, setItemTypeMapping, t],
  );

  const tenant = useMemo(
    () => context?.env.PROXIMA_APP_ID ?? 'proxima-core',
    [context?.env.PROXIMA_APP_ID],
  );

  // 保存
  const handleSave = async () => {
    const validItemTypeMapArr = Object.values(itemTypeMapping).filter(Boolean);
    if (validItemTypeMapArr?.length < testTypes?.length) {
      return message.error(t('page.config.itemTypeMapping.pleaseSelectAllTypes'));
    }

    await testConfig?.save({
      itemTypeMap: itemTypeMapping,
    });

    // 查询所空间下的itemTypeMapping
    const allItemMapValue = await getAllItemTypeValues();

    // 调用apps接口保存显示配置
    savePanelDisplayConditions({
      applicationId: tenant,
      itemTypeValues: allItemMapValue as Array<string>,
    });

    message.success(t('page.config.itemTypeMapping.typeAssociationConfigurationSavedSuccessfully'));
  };

  const testTypes = useMemo(() => {
    return judgeTestReportVersion(TEST_REPORT_VERSION.V2)
      ? [
          ...TestTypes,
          {
            type: TestType.Report,
            title: 'testReport',
          },
        ]
      : TestTypes;
  }, []);

  return (
    <div className={cx('test-type-mapping')}>
      {testTypes.map(({ title, type }) => (
        <div className={cx('test-type-mapping-item')} key={type}>
          <h3>{t(`common.${title}`)}</h3>
          {renderItemTypeSelector(type)}
        </div>
      ))}
      <Button
        disabled={Object.keys(itemTypeMapping).length === 0 || isolatedSystem}
        type="primary"
        className={cx('action-btn')}
        onClick={handleSave}
      >
        {t('common.save')}
      </Button>
    </div>
  );
};

export default ItemTypeMapping;
