/* eslint-disable react-hooks/exhaustive-deps */
import '@giteeteam/apps-team-components/dist/main.css';

import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { useDeepCompareEffect, useLocalStorageState, useUpdateEffect } from 'ahooks';
import { Button, Drawer, message, Select, Spin, Tooltip } from 'antd';
import { ColumnType } from 'antd/lib/table';
import { getAllReadComponents, StatusCell, TableCell } from 'apps-team-components-v1';
import { keyBy, noop } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';

import OverflowTooltip from '@/components/common/OverflowTooltip';
import {
  AddSearch,
  DeleteIcon,
  DeleteSearch,
  DragHandler,
  QuestionCircleOutlined,
  Setting,
} from '@/icons';
import { TABLE_EXCLUDE_FIELDS, TestType } from '@/lib/constants';
import { useBaseAction } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { useFieldsWithFieldCellProps } from '@/lib/hooks/useProxima';
import { generateStorageKey } from '@/lib/utils/helper';

import cx from './ColumnSetting.less';
import { SystemFieldKeys, useGetCustomFields, useGetTableFilterFields } from './hook';
import { TitleCellOption } from './type';

type ColumnDuckTyping = ColumnType<any> & Record<string, any>;

type ColumnSettingProps = TitleCellOption & {
  name?: string;
  className?: string;
  testFieldKeys?: string[];
  defaultColumnKey?: string[];
  privateColumnKey?: string[];
  additionalColumns?: ColumnDuckTyping[];
  onTableColumnChange?: (column: ColumnDuckTyping) => void;
  handleFilterField?: (val: {
    key?: string | string[];
    action?: string;
    testType: string;
    fieldKeys: string[];
  }) => void;
  onClose?: () => void;
};

const proxima = createProximaSdk();

const filedKeyText = ['User', 'Assignee', 'Sprint', 'Version'];

const readComponents = getAllReadComponents();

