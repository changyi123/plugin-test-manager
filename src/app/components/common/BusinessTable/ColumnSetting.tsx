/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react';
import { keyBy, noop } from 'lodash';
import { TitleCellOption } from './type';
import { ColumnType } from 'antd/lib/table';
import { Button, Drawer, message, Select, Spin, Tooltip } from 'antd';
import { getCustomFields } from '@/lib/api/proxima';
import { useGetTableFilterFields, useTestTypeScreenFieldKeys } from './hook';
import { TableCell } from '@projectproxima/components';
import { generateStorageKey } from '@/lib/utils/helper';
import { useNoExpiredRequest } from '@/lib/hooks/useRequest';
import { useDeepCompareEffect, useLocalStorageState, useUpdateEffect } from 'ahooks';
import { useFieldsWithFieldCellProps } from '@/lib/hooks/useProxima';
import {
  DragHandler,
  QuestionCircleOutlined,
  Setting,
  AddSearch,
  DeleteSearch,
  DeleteIcon,
} from '@/icons';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import createProximaSdk from '@projectproxima/proxima-sdk-js';
import OverflowTooltip from '@/components/common/OverflowTooltip';

import '@projectproxima/components/dist/main.css';
import cx from './ColumnSetting.less';

type ColumnDuckTyping = ColumnType<any> & Record<string, any>;

type ColumnSettingProps = TitleCellOption & {
  name?: string;
  className?: string;
  defaultColumnKey?: string[];
  additionalColumns?: ColumnDuckTyping[];
  onTableColumnChange?: (column: ColumnDuckTyping) => void;
  handleFilterField?: (val: {
    key?: string | string[];
    action?: string;
    testType: string;
    fieldKeys: string[];
  }) => void;
};

const proxima = createProximaSdk();

