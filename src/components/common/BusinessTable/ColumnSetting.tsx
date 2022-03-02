import React from 'react';
import { noop } from 'lodash';
import { ColumnType } from 'antd/lib/table';
import { Drawer, Select, Tooltip } from '@osui/ui';
import { getCustomFields } from '@/lib/api/proxima';
import { generateStorageKey } from '@/lib/utils/helper';
import { SettingOutlined, DeleteOutlined, DragHandler } from '@/icons';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { useRequest, useLocalStorageState, useDeepCompareEffect } from 'ahooks';

import cx from './ColumnSetting.less';

const getColumnWithTemp = field => {
  return {
    width: 140,
    key: field.key,
    resizable: true,
    title: field.name,
    render(_, record) {
      return field.description + record.name;
    },
  };
};

type ColumnDuckTyping = ColumnType<any> & Record<string, any>;

type ColumnSettingProps = {
  name?: string;
  className?: string;
  additionalColumns?: ColumnDuckTyping[];
  onTableColumnChange?: (column: ColumnDuckTyping) => void;
};

const ColumnSetting: React.FC<ColumnSettingProps> = props => {
  const { className, additionalColumns = [], name, onTableColumnChange = noop } = props;
  const [visible, setVisible] = React.useState(false);
  const { data: customFields } = useRequest(getCustomFields, {
    cacheKey: 'CustomFields',
    staleTime: 9999999999,
  });

  const LOCAL_STORAGE_KEY = generateStorageKey(name, 'column-key');

  const [storageColumnKeys, setStorageColumnKeys] = useLocalStorageState(LOCAL_STORAGE_KEY, {
    defaultValue: [],
  });

  const memoizedAdditionalColumnKey = additionalColumns.map(col => col.key);
  const allColumns = React.useMemo(() => {
    return additionalColumns.concat(customFields?.map(getColumnWithTemp) ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoizedAdditionalColumnKey, customFields]);

  const optionalColumns = React.useMemo(() => {
    return allColumns.filter(col => {
      return !col.isSystem && storageColumnKeys.every(colKey => colKey !== col.key);
    });
  }, [allColumns, storageColumnKeys]);

  const selectColumns = React.useMemo(() => {
    return storageColumnKeys.map(key => allColumns.find(col => col.key === key));
  }, [allColumns, storageColumnKeys]);

  const selectOptions = optionalColumns.map(col => ({
    label: col.title,
    value: col.key,
    data: col,
  }));

  useDeepCompareEffect(() => {
    const systemColumns = allColumns.filter(col => col.isSystem);

    const selectedColumns = storageColumnKeys
      .map(key => allColumns.find(col => col.key === key))
      .filter(Boolean);

    const filteredFixedColumns = selectedColumns.filter(col => !col.fixed);
    const fixedLeftColumn = selectedColumns.find(col => col.fixed === 'left' || col.fixed === true);
    const fixedRightColumn = selectedColumns.find(col => col.fixed === 'right');

    const tableColumns = systemColumns
      .concat(fixedLeftColumn)
      .concat(filteredFixedColumns)
      .concat(fixedRightColumn)
      .filter(Boolean);

    if (tableColumns.length) {
      console.log('tableColumns', tableColumns);
      onTableColumnChange(tableColumns);
    }
  }, [allColumns, storageColumnKeys]);

  const handleColumnKeySelect = key => {
    setStorageColumnKeys(prevState => {
      if (!prevState.includes(key)) {
        return prevState.concat(key);
      } else {
        return prevState.filter(k => k !== key);
      }
    });
  };

  const handleDragEnd = data => {
    const { source, destination } = data;
    if (!destination || source.index !== destination.index) return;
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
          value={null}
          filterOption={true}
          optionFilterProp="label"
          options={selectOptions}
          onChange={handleColumnKeySelect}
          className={cx('field-select')}
        />

        <DragDropContext onDragEnd={handleDragEnd}>
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
                          onClick={() => handleColumnKeySelect(col.key)}
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
