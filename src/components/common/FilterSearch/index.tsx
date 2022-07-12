import React, {
  useCallback,
  useState,
  useRef,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from 'react';
import SearchInput from './SearchInput';
import { Button } from 'antd';
import AddFilterIcon from '@/icons/svg/add-filter.svg';
import { openFilterPopover, openFieldValuePopover } from '@/lib/api/sdk';
import { useTestConfig } from '@/lib/hooks/useContext';
import { values, cloneDeep, omit, pick } from 'lodash';
import cx from './index.less';
import SelectorTag from './SelectorTag';
import { Selectors, isDate, SearchSelectors } from '@/lib/utils/iql';
import dayjs from 'dayjs';
import { extendFields as systemExtendFields, RepositoryModel } from '@/lib/constants';
import { Repository } from '@/lib/models';
import { useDebounceFn } from 'ahooks';

interface FilterSearchProps {
  fields: string[];
  onSearch: (data: SearchSelectors) => void;
  extendFields: any[];
}

interface FilterRefMethod {
  reset: () => void;
}

const FilterSearch: React.ForwardRefRenderFunction<FilterRefMethod, FilterSearchProps> = (
  { fields, onSearch, extendFields },
  ref,
) => {
  const { workspace } = useTestConfig();
  const [search, setSearch] = useState('');
  const [selectors, setSelectors] = useState<Selectors>({});
  const currentSelectors = useRef<Selectors>({});

  useImperativeHandle(ref, () => ({
    reset: () => {
      setSearch('');
      handleSetSelectors({});
    },
  }));

  const handleSetSelectors = useCallback(data => {
    setSelectors(data);
    currentSelectors.current = data;
  }, []);

  const searchFn = useCallback(() => {
    const ids = extendFields.map(item => item.key);
    // 事项的字段
    const itemSelector = omit(currentSelectors.current, ids);
    // 测试管理的字段
    const testManageSelector = pick(currentSelectors.current, ids);
    onSearch([itemSelector, testManageSelector]);
  }, [extendFields, onSearch]);

  const { run: handleSearch } = useDebounceFn(searchFn, { wait: 300 });

  const onChangeInput = useCallback(
    value => {
      setSearch(value);
      // 往selectors中塞name
      const data = cloneDeep(currentSelectors.current);
      data.name = {
        isExtend: false,
        component: 'name',
        expression: '',
        fieldId: 'name',
        fieldName: '标题',
        key: 'name',
        value,
      };
      handleSetSelectors(data);
      handleSearch();
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
      const fieldId = data.objectId || data.key;
      const props = {
        isExtend: data?.isExtend,
        fieldKey: data?.key,
        field: systemExtendFields.find(item => item.key === fieldId),
        value: data?.value,
        workspace: workspace?.objectId,
        onChange: updateSelectorValue,
        onClose: handleSearch,
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
    <div className={cx('filter-search-wrap')}>
      <SearchInput onChange={onChangeInput} placeholder="请输入标题关键字/事项ID" value={search} />
      {currentSelector
        ?.filter(item => item?.fieldId !== 'name')
        .map(item => (
          <SelectorTag
            key={item?.fieldId}
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
    </div>
  );
};

export default forwardRef(FilterSearch);
