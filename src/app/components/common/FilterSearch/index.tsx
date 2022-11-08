import React, {
  useCallback,
  useState,
  useRef,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { useNoExpiredRequest } from '@/lib/hooks/useRequest';
import SearchInput from './SearchInput';
import { Button } from 'antd';
import AddFilterIcon from '@/icons/svg/add-filter.svg';
import { openFilterPopover, openFieldValuePopover } from '@/lib/api/sdk';
import { useTestConfig } from '@/lib/hooks/useContext';
import { values, cloneDeep, omit, pick } from 'lodash';
import SelectorTag from './SelectorTag';
import { Selectors, isDate, SearchSelectors } from '@/lib/utils/iql';
import dayjs from 'dayjs';
import {
  RepositoryModel,
  SelectorCurrentUserValue,
  UserTypeSelectorFieldKeys,
  extendFields as systemExtendFields,
  TestType,
} from '@/lib/constants';
import { Repository } from '@/lib/models';
import { useDebounceFn, useRequest } from 'ahooks';
import { useGetcustomFields } from '../BusinessTable/hook';
import { useListener } from '@projectproxima/proxima-sdk-js';

import cx from './index.less';
import { getTestConfig } from '@/lib/api/common';
import { getCurrentUserSetting } from '@/lib/api/userSetting';

interface FilterSearchProps {
  fields: string[];
  onSearch: (data: SearchSelectors) => void;
  extendFields: any[];
  className?: string;
  testType?: TestType;
  hideSelectorTag?: boolean;
}

interface FilterRefMethod {
  reset: () => void;
}

const FilterSearch: React.ForwardRefRenderFunction<FilterRefMethod, FilterSearchProps> = (
  { fields, onSearch, extendFields, className, testType, hideSelectorTag },
  ref,
) => {
  const { workspace } = useTestConfig();
  const [search, setSearch] = useState('');
  const [selectors, setSelectors] = useState<Selectors>({});
  const currentSelectors = useRef<Selectors>({});
  const [activeSelector, setActiveSelector] = useState('');

  const customFields = useGetcustomFields({
    workspaceKey: workspace?.key,
    testType,
  });

  const { data: fieldsName, refresh } = useRequest(
    async () => {
      if (!workspace?.key) return null;
      const defaultFields = testType === TestType.Plan ? [] : ['key'];
      const testConfig = await getTestConfig({ workspaceKey: workspace?.key });

      const { serachFields } = testConfig?.toJSON()?.tableFields?.[testType] ?? {};

      const res = await getCurrentUserSetting({
        workspaceKey: workspace?.key,
      });

      const filterFields = res?.filterFields?.[testType] ?? [];
      const fields = filterFields?.length ? filterFields : serachFields ?? defaultFields;

      const fieldsName = customFields
        ?.filter(field => [...new Set([...fields])].includes(field.key))
        .map(field => field.name)
        .filter(Boolean)
        .join(',');

      return fieldsName;
    },
    {
      ready: Boolean(workspace?.key),
      refreshDeps: [workspace?.key, testType, customFields],
    },
  );

  useListener('updateFilterSearchFields', () => {
    refresh();
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
        fieldLabel: fieldsName?.split(',').filter(Boolean),
      };
      setSelectors(data);
      currentSelectors.current = data;
    },
    [search, fieldsName],
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

  const searchFn = useCallback(() => {
    const ids = extendFields.map(item => item.key);
    // 事项的字段
    const itemSelector = omit(currentSelectors.current, ids);
    // 测试管理的字段
    const testManageSelector = pick(currentSelectors.current, ids);

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
  }, [extendFields, onSearch, currentUser]);

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

  // 组装打开字段值选择器的函数
  const getFieldValueProps = useCallback(
    (data, dom) => {
      const fieldId = data.fieldId;
      const systemTarget = systemExtendFields.find(item => item.objectId === fieldId);
      setActiveSelector(fieldId);
      const props = {
        isExtend: systemTarget?.fieldType?.isExtend,
        fieldId,
        field: systemTarget || {
          fieldType: { component: data.key, label: data.fieldName },
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
      return props;
    },
    [extendFetch, handleSearch, updateSelectorValue, workspace?.objectId],
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
      <SearchInput onChange={onChangeInput} placeholder="请输入检索项关键字" value={search} />
      {currentSelector
        ?.filter(item => item?.fieldId !== 'name')
        .map(item => (
          <SelectorTag
            key={item?.fieldId}
            active={item?.fieldId === activeSelector}
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
          id="filter-btn"
          icon={<AddFilterIcon className={cx('filter-tag-icon')} />}
          className={cx('filter-tag-btn')}
          onClick={() => {
            openFilterPopover({
              selectors,
              fields,
              onChange: onFilterChange,
              extendFields,
              dom: document.querySelector('#filter-btn'),
            });
          }}
        >
          <span className={cx('filter-tag-btn-text')}>筛选</span>
        </Button>
      )}
    </div>
  );
};

export default forwardRef(FilterSearch);