const ColumnSetting: React.FC<ColumnSettingProps> = props => {
  const {
    name,
    className,
    testFieldKeys,
    titleCellOption,
    defaultColumnKey,
    privateColumnKey,
    handleFilterField,
    additionalColumns = [],
    onTableColumnChange = noop,
  } = props;
  const { t } = useI18n();
  const [visible, setVisible] = React.useState(false);
  const { testPlanFieldKeys, testCaseFieldKeys, testExecutionFieldKeys } = useBaseAction();
  const _keys = useMemo(() => {
    if (testFieldKeys) return testFieldKeys;
    if (titleCellOption.testType === TestType.Case) {
      return testCaseFieldKeys;
    }
    if (titleCellOption.testType === TestType.Execution) {
      return testExecutionFieldKeys;
    }
    if (titleCellOption.testType === TestType.Plan) {
      return testPlanFieldKeys;
    }
  }, [testPlanFieldKeys?.toString(), testCaseFieldKeys?.toString(), testFieldKeys?.toString()]);
  const keys = useMemo(() => [].concat(SystemFieldKeys, _keys ?? []), [_keys?.toString()]);
  const fieldKeys = useMemo(() => keys?.filter(key => !TABLE_EXCLUDE_FIELDS.includes(key)), [keys]);

  const customFields = useGetCustomFields({ filedKeys: fieldKeys });

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
      overflowEllipsis: false,
      render(_, record) {
        const itemData = record;
        const { text, ...restTableCellProps } = fieldCellsPropDict[field.key] ?? {};
        if (!text || !itemData) return '-';

        const textValue =
          !filedKeyText.includes(field.fieldType.key) && Array.isArray(text(itemData))
            ? text(itemData).map(d => d?.objectId ?? d)
            : text(itemData);

        const itemId = itemData.caseId || itemData.objectId || itemData.id;

        // 状态组件使用新版组件
        if (field?.key === 'status') {
          return (
            <StatusCell
              {...restTableCellProps}
              id={itemId}
              itemId={itemId}
              text={textValue}
              workspaceId={itemData?.workspace?.objectId}
              itemType={itemData?.itemType?.objectId}
              value={itemData?.status || {}}
              readonly={false}
              onChange={data => {
                itemData.status = data;
              }}
            />
          );
        }
        return (
          <TableCell
            {...restTableCellProps}
            cellData={textValue}
            column={{ ...field, cellType: field?.fieldType.defaultKey }}
            rowData={itemData}
            readComponents={readComponents}
          />
        );
      },
    };
  };

  const LOCAL_STORAGE_KEY = generateStorageKey(name, 'column-key');

  const [storageColumnKeys, setStorageColumnKeys] = useLocalStorageState(LOCAL_STORAGE_KEY);

  useEffect(() => {
    if (titleCellOption?.workspaceKey) {
      if (titleCellOption?.isCheckedGlobalConfig || titleCellOption?.isSettingPage) {
        setStorageColumnKeys([...new Set(tableFields ?? defaultColumnKey)]);
      } else {
        if (!storageColumnKeys?.length && tableFields?.length) {
          setStorageColumnKeys([...new Set(tableFields?.concat(privateColumnKey ?? []))]);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    titleCellOption?.workspaceKey,
    titleCellOption?.isSettingPage,
    titleCellOption?.isCheckedGlobalConfig,
    JSON.stringify(defaultColumnKey),
    JSON.stringify(privateColumnKey),
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
    const columnsKey = storageColumnKeys ?? defaultColumnKey;
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
        { label: t('components.common.businessTable.columnSetting.0'), options: [] },
        { label: t('components.common.businessTable.columnSetting.1'), options: [] },
      ],
    )
    .filter(item => item.options.length);

  // 处理 fixed column 排列
  useDeepCompareEffect(() => {
    // 等字段初始化完再触发列表加载
    if (allColumns.findIndex(i => !!i.fieldType) === -1) return;
    const systemColumns = allColumns.filter(col => col.isSystem);

    const selectedColumns = systemColumns
      .concat(
        (storageColumnKeys ?? defaultColumnKey)?.map(key =>
          allColumns.find(col => col.key === key),
        ),
      )
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
  }, [allColumns, storageColumnKeys, defaultColumnKey]);

  const deleteStorageColumnKey = key => {
    setStorageColumnKeys((prevKeys = defaultColumnKey) => {
      return prevKeys.filter(k => k !== key);
    });
  };

  const handleColumnSort = data => {
    const { source, destination } = data;
    if (!destination || source.index === destination.index) return;
    setStorageColumnKeys((prevState = defaultColumnKey) => {
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
          {t('components.common.businessTable.setHeader')}
        </Button>
      )}
      {!titleCellOption?.isHideIcon && (
        <Tooltip
          overlayClassName={cx('overlay-tooltip')}
          placement="topRight"
          title={t('components.common.businessTable.tableSetting')}
        >
          <Setting className={cx(className, 'setting-icon')} onClick={() => setVisible(true)} />
        </Tooltip>
      )}
      <Drawer
        className={cx('drawer-box')}
        open={visible}
        onClose={() => {
          setVisible(false);
          props.onClose?.();
        }}
        width={visible ? 320 : 0}
        title={t('components.common.businessTable.tableSetting')}
      >
        <div className={cx('box-header')}>
          <div className={cx('title')}>
            {t('components.common.businessTable.headerSetting')}
            <Tooltip
              className={cx('field-tips')}
              placement="bottom"
              title={t('components.common.businessTable.actionTips')}
            >
              <QuestionCircleOutlined />
            </Tooltip>
          </div>
          {!titleCellOption?.isSettingPage && (
            <Button
              className={cx('link')}
              type="link"
              size="small"
              onClick={async () => {
                setLoading(true);
                setFields(defaultFields ?? []);
                setStorageColumnKeys(
                  titleCellOption.restoreWithDefaultColumnKey
                    ? defaultColumnKey
                    : tableFields ?? defaultColumnKey,
                );
                await handleFilterField?.({
                  testType: titleCellOption.testType,
                  fieldKeys: defaultFields,
                });
                proxima.execute('updateFilterSearchFields');
                setLoading(false);
              }}
            >
              {t('components.common.businessTable.restoreDefault')}
            </Button>
          )}
        </div>
        <Select
          showSearch
          mode="multiple"
          allowClear={false}
          filterOption={true}
          tagRender={() => null}
          options={selectOptions}
          optionFilterProp="label"
          value={storageColumnKeys ?? defaultColumnKey}
          placeholder={t('components.common.businessTable.placeholder')}
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
                  {selectColumns?.map((col, index) => (
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
                                    return message.warning(
                                      t('components.common.businessTable.searchWarningMessage'),
                                    );
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
                                overlayClassName="global_arrow_tooltip_overflow"
                                placement="topRight"
                                title={
                                  fields?.includes(col.key)
                                    ? t('components.common.businessTable.removeSearch')
                                    : t('components.common.businessTable.addSearch')
                                }
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
