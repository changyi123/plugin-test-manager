import React, { useEffect, useState } from 'react';
import { keyBy, noop } from 'lodash';
import { TitleCellOption } from './type';
import { ColumnType } from 'antd/lib/table';
import { Drawer, message, Select, Tooltip } from 'antd';
import { getCustomFields } from '@/lib/api/proxima';
import { useGetTableFilterFields, useTestTypeScreenFieldKeys } from './hook';
import { TableCell } from '@projectproxima/components';
import { generateStorageKey } from '@/lib/utils/helper';
import { useNoExpiredRequest } from '@/lib/hooks/useRequest';
import { useDeepCompareEffect, useLocalStorageState } from 'ahooks';
import { useFieldsWithFieldCellProps } from '@/lib/hooks/useProxima';
import {
  DeleteOutlined,
  PlusCircleOutlined,
  DragHandler,
  SettingOutlined,
  MinusCircleOutlined,
} from '@/icons';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';

import '@projectproxima/components/dist/main.css';
import cx from './ColumnSetting.less';

type ColumnDuckTyping = ColumnType<any> & Record<string, any>;

type ColumnSettingProps = TitleCellOption & {
  name?: string;
  isSettingPage?: boolean;
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

const ColumnSetting: React.FC<ColumnSettingProps> = props => {
  const {
    name,
    isSettingPage,
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
  const [fields, setFields] = useState<string[]>([]);

  const { filterFields, tableFields } = useGetTableFilterFields({
    ...titleCellOption,
    isSettingPage,
  });

  useEffect(() => {
    if (filterFields?.length) {
      setFields(filterFields);
    }
  }, [filterFields]);

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
    defaultValue: defaultColumnKey ?? [],
  });

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
    const columns = storageColumnKeys?.length ? storageColumnKeys : tableFields;
    return columns.map(key => allColumns.find(col => col.key === key)).filter(Boolean);
  }, [allColumns, storageColumnKeys, tableFields]);

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
      <Tooltip title="表格显示设置">
        <SettingOutlined className={cx(className)} onClick={() => setVisible(true)} />
      </Tooltip>
      <Drawer
        visible={visible}
        onClose={() => setVisible(false)}
        width={visible ? 320 : 0}
        title="表格显示设置"
      >
        <h6 className={cx('title')}>表头设置</h6>
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

        <DragDropContext onDragEnd={handleColumnSort}>
          <Droppable droppableId="column">
            {provider => (
              <div {...provider.droppableProps} ref={provider.innerRef} className={cx('sort-area')}>
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
                        <span className={cx('title')}>{col.title}</span>
                        {['Key', 'Text'].includes(col?.fieldType?.key) && (
                          <span
                            className={cx('filter-icon')}
                            onClick={() => {
                              const action = fields.includes(col.key) ? 'delete' : 'add';
                              let fieldKeys;
                              if (fields.includes(col.key)) {
                                fieldKeys = fields.filter(d => d !== col.key);
                                setFields(fieldKeys);
                              } else {
                                if (fields?.length >= 4) {
                                  return message.warning('表检索项配置不能超过5个');
                                }
                                fieldKeys = fields.concat(col.key);
                                setFields(fieldKeys);
                              }
                              handleFilterField?.({
                                key: col.key,
                                action,
                                testType: titleCellOption.testType,
                                fieldKeys,
                              });
                            }}
                          >
                            <Tooltip title={fields.includes(col.key) ? '移除检索项' : '添加检索项'}>
                              {fields.includes(col.key) ? (
                                <MinusCircleOutlined className={cx('icon')} />
                              ) : (
                                <PlusCircleOutlined className={cx('icon')} />
                              )}
                            </Tooltip>
                          </span>
                        )}
                        <DeleteOutlined
                          className={cx('icon')}
                          onClick={() => deleteStorageColumnKey(col.key)}
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
      </Drawer>
    </>
  );
};

export default ColumnSetting;
