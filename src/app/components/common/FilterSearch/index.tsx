import { useSDK } from '@projectproxima/plugin-sdk';
import { useListener } from '@projectproxima/proxima-sdk-js';
import { useDebounceFn, useMemoizedFn, useRequest } from 'ahooks';
import { Button } from 'antd';
import dayjs from 'dayjs';
import { cloneDeep, omit, pick, values } from 'lodash';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';

import AddFilterIcon from '@/icons/svg/add-filter.svg';
import { getTestConfig } from '@/lib/api/common';
import { openFieldValuePopover, openFilterPopover } from '@/lib/api/sdk';
import { getCurrentUserSetting } from '@/lib/api/userSetting';
import { CurrentWorkspaceConfigStorageKey } from '@/lib/constants';
import {
  FILTER_EXPRESSIONS,
  getExtendFields,
  IS_EXTEND_FIELDS,
  ItemUserTypeComponentKey,
  RepositoryModel,
  SelectorCurrentUserValue,
  TestCaseStatusModel,
  TestType,
  UserTypeSelectorFieldKeys,
} from '@/lib/constants';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { useNoExpiredRequest } from '@/lib/hooks/useRequest';
import { generateStorageKey } from '@/lib/utils/helper';
import { isDate, SearchSelectors, Selectors } from '@/lib/utils/iql';
import { Repository } from '@/services/models';

import { useGetCustomFields } from '../BusinessTable/hook';
import cx from './index.less';
import SearchInput from './SearchInput';
import SelectorTag from './SelectorTag';
import { handleDataSelector } from './utils';

interface FilterSearchProps {
  fields: string[];
  workspaceKey?: string;
  onSearch: (data: SearchSelectors) => void;
  beforeSearch?: (v: Record<string, any>) => void;
  extendFields?: any[];
  className?: string;
  testType?: TestType;
  hideSelectorTag?: boolean;
  /** 持久化数据 */
  enableLocalStorage?: boolean;
  checkedFields?: string[];
  filterId?: string;
  storageKey?: string;
}

interface FilterRefMethod {
  reset: () => void;
}

// 生成存储器
const useSelectorStorage = (
  enableLocalStorage,
  { selectors, setSelectors, storageKey = '', workspaceKey = '' },
) => {
  const location = useLocation();
  const key = generateStorageKey('selector-' + workspaceKey + storageKey + location.pathname);

  const invokeRef = React.useRef(false);

  const storage = useMemo(
    () => ({
      get: () => JSON.parse(localStorage.getItem(key)),
      set: value => localStorage.setItem(key, JSON.stringify(value)),
    }),
    [key],
  );

  const isEmptySelectors = !selectors || !Object.keys(selectors).length;

  useEffect(() => {
    const storageSelectors = enableLocalStorage ? storage.get() : null;

    if (!invokeRef.current && isEmptySelectors && storageSelectors) {
      invokeRef.current = true;
      setSelectors(handleDataSelector(storageSelectors));
    }
  }, [selectors, setSelectors, enableLocalStorage, storage, isEmptySelectors]);

  // 存储 selectors state
  useEffect(() => {
    if (enableLocalStorage && !isEmptySelectors) {
      storage.set(selectors);
    }
  }, [selectors, enableLocalStorage, storage, isEmptySelectors]);
};

