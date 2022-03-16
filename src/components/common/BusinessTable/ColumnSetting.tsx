import React from 'react';
import { noop, get, keyBy } from 'lodash';
import { ColumnType } from 'antd/lib/table';
import { Drawer, Select, Tooltip } from '@osui/ui';
import { getCustomFields } from '@/lib/api/proxima';
import { TableCell } from '@projectproxima/components';
import { generateStorageKey } from '@/lib/utils/helper';
import { useFieldsWithFieldCellProps } from '@/lib/hooks/useProxima';
import { SettingOutlined, DeleteOutlined, DragHandler } from '@/icons';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { useRequest, useLocalStorageState, useDeepCompareEffect } from 'ahooks';

import cx from './ColumnSetting.less';
import '@projectproxima/components/dist/main.css';

type ColumnDuckTyping = ColumnType<any> & Record<string, any>;

type ColumnSettingProps = {
  name?: string;
  itemKey: string;
  className?: string;
  additionalColumns?: ColumnDuckTyping[];
  onTableColumnChange?: (column: ColumnDuckTyping) => void;
};

const ColumnSetting: React.FC<ColumnSettingProps> = props => {
  const { className, additionalColumns = [], name, onTableColumnChange = noop, itemKey } = props;
  const [visible, setVisible] = React.useState(false);
  const { data: customFields } = useRequest(getCustomFields, {
    cacheKey: 'CustomFields',
    staleTime: 9999999999,
  });

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
      title: field.name,
      render(_, record) {
        const itemData = get(record, itemKey);
        const { text, ...restTableCellProps } = fieldCellsPropDict[field.key] ?? {};
        if (!text || !itemData) return '-';

        return <TableCell {...restTableCellProps} text={text(itemData)} />;
      },
    };
  };

  const LOCAL_STORAGE_KEY = generateStorageKey(name, 'column-key');

  const additionalNotSystemColumnKeys = additionalColumns
    .filter(col => !col.isSystem)
    .map(col => col.key);
  const [storageColumnKeys, setStorageColumnKeys] = useLocalStorageState(LOCAL_STORAGE_KEY, {
    defaultValue: additionalNotSystemColumnKeys,
  });

  const memoizedAdditionalColumnKey = additionalColumns.map(col => col.key);
  const allColumns = React.useMemo(() => {
    return additionalColumns
      .map(item => ({ ...item, additional: true }))
      .concat(customFields?.map(getColumnWithTemp) ?? []) as ColumnDuckTyping[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoizedAdditionalColumnKey, customFields]);

  const selectColumns = React.useMemo(() => {
    return storageColumnKeys.map(key => allColumns.find(col => col.key === key)).filter(Boolean);
  }, [allColumns, storageColumnKeys]);

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
      const newColumnKeys = Array.from(prevState);
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
      <Drawer visible={visible} onClose={() => setVisible(false)} width={320} title="表格显示设置">
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