const ColumnSetting: React.FC<ColumnSettingProps> = props => {
  const {
    name,
    className,
    titleCellOption,
    defaultColumnKey,
    handleFilterField,
    additionalColumns = [],
    onTableColumnChange = noop,
  } = props;
  const [visible, setVisible] = React.useState(false);
  const keys = useTestTypeScreenFieldKeys(titleCellOption);
  const { data: customFields } = useNoExpiredRequest(() => getCustomFields(keys), {
    cacheKey: `CustomFields_${keys.toString()}`,
    refreshDeps: [keys],
  });
  const [fields, setFields] = useState<string[] | undefined>([]);
  const [loading, setLoading] = useState(false);

  const { filterFields, tableFields, defaultFields } = useGetTableFilterFields({
    ...titleCellOption,
  });

  const initFilterFields = useCallback(() => {
    const customKeys = customFields?.map(d => d.key) ?? [];
    return filterFields?.filter(field => customKeys.includes(field));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customFields, (filterFields ?? []).join(',')]);

  useUpdateEffect(() => {
    setFields(initFilterFields());
  }, [titleCellOption.workspaceKey, customFields, (filterFields ?? []).join(',')]);

  const fieldCellsProp = useFieldsWithFieldCellProps(customFields);
  const fieldCellsPropDict = React.useMemo(() => {
    return keyBy(fieldCellsProp, 'key');
  }, [fieldCellsProp]);

  // proxima 自定义字段渲染
  const getColumnWithTemp = field => {
    // cell text
    return {
      width: 140,
      key: field.key,
      resizable: true,
      fieldType: field.fieldType,
      title: field.name,
      render(_, record) {
        const itemData = record;
        const { text, ...restTableCellProps } = fieldCellsPropDict[field.key] ?? {};
        if (!text || !itemData) return '-';

        return <TableCell {...restTableCellProps} text={text(itemData)} />;
      },
    };
  };

  const LOCAL_STORAGE_KEY = generateStorageKey(name, 'column-key');

  const [storageColumnKeys, setStorageColumnKeys] = useLocalStorageState(LOCAL_STORAGE_KEY, {
    defaultValue: tableFields ?? [],
  });

  useEffect(() => {
    if (titleCellOption?.workspaceKey) {
      if (titleCellOption?.isCheckedGlobalConfig || titleCellOption?.isSettingPage) {
        setStorageColumnKeys([...new Set(tableFields ?? defaultColumnKey)]);
      } else {
        if (!storageColumnKeys?.length && tableFields?.length) {
          setStorageColumnKeys([...new Set(tableFields)]);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    titleCellOption?.workspaceKey,
    titleCellOption?.isSettingPage,
    titleCellOption?.isCheckedGlobalConfig,
    JSON.stringify(defaultColumnKey),
    JSON.stringify(tableFields),
  ]);

  const memoizedAdditionalColumnKey = additionalColumns.map(col => col.key);
  const allColumns = React.useMemo(() => {
    const columnKeySet = new Set();
    return additionalColumns
      .map(item => ({ ...item, additional: true }))
      .concat(customFields?.map(getColumnWithTemp) ?? [])
      .filter(column => {
        if (columnKeySet.has(column.key)) {
          return false;
        }
        columnKeySet.add(column.key);
        return true;
      }) as ColumnDuckTyping[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoizedAdditionalColumnKey, customFields]);

  const selectColumns = React.useMemo(() => {
    const columnsKey = storageColumnKeys?.length ? storageColumnKeys : defaultColumnKey;
    return columnsKey?.map(key => allColumns.find(col => col.key === key)).filter(Boolean);
  }, [allColumns, storageColumnKeys, JSON.stringify(defaultColumnKey)]);

  const selectOptions = allColumns
    .filter(col => {
      // 系统字段不用展示
      return !col.isSystem;
    })
    .reduce(
      (acc, col) => {
        const getOptionData = col => {
          return {
            label: col.title,
            value: col.key,
            data: col,
          };
        };
        if (col.additional) {
          acc[0].options.push(getOptionData(col));
        } else {
          acc[1].options.push(getOptionData(col));
        }

        return acc;
      },
      [
        { label: '测试管理字段', options: [] },
        { label: '事项字段', options: [] },
      ],
    )
    .filter(item => item.options.length);

  // 处理 fixed column 排列
  useDeepCompareEffect(() => {
    const systemColumns = allColumns.filter(col => col.isSystem);

    const selectedColumns = systemColumns
      .concat(storageColumnKeys.map(key => allColumns.find(col => col.key === key)))
      .filter(Boolean);

    const filteredFixedColumns = selectedColumns.filter(col => !col.fixed);
    const fixedLeftColumn = selectedColumns.find(col => col.fixed === 'left' || col.fixed === true);
    const fixedRightColumn = selectedColumns.find(col => col.fixed === 'right');

    const tableColumns = []
      .concat(fixedLeftColumn)
      .concat(filteredFixedColumns)
      .concat(fixedRightColumn)
      .filter(Boolean);

    if (tableColumns.length) {
      onTableColumnChange(tableColumns);
    }
  }, [allColumns, storageColumnKeys]);

  const deleteStorageColumnKey = key => {
    setStorageColumnKeys(prevKeys => {
      return prevKeys.filter(k => k !== key);
    });
  };

  const handleColumnSort = data => {
    const { source, destination } = data;
    if (!destination || source.index === destination.index) return;
    setStorageColumnKeys(prevState => {
      // 获取最新显示在面板的列字段
      const _prevState = prevState.filter(p => (selectColumns?.map(d => d.key) ?? []).includes(p));

      const newColumnKeys = Array.from(_prevState);
      const [splicedColumn] = newColumnKeys.splice(source.index, 1);
      newColumnKeys.splice(destination.index, 0, splicedColumn);
      return newColumnKeys;
    });
  };

  return (
    <>
      {titleCellOption?.isSettingPage && (
        <Button className={cx('setting-page-btn')} onClick={() => setVisible(true)}>
          配置表头
        </Button>
      )}
      <Tooltip title="表格显示设置">
        <Setting className={cx(className, 'setting-icon')} onClick={() => setVisible(true)} />
      </Tooltip>
      <Drawer
        className={cx('drawer-box')}
        visible={visible}
        onClose={() => setVisible(false)}
        width={visible ? 320 : 0}
        title="表格显示设置"
      >
        <div className={cx('box-header')}>
          <div className={cx('title')}>表头设置</div>
          {!titleCellOption?.isSettingPage && (
            <Button
              className={cx('link')}
              type="link"
              size="small"
              onClick={async () => {
                setLoading(true);
                setFields(defaultFields ?? []);
                setStorageColumnKeys(tableFields ?? defaultColumnKey);
                await handleFilterField?.({
                  testType: titleCellOption.testType,
                  fieldKeys: defaultFields,
                });
                proxima.execute('updateFilterSearchFields');
                setLoading(false);
              }}
            >
              恢复默认
            </Button>
          )}
        </div>
        <Tooltip
          className={cx('field-tips')}
          placement="bottom"
          title={'可配置表头列内容及排序、列表搜索框默认检索项，最多可选四个检索项'}
        >
          <QuestionCircleOutlined />
        </Tooltip>
        <Select
          showSearch
          mode="multiple"
          allowClear={false}
          filterOption={true}
          tagRender={() => null}
          options={selectOptions}
          optionFilterProp="label"
          value={storageColumnKeys}
          placeholder="请选择需要展示的列"
          className={cx('field-select')}
          onChange={keys => setStorageColumnKeys(keys)}
        />
        <Spin spinning={loading}>
          <DragDropContext onDragEnd={handleColumnSort}>
            <Droppable droppableId="column">
              {provider => (
                <div
                  {...provider.droppableProps}
                  ref={provider.innerRef}
                  className={cx('sort-area')}
                >
                  {selectColumns.map((col, index) => (
                    <Draggable key={col.key} index={index} draggableId={col.key as string}>
                      {(provider, snapshot) => (
                        <div
                          {...provider.draggableProps}
                          {...provider.dragHandleProps}
                          ref={provider.innerRef}
                          className={cx('sort-item', snapshot.isDragging && 'dragging')}
                        >
                          <DragHandler />
                          <OverflowTooltip
                            mountOnCurrentNode
                            className={cx('title')}
                            title={col.title}
                          >
                            {col.title}
                          </OverflowTooltip>
                          {['Key', 'Text'].includes(col?.fieldType?.key) && (
                            <span
                              className={cx('filter-icon')}
                              onClick={async () => {
                                const action = fields?.includes(col.key) ? 'delete' : 'add';
                                let fieldKeys;
                                if (fields?.includes(col.key)) {
                                  fieldKeys = fields.filter(d => d !== col.key);
                                  setFields(fieldKeys);
                                } else {
                                  if (fields?.length >= 4) {
                                    return message.warning('表检索项配置不能超过4个');
                                  }
                                  fieldKeys = fields.concat(col.key);
                                  setFields(fieldKeys);
                                }
                                setLoading(true);
                                await handleFilterField?.({
                                  key: col.key,
                                  action,
                                  testType: titleCellOption.testType,
                                  fieldKeys,
                                });
                                proxima.execute('updateFilterSearchFields');
                                setLoading(false);
                              }}
                            >
                              <Tooltip
                                title={fields?.includes(col.key) ? '移除检索项' : '添加检索项'}
                              >
                                {fields?.includes(col.key) ? (
                                  <DeleteSearch className={cx('icon', 'delete')} />
                                ) : (
                                  <AddSearch className={cx('icon', 'add')} />
                                )}
                              </Tooltip>
                            </span>
                          )}
                          <DeleteIcon
                            className={cx('icon')}
                            onClick={async () => {
                              deleteStorageColumnKey(col.key);
                              if (
                                ['Key', 'Text'].includes(col?.fieldType?.key) &&
                                fields?.includes(col.key)
                              ) {
                                setLoading(true);
                                const fieldKeys = fields?.filter(d => d !== col.key) ?? [];
                                setFields(fieldKeys);
                                await handleFilterField?.({
                                  key: col.key,
                                  testType: titleCellOption.testType,
                                  fieldKeys,
                                });
                                proxima.execute('updateFilterSearchFields');
                                setLoading(false);
                              }
                            }}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provider.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </Spin>
      </Drawer>
    </>
  );
};

export default ColumnSetting;
