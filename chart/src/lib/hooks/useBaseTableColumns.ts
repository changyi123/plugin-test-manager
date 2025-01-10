import { useMemo } from 'react';

// 报表表格列表表头不显示字段类型
const EXCLUDE_REPORT_TABLE_FIELD_TYPES = [
  'SecurityLevel',
  'ItemLevel',
  'Link',
  'Workflow',
  'Annex',
  'Editor',
  'FieldCollection',
];

const useBaseTableColumns = (
  usefulFields: Record<string, any>[] = [],
  configColumns: string[] = [],
): Record<string, any> => {
  const customFields = useMemo(() => {
    // 过滤不能在列表中渲染的字段
    return usefulFields.filter(cf => !EXCLUDE_REPORT_TABLE_FIELD_TYPES.includes(cf.fieldType?.key));
  }, [usefulFields]);

  // 获取已选择的列的数据
  const selectedColumns = useMemo(() => {
    return configColumns
      .filter(each =>
        customFields.find(cf => {
          return (
            cf.key === each &&
            cf.fieldType?.key &&
            !EXCLUDE_REPORT_TABLE_FIELD_TYPES.includes(cf.fieldType?.key)
          );
        }),
      )
      .map(each => {
        const cf = customFields.find(cf => cf.key === each);
        return {
          title: cf.name,
          dataIndex: cf.key,
          key: cf.key,
          cellType: cf.fieldType?.key,
          data: cf.data,
          property: cf.property,
          validation: cf.validation,
          objectId: cf.objectId,
        };
      });
  }, [configColumns, customFields]);

  // 所有的自定义字段，转化成base-table的列结构
  const columns = useMemo(() => {
    const customFieldsMap = new Map();
    customFields.forEach(cf => {
      const fieldTypeKey = (cf?.fieldType as any)?.key;
      if (fieldTypeKey && !EXCLUDE_REPORT_TABLE_FIELD_TYPES.includes(fieldTypeKey)) {
        customFieldsMap.set(cf.key, {
          title: cf.name,
          dataIndex: cf.key,
          key: cf.key,
          cellType: (cf?.fieldType as any)?.type,
          isHidden: !selectedColumns.find(sc => sc.key == cf.key),
          data: cf.data,
        });
      }
    });

    // configColumns 中有排序信息，和全量字段信息结合可形成表格列设置所需信息
    const visibleColumns = selectedColumns.map(column => customFieldsMap.get(column.key));
    return {
      data: [
        ...visibleColumns,
        ...Array.from(customFieldsMap.values()).filter(item => item.isHidden),
      ].filter(Boolean),
      map: customFieldsMap,
    };
  }, [customFields, selectedColumns]);

  return {
    customFields,
    selectedColumns: selectedColumns,
    columns: columns.data,
    fieldsDataMap: columns.map,
  };
};

const useFields = originUsefulFields => {
  const usefulFields = useMemo(
    () =>
      (
        [
          {
            name: '测试执行任务',
            key: 'linkedExecution',
            fieldType: { key: 'Text', type: 'Text' },
          },
          {
            name: '所属模块',
            key: 'r_test_manager_repository',
            fieldType: { key: 'Text', type: 'Text' },
          },
          {
            name: '测试执行状态',
            key: 'r_test_manager_status',
            fieldType: { key: 'Text', type: 'Text' },
          },
          {
            name: '执行次数',
            key: 'r_test_manager_executeCount',
            fieldType: { key: 'Number', type: 'Number' },
          },
          {
            name: '执行人',
            key: 'r_test_manager_executor',
            fieldType: { key: 'User', type: 'User' },
          },
          {
            name: '执行时间',
            key: 'r_test_manager_executeTime',
            fieldType: { key: 'Date', type: 'Date' },
            property: {
              format: 'YYYY-MM-DD HH:mm:ss',
            },
          },
        ] as any[]
      ).concat(
        (originUsefulFields as any[]).filter(
          f =>
            ![
              'linkedExecution',
              'r_test_manager_executeTime',
              'r_test_manager_repository',
              'r_test_manager_status',
              'r_test_manager_executeCount',
              'r_test_manager_executor',
            ].includes(f.key),
        ) || [],
      ),
    [originUsefulFields],
  );

  return usefulFields;
};

export { useFields };

export default useBaseTableColumns;
