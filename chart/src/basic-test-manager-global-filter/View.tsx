import { Select } from 'antd';
import { cloneDeep, isEqual } from 'lodash';
import { SingleEvents } from 'proxima-event';
import { DebounceSelect } from 'proxima-sdk/components/Components/Common';
import { useI18n } from 'proxima-sdk/hooks/Hooks';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { t as chartT } from '../i18n';
import Cache, { CACHE_KEY } from '../lib/cache';
import { BASIC_EMITTER_EVENTS } from '../lib/global';
import { AllGlobalIqlFilterConds, ViewProps } from '../lib/type';
import {
  formatterIql,
  getTestEntityByIds,
  getTestEntityByName,
  TEST_MANAGER_SELECTOR,
  TEST_MANAGER_TYPE,
} from './util';
import cx from './View.less';

const View: React.FC<ViewProps> = ({
  setOption,
  option,
  charts,
  uid,
  isListView,
  chartOption,
  workspace,
}) => {
  const i18n = useI18n();

  const [onlyWorkspaceForPlan, setOnlyWorkspaceForPlan] = useState(!!workspace);
  const [onlyWorkspaceForExecution, setOnlyWorkspaceForExecution] = useState(!!workspace);
  const [executionSelectKey, setExecutionSelectKey] = useState(new Date().getTime());

  const chartsOptions = useMemo(() => {
    return charts
      .filter(chart => !chart.view.includes('filter') && !chart.view.includes('insight')) // 过滤自身及离线图表
      .map(chart => ({ label: chart.name, value: chart.uid || chart.objectId }));
  }, [charts]);

  const planValues = useMemo(() => {
    const targetOption = isListView ? option : chartOption;
    const values = targetOption?.[TEST_MANAGER_SELECTOR.TEST_PLAN];
    return values || [];
  }, [chartOption, option, isListView]);

  const executionValues = useMemo(() => {
    const targetOption = isListView ? option : chartOption;
    const values = targetOption?.[TEST_MANAGER_SELECTOR.TEST_EXECUTION];
    return values || [];
  }, [chartOption, option, isListView]);

  // 筛选器图表名字
  const filterName = useMemo(() => {
    return charts?.find(chart => chart?.uid || chart?.objectId == uid)?.name;
  }, [charts, uid]);

  const getTestPlanByName = useCallback(
    async name => {
      return getTestEntityByName({
        name,
        onlyWorkspace: onlyWorkspaceForPlan,
        workspace,
        type: TEST_MANAGER_TYPE.TEST_PLAN,
      });
    },
    [onlyWorkspaceForPlan, workspace],
  );

  const getTestPlanByIds = useCallback(async ids => {
    return getTestEntityByIds({
      ids,
      type: TEST_MANAGER_TYPE.TEST_PLAN,
    });
  }, []);

  const onTestPlanSelectChange = useCallback(
    values => {
      setOption(prevOption => {
        return {
          ...prevOption,
          [TEST_MANAGER_SELECTOR.TEST_PLAN]: values,
          iql: formatterIql(values, prevOption[TEST_MANAGER_SELECTOR.TEST_EXECUTION]),
        };
      });
      setExecutionSelectKey(new Date().getTime());
    },
    [setOption],
  );

  const getTestExecutionByName = useCallback(
    async name => {
      if (!planValues?.length) return [];

      return getTestEntityByName({
        name,
        onlyWorkspace: onlyWorkspaceForExecution,
        workspace,
        type: TEST_MANAGER_TYPE.TEST_EXECUTION,
        linkItems: planValues,
      });
    },
    [onlyWorkspaceForExecution, workspace, planValues],
  );

  const getTestExecutionByIds = useCallback(async ids => {
    return getTestEntityByIds({
      ids,
      type: TEST_MANAGER_TYPE.TEST_PLAN,
    });
  }, []);

  const onTestExecutionSelectChange = useCallback(
    values => {
      setOption(prevOption => {
        return {
          ...prevOption,
          [TEST_MANAGER_SELECTOR.TEST_EXECUTION]: values,
          iql: formatterIql(values, prevOption[TEST_MANAGER_SELECTOR.TEST_PLAN]),
        };
      });
    },
    [setOption],
  );

  const onRelatedChartsChange = useCallback(
    (selectedCharts, selectedChartsOptions) => {
      setOption(prevOption => ({
        ...prevOption,
        selectedCharts,
        selectedChartsOptions,
      }));
    },
    [setOption],
  );

  const updateGlobalFilter = useCallback(() => {
    console.info('----------filterName', option);
    const { iql, selectedChartsOptions, selectors } = option;
    // 所有已缓存的筛选器的筛选条件
    const allCacheIqlFilterConds: AllGlobalIqlFilterConds =
      Cache.getCacheItem(CACHE_KEY.BASE_GLOBAL_SEARCH_IQL_CONDS) || {};

    console.info('allCacheIqlFilterConds', allCacheIqlFilterConds);
    if (!uid || !filterName) return;

    const prevConfig = allCacheIqlFilterConds[uid];

    let relatedCharts = {};

    if (selectedChartsOptions?.length) {
      relatedCharts = selectedChartsOptions.reduce((result, item) => {
        result[item.value] = {
          id: item.value,
          name: item.label,
        };
        return result;
      }, {});
    }

    const currentConfig = {
      iql,
      filterName,
      relatedCharts,
      selectors,
      queryType: 'expression',
    };
    if (isEqual(prevConfig, currentConfig)) return;

    const newConds = cloneDeep(allCacheIqlFilterConds);

    newConds[uid] = currentConfig;

    const eventEmitter = SingleEvents.getInstance();
    console.info('updateGlobalConfig');
    Cache.setCacheItem(CACHE_KEY.BASE_GLOBAL_SEARCH_IQL_CONDS, newConds);

    eventEmitter.fire(BASIC_EMITTER_EVENTS.BASIC_GLOBAL_FILTER_SEARCH, newConds);
  }, [option, uid, filterName]);

  useEffect(() => {
    console.info('useLayoutEffect');
    const chart = charts.find(c => (c.uid && c.uid === uid) || c.objectId === uid);
    if (chart && !chart.isRendered && isListView) {
      updateGlobalFilter();
    }
  }, [charts, uid, isListView, updateGlobalFilter]);

  return (
    <div style={{ padding: '40px 20px 0 20px', height: '100%', overflow: 'auto' }}>
      <div className={cx('test-manager-query')}>
        <DebounceSelect
          maxTagCount="responsive"
          showSearch
          allowClear
          mode="multiple"
          displayWorkspace
          onlyWorkspace={onlyWorkspaceForPlan}
          isShowOnlyWorkspace={!!workspace}
          setOnlyWorkspace={setOnlyWorkspaceForPlan}
          className={cx('select')}
          placeholder={chartT('testPlanPlaceholder')}
          fieldTypeKey="TestPlan"
          fetchOptions={getTestPlanByName}
          fetchValues={getTestPlanByIds}
          value={planValues}
          onChange={value => {
            onTestPlanSelectChange(value);
          }}
        />

        <DebounceSelect
          key={executionSelectKey}
          maxTagCount="responsive"
          showSearch
          allowClear
          mode="multiple"
          displayWorkspace
          onlyWorkspace={onlyWorkspaceForExecution}
          isShowOnlyWorkspace={!!workspace}
          setOnlyWorkspace={setOnlyWorkspaceForExecution}
          className={cx('select')}
          placeholder={chartT('testExecutionPlaceholder')}
          fieldTypeKey="TestExecution"
          fetchOptions={getTestExecutionByName}
          fetchValues={getTestExecutionByIds}
          value={executionValues}
          onChange={value => {
            onTestExecutionSelectChange(value);
          }}
        />
      </div>
      <Select
        mode="multiple"
        showArrow
        value={isListView ? option.selectedCharts : chartOption.selectedCharts}
        maxTagCount="responsive"
        placeholder={i18n.t('reportPlugin.basicGlobalFilter.chartsChooseTips')}
        style={{ width: 400, marginTop: 10 }}
        filterOption={(input, option) => {
          return String(option?.label ?? '')
            .toLowerCase()
            .includes(input.toLowerCase());
        }}
        options={chartsOptions}
        onChange={onRelatedChartsChange}
      />
    </div>
  );
};

export default View;
