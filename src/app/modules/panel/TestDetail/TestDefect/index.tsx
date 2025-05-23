import dayjs from 'dayjs';
import React, { useMemo, useState, useCallback } from 'react';
import { getTestEntityByQuery } from '@/lib/api/item';
import { StatusBadge } from '@/components/business/Status';
import { useTestConfig } from '@/lib/hooks/useContext';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { TestType } from '@/lib/constants';
import { getItemByIQL } from '@/lib/api/proxima';
import { BusinessTable } from '@/components/common/BusinessTable';
import type { BusinessTableActionType } from '@/components/common/BusinessTable/type';
import useI18n from '@/lib/hooks/useI18n';
import _ from 'lodash';
import cx from './index.less';

const getDefectIds = data =>
  (_.chain(data?.steps) as unknown as any[])
    .reduce((acc, step) => {
      return acc.concat(step.defectItemIds);
    }, data?.defectItemIds ?? [])
    .sort()
    .filter(Boolean)
    .uniq()
    .value();

const TestDefect: React.FC = () => {
  const { testEntity } = useTestConfig();
  const actionRef = React.useRef<BusinessTableActionType>();
  const { t } = useI18n();
  const [tableLoading, setTableLoading] = useState(false);

  const tableDataGetter = useCallback(
    async (queryParams, tableFields) => {
      const workspaceKey = testEntity?.workspace?.key
      if (!workspaceKey || !tableFields?.length)
        return {
          list: [],
          total: 0,
        };
      setTableLoading(true);
      const { list: testRunList } = await getTestEntityByQuery({
        query: {
          referenceCase: testEntity.objectId,
          type: TestType.Run,
        },
        limit: 1,
      });
      const testRunEntity =  Array.isArray(testRunList) && !_.isEmpty(testRunList) && testRunList[0]
      if (!testRunEntity?.runDetail) return;
      const defectIds = getDefectIds(testRunEntity?.runDetail);
      if (!defectIds.length) return;
      const { count, items } = await getItemByIQL({ itemId: defectIds })
      setTableLoading(false);
      return {
        list:
          items.map(i => ({
            ...i,
            status: i.workflowStatus,
          })) ?? [],
        total: count ?? 0,
      };
      return {
        list: items,
        total: count,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [testEntity?.objectId, testEntity?.workspace?.key, getDefectIds],
  );
  // table column 数据
  const tableColumns = useMemo(() => {
    return [
      {
        title: 'key',
        key: 'key',
        width: 200,
        render: (_, record) => {
          return (
            <OverflowTooltip title={record?.key}>
              {record?.key}
            </OverflowTooltip>
          );
        },
      },
      {
        title: t('common.name'),
        key: 'name',
        width: 200,
        render: (_, record) => {
          return (
            <OverflowTooltip title={record?.name}>
              {record?.name}
            </OverflowTooltip>
          );
        },
      },
      {
        title: t('page.repository.repoDropDown.excelExportTitle.createdBy'),
        key: 'createdBy',
        width: 150,
        render: (_, record) => {
          return record.createdBy?.label;
        },
      },
      {
        title: t('report.workspaceReportTemplate.tableColumns.createdAt'),
        key: 'createdAt',
        width: 200,
        render: (_, record) => {
          return record.createdAt ? dayjs(record?.createdAt).format('YYYY-MM-DD HH:mm') : '';
        },
      },
    ];
  }, [t]);

  return (
    <BusinessTable
      titleCellOption={{
        workspaceKey: testEntity?.workspace?.key,
        testType: TestType.Case,
      }}
      useColumnSetting
      defaultColumnKey={[
        'key',
        'name',
        'status',
        'createdBy',
        'createdAt',
      ]}
      scroll = {{ 
        x: 'max-content',
        y: 200
      }}
      // privateColumnKey={['repositoryGroup', 'caseLatestStatus', 'runCount']}
      rowKey="objectId"
      columns={tableColumns}
      name={`${testEntity?.workspace?.key}_AllTestEntity`}
      actionRef={actionRef}
      loading={tableLoading}
      getDataSource={tableDataGetter}
    />
  );
};

export default React.memo(TestDefect);
