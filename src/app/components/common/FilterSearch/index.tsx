import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  forwardRef,
  useCallback,
  useImperativeHandle,
} from 'react';
import { useNoExpiredRequest } from '@/lib/hooks/useRequest';
import SearchInput from './SearchInput';
import { Button } from 'antd';
import AddFilterIcon from '@/icons/svg/add-filter.svg';
import { openFilterPopover, openFieldValuePopover } from '@/lib/api/sdk';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
import { values, cloneDeep, omit, pick } from 'lodash';
import SelectorTag from './SelectorTag';
import { Selectors, isDate, SearchSelectors } from '@/lib/utils/iql';
import dayjs from 'dayjs';
import {
  RepositoryModel,
  SelectorCurrentUserValue,
  UserTypeSelectorFieldKeys,
  getExtendFields,
  TestType,
  IS_EXTEND_FIELDS,
  TestCaseStatusModel,
} from '@/lib/constants';
import { Repository } from '@/lib/models';
import { useDebounceFn, useMemoizedFn, useRequest } from 'ahooks';
import { useGetCustomFields } from '../BusinessTable/hook';
import { useListener } from '@projectproxima/proxima-sdk-js';
import { getTestConfig } from '@/lib/api/common';
import { getCurrentUserSetting } from '@/lib/api/userSetting';
import useI18n from '@/lib/hooks/useI18n';
import { useLocation } from 'react-router-dom';
import { generateStorageKey } from '@/lib/utils/helper';

import cx from './index.less';

interface FilterSearchProps {
  fields: string[];
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
const useSelectorStorage = (enableLocalStorage, { selectors, setSelectors, storageKey = '' }) => {
  const location = useLocation();
  const key = generateStorageKey('selector-' + storageKey + location.pathname);

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
      setSelectors(storageSelectors);
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
  },
  ref,
) => {
  const { t } = useI18n();
  const { workspace } = useTestConfig();
  const [search, setSearch] = useState('');
  const { getGlobalConfig, testPlanFieldKeys, testCaseFieldKeys } = useBaseAction();
  const [selectors, setSelectorsState] = useState<Selectors>({});
  const currentSelectors = useRef<Selectors>({});
  const [activeSelector, setActiveSelector] = useState('');

  const setSelectors = useMemoizedFn(selectors => {
    setSelectorsState(selectors);
    currentSelectors.current = selectors;
  });

  const setSelectorsFromStorageValue = useMemoizedFn(selectors => {
    setSelectors(selectors);
    searchFn(true);
  });

  const customFields = useGetCustomFields({
    filedKeys: testType === TestType.Plan ? testPlanFieldKeys : testCaseFieldKeys,
  });

  const customFieldsKey = useMemo(() => customFields?.map(d => d.key), [customFields]);

  const defaultSelectors = useMemo(() => {
    if (checkedFields?.length && customFields?.length) {
      return checkedFields.reduce((prev, cur) => {
        const data = customFields.find(d => cur === d.key) ?? {};
        prev[data.objectId] = {
          component: data.fieldType.component,
          expression: data.fieldType.expression,
          isExtend: data.fieldType.isExtend,
          key: data.key,
          fieldId: data.objectId,
          fieldName: data.name,
          value: undefined,
        };
        return prev;
      }, {});
    }
  }, [customFieldsKey?.toString(), checkedFields?.toString()]);

  // 将 selector 存储到 localStorage
  useSelectorStorage(enableLocalStorage, {
    selectors,
    setSelectors: setSelectorsFromStorageValue,
    storageKey,
  });

  useEffect(() => {
    if (defaultSelectors) {
      setSelectors({
        ...defaultSelectors,
        ...selectors,
      });
    }
  }, [defaultSelectors]);

  const { data: fieldsName, refresh } = useRequest(
    async () => {
      if (!workspace?.key) return null;
      const defaultKeys = testType === TestType.Case ? ['key'] : [];
      const testConfig = await getTestConfig({ workspaceKey: workspace?.key });

      const { serachFields } = testConfig?.toJSON()?.tableFields?.[testType] ?? {};

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
      refreshDeps: [workspace?.key, testType, customFields],
      cacheKey: `fieldsName_${workspace?.key ?? ''}_${testType}_${customFields
        ?.map(d => d.key)
        .toString()}`,
      cacheTime: 99999,
      staleTime: 99999,
    },
  );

  useListener('updateFilterSearchFields', () => {
    setTimeout(() => {
      refresh();
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
      setSelectors(data);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, JSON.stringify(fieldsName)],
  );

  const { data: currentUser } = useNoExpiredRequest(
    async () => {
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
      // 事项的字段，首次加载不需要过滤
      const itemSelector = initial ? currentSelectorsValue : omit(currentSelectorsValue, ids);
      // 测试管理的字段
      const testManageSelector = initial ? currentSelectorsValue : pick(currentSelectorsValue, ids);

      Object.entries(testManageSelector).forEach(selector => {
        const [selectorKey, data] = selector;
        if (UserTypeSelectorFieldKeys.includes(selectorKey)) {
          if (Array.isArray(data.value)) {
            data.value = data.value.map(user => {
              // currentUser 需要替换成当前用户的id
              if (user.value === SelectorCurrentUserValue) {
                return {
                  ...user,
                  value: currentUser.objectId,
                };
              }
              return user;
            });
          }
        }
      });

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
    const globalConfig = await getGlobalConfig();
    return globalConfig?.statuses.map(item => ({
      value: item.key,
      label: t(`status.${item.key}.name`),
    }));
  }, [getGlobalConfig, t]);

  // 组装打开字段值选择器的函数
  const getFieldValueProps = useCallback(
    (data, dom) => {
      const fieldId = data.fieldId;
      const systemTarget = getExtendFields(t).find(item => item.objectId === fieldId);
      const isExtend = IS_EXTEND_FIELDS.includes(data.component);
      const component = IS_EXTEND_FIELDS.includes(data.component) ? data.component : data.key;
      setActiveSelector(fieldId);
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
          setActiveSelector('');
          handleSearch();
        },
        expression: data.expression,
        dom,
      };
      if (fieldId === RepositoryModel) {
        (props as any).fetchMethod = () => extendFetch();
      }
      if (fieldId === TestCaseStatusModel) {
        (props as any).fetchMethod = () => getStatusOptions();
      }
      return props;
    },
    [extendFetch, handleSearch, updateSelectorValue, workspace?.objectId, getStatusOptions, t],
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
    const item = values(selectors).map(item => ({
      ...item,
      name: item?.fieldName,
      objectId: item?.fieldId,
      active: Array.isArray(item.value) ? !!item.value?.length : !!item.value,
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