const FilterSearch: React.ForwardRefRenderFunction<FilterRefMethod, FilterSearchProps> = (
  {
    fields,
    onSearch,
    extendFields = [],
    className,
    testType,
    checkedFields,
    hideSelectorTag,
    enableLocalStorage,
    filterId,
    storageKey,
    workspaceKey,
  },
  ref,
) => {
  const { t } = useI18n();
  const { workspace } = useTestConfig();
  const { context } = useSDK();
  const [search, setSearch] = useState('');
  const { globalTestConfig, testPlanFieldKeys, testCaseFieldKeys, testExecutionFieldKeys } =
    useBaseAction();
  const [selectors, setSelectorsState] = useState<Selectors>({});
  const currentSelectors = useRef<Selectors>({});
  const [fieldsNameRequestTag, setFieldsNameRequestTag] = React.useState(1);

  const setSelectors = useMemoizedFn(selectors => {
    setSelectorsState(selectors);
    currentSelectors.current = selectors;
  });

  const setSelectorsFromStorageValue = useMemoizedFn(selectors => {
    setSelectors(handleDataSelector(selectors));
    searchFn(true);
  });

  const customFields = useGetCustomFields({
    filedKeys:
      testType === TestType.Plan
        ? testPlanFieldKeys
        : testType === TestType.Execution
        ? testExecutionFieldKeys
        : testCaseFieldKeys,
  });

  const customFieldsKey = useMemo(() => customFields?.map(d => d.key), [customFields]);

  const getExpression = useCallback(
    (component, key) => {
      return (FILTER_EXPRESSIONS(t)?.[component] ?? FILTER_EXPRESSIONS(t)?.[key])?.[0].value;
    },
    [t],
  );

  const defaultSelectors = useMemo(() => {
    if (checkedFields?.length && customFields?.length) {
      return checkedFields.reduce((prev, cur) => {
        const data = customFields.find(d => cur === d.key) ?? {};
        prev[data.objectId] = {
          component: data.fieldType.component,
          expression: null,
          isExtend: data.fieldType.isExtend,
          key: data.key,
          fieldId: data.objectId,
          fieldName: data.name,
          value: undefined,
        };
        return prev;
      }, {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customFieldsKey?.toString(), checkedFields?.toString()]);

  // 将 selector 存储到 localStorage
  useSelectorStorage(enableLocalStorage, {
    // 持久化数据，移除 name 字段
    selectors: omit(selectors, ['name']),
    setSelectors: setSelectorsFromStorageValue,
    storageKey,
    workspaceKey,
  });

  useEffect(() => {
    if (defaultSelectors) {
      setSelectors(
        handleDataSelector({
          ...defaultSelectors,
          ...selectors,
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSelectors]);

  const customFieldsToken = customFields?.map(i => i.key).toString();

  const { data: fieldsName } = useRequest(
    async () => {
      if (!workspace?.key) return null;
      const defaultKeys = testType === TestType.Case ? ['key'] : [];
      let testConfig = null;
      // 先查本地存储
      const localConfig = localStorage.getItem(CurrentWorkspaceConfigStorageKey);
      if (localConfig) {
        testConfig = JSON.parse(localConfig);
      } else {
        const data = await getTestConfig({ workspaceKey: workspace?.key });
        testConfig = data?.toJSON();
      }

      const { serachFields } = testConfig?.tableFields?.[testType] ?? {};

      const res = await getCurrentUserSetting({
        workspaceKey: workspace?.key,
      });

      const filterFields = res?.filterFields?.[testType];
      const fieldsKey = filterFields ?? serachFields ?? defaultKeys;

      const fieldsName = customFields
        ?.filter(field => [...new Set(fieldsKey)].includes(field.key))
        .map(field => field.name)
        .filter(Boolean);

      return fieldsName;
    },
    {
      ready: Boolean(workspace?.key),
      refreshDeps: [fieldsNameRequestTag, workspace?.key, testType, customFieldsToken],
    },
  );

  useListener('updateFilterSearchFields', () => {
    setTimeout(() => {
      // 强制更新 fieldsName
      setFieldsNameRequestTag(prev => prev + 1);
    }, 400);
  });

  useImperativeHandle(ref, () => ({
    reset: () => {
      setSearch('');
      handleSetSelectors({});
    },
  }));

  const handleSetSelectors = useCallback(
    (data, searchValue?) => {
      // 因为name字段不在筛选器中维护，要手动合并name
      data.name = {
        isExtend: false,
        component: 'name',
        expression: '',
        fieldId: 'name',
        fieldName: '标题',
        key: 'name',
        value: searchValue === undefined ? search : searchValue,
        fieldLabel: fieldsName,
      };
      setSelectors(handleDataSelector(data));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, JSON.stringify(fieldsName)],
  );

  const { data: currentUser } = useNoExpiredRequest(
    async () => {
      if (context.currentUser) return context.currentUser;
      const currentUserObject = await Parse.User.current();
      return currentUserObject?.toJSON();
    },
    {
      cacheKey: 'currentUser',
    },
  );

  const searchFn = useCallback(
    (initial?: boolean) => {
      const ids = extendFields.map(item => item.key);
      const currentSelectorsValue = currentSelectors.current;

      Object.entries(currentSelectorsValue).forEach(selector => {
        const [selectorKey, data] = selector;
        if (
          UserTypeSelectorFieldKeys.includes(selectorKey) ||
          ItemUserTypeComponentKey.includes(data.component)
        ) {
          if (Array.isArray(data.value)) {
            data.value = data.value.map(user => {
              // currentUser 需要替换成当前用户的id
              if (user.value === SelectorCurrentUserValue) {
                return {
                  ...user,
                  value: currentUser.objectId,
                  username: currentUser.username,
                };
              }
              return user;
            });
          }
        }
      });

      // 事项的字段，首次加载不需要过滤
      const itemSelector = initial ? currentSelectorsValue : omit(currentSelectorsValue, ids);
      // 测试管理的字段
      const testManageSelector = initial ? currentSelectorsValue : pick(currentSelectorsValue, ids);

      onSearch([itemSelector, testManageSelector]);
    },
    [extendFields, onSearch, currentUser],
  );

  const { run: handleSearch } = useDebounceFn(searchFn, { wait: 300 });

  const onChangeInput = useCallback(
    value => {
      setSearch(value);
      // 往selectors中塞name
      const data = cloneDeep(currentSelectors.current);
      handleSetSelectors(data, value);
      // 避免查数据的时候，拿不到最新的iql
      setTimeout(() => {
        handleSearch();
      }, 200);
    },
    [handleSearch, handleSetSelectors],
  );

  const updateSelectorValue = useCallback(
    selector => {
      const data = cloneDeep(currentSelectors.current);
      const target = data[selector.objectId];
      if (target) {
        target.value = selector.value;
        target.expression = selector.expression;
        handleSetSelectors(data);
      }
    },
    [handleSetSelectors],
  );

  // 获取各个层级
  const getStructure = useCallback(data => {
    const recursion = (child, path) => {
      if (!parent) return path;
      const parentData = data.find(item => item.objectId === child?.parent?.objectId);
      if (!parentData) return path;
      path = `${parentData.name} > ${path}`;
      return recursion(parentData, path);
    };
    return data?.map(item => {
      return {
        ...item,
        label: item.name,
        value: item.objectId,
        toolTip: recursion(item, item.name),
      };
    });
  }, []);

  const extendFetch = useCallback(async () => {
    const query = new Parse.Query(Repository);
    query.equalTo('workspaceKey', workspace?.key);
    const data = await query.findAll();
    return getStructure(data?.map(item => item.toJSON()) || []);
  }, [getStructure, workspace?.key]);

  const getStatusOptions = useCallback(async () => {
    return globalTestConfig?.statuses.map(item => ({
      value: item.key,
      label: t(`status.${item.key}.name`),
    }));
  }, [globalTestConfig, t]);

  // 组装打开字段值选择器的函数
  const getFieldValueProps = useCallback(
    (data, dom) => {
      const fieldId = data.fieldId;
      const systemTarget = getExtendFields(t).find(item => item.objectId === fieldId);
      const isExtend = IS_EXTEND_FIELDS.includes(data.component);
      const component = IS_EXTEND_FIELDS.includes(data.component) ? data.component : data.key;
      const expression = data.expression ?? getExpression(data.component, data.key);

      // setActiveSelector(fieldId);
      const props = {
        isExtend: systemTarget?.fieldType?.isExtend ?? isExtend,
        fieldId,
        field: systemTarget || {
          fieldType: {
            component: component,
            label: data.fieldName,
            key: data.key,
          },
        },
        value: data?.value,
        label: data?.fieldName,
        workspace: workspace?.objectId,
        onChange: updateSelectorValue,
        onClose: () => {
          // setActiveSelector('');
          handleSearch();
        },
        expression,
        dom,
        useChange: false,
      };
      if (fieldId === RepositoryModel) {
        (props as any).fetchMethod = () => extendFetch();
      }
      if (fieldId === TestCaseStatusModel) {
        (props as any).fetchMethod = () => getStatusOptions();
      }

      return props;
    },
    [
      t,
      getExpression,
      workspace?.objectId,
      updateSelectorValue,
      handleSearch,
      extendFetch,
      getStatusOptions,
    ],
  );

  const onFilterChange = useCallback(
    (data, filterId) => {
      handleSetSelectors(data);
      const filterDetail = data?.[filterId];
      // 得等上一个popover注销完，才能打开新的popover
      setTimeout(() => {
        if (filterId && filterDetail) {
          const props = getFieldValueProps(
            filterDetail,
            document.querySelector(`#filter-search-selector-${filterId}`),
          );
          // 打开值的选择器
          openFieldValuePopover(props as any);
        }
        if (!filterId) {
          // 删除参数-执行重新查询
          handleSearch();
        }
      }, 500);
    },
    [handleSetSelectors, getFieldValueProps, handleSearch],
  );

  const currentSelector = useMemo(() => {
    const getExpression = (value, expression) => {
      if (typeof value === 'number') {
        return value ? expression : null;
      }
      return value?.length ? expression : null;
    };
    const item = values(selectors).map(item => ({
      ...item,
      name: item?.fieldName,
      objectId: item?.fieldId,
      active: Array.isArray(item.value) ? !!item.value?.length : !!item.value,
      expression: getExpression(item?.value, item.expression),
    }));
    return item || [];
  }, [selectors]);

  const onDeleteSelector = useCallback(
    id => {
      const data = cloneDeep(selectors);
      delete data[id];
      handleSetSelectors(data);
      handleSearch();
    },
    [handleSearch, handleSetSelectors, selectors],
  );

  const generateFieldValue = useCallback(data => {
    return isDate(data.key) ? (data.value as string[])?.map(item => dayjs(item)) : data.value;
  }, []);

  return (
    <div className={cx('filter-search-wrap', `${className ?? ''}`)}>
      <SearchInput
        onChange={onChangeInput}
        placeholder={t('components.common.filterSearch.screenPlaceholder')}
        value={search}
      />
      {currentSelector
        ?.filter(item => item?.fieldId !== 'name')
        .map(item => (
          <SelectorTag
            key={item?.fieldId}
            active={item?.active}
            data={item}
            onClick={data => {
              const backup = cloneDeep(data);
              backup.value = generateFieldValue(backup);
              const props = getFieldValueProps(
                backup,
                document.querySelector(`#filter-search-selector-${item?.fieldId}`),
              );
              openFieldValuePopover(props as any);
            }}
            onDelete={onDeleteSelector}
          />
        ))}
      {!hideSelectorTag && (
        <Button
          id={filterId || 'filter-btn'}
          icon={<AddFilterIcon className={cx('filter-tag-icon')} />}
          className={cx('filter-tag-btn')}
          onClick={() => {
            openFilterPopover({
              selectors,
              fields,
              onChange: onFilterChange,
              extendFields,
              dom: document.querySelector(`#${filterId || 'filter-btn'}`),
            });
          }}
        >
          <span className={cx('filter-tag-btn-text')}>
            {t('components.common.filterSearch.screen')}
          </span>
        </Button>
      )}
    </div>
  );
};

export default forwardRef(FilterSearch);
