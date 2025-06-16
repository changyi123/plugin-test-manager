import dayjs from 'dayjs';
import React, { useMemo, useState, useCallback } from 'react';
import { getTestEntityByQuery } from '@/lib/api/item';
import { useTestConfig } from '@/lib/hooks/useContext';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { TestType } from '@/lib/constants';
import { getItemByIQL } from '@/lib/api/proxima';
import { BusinessTable } from '@/components/common/BusinessTable';
import type { BusinessTableActionType } from '@/components/common/BusinessTable/type';
import useI18n from '@/lib/hooks/useI18n';
import _ from 'lodash';

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
      try {
        const { list: testRunList } = await getTestEntityByQuery({
          query: {
            referenceCase: testEntity.objectId,
            type: TestType.Run,
          },
          limit: 999999,
        });
        let _defectIds = []
        _.forEach(testRunList, (item) => {
          const _arr1 = item?.runDetail?.defectItemIds || []
          let _arr2 = []
          const _stepsArr1 =  item?.runDetail?.steps || []
          _.forEach(_stepsArr1, (_item) => {
            _arr2 = _.concat(_arr2, _item?.defectItemIds)
          })
          const result = _.concat(_arr1, _arr2);
          _defectIds = [ ..._defectIds, ...result ]
        })
        
        const { count, items } = await getItemByIQL({ itemId: _defectIds, ...queryParams })
        setTableLoading(false);
        return {
          list:
            items.map(i => ({
              ...i,
              status: i.workflowStatus,
            })) ?? [],
          total: count ?? 0,
        };
      } catch (error) {
        setTableLoading(false);
        return {
          list: [],
          total: 0,
        };
      }
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
    <div id="container-1">
      <BusinessTable
        titleCellOption={{
          workspaceKey: testEntity?.workspace?.key,
          testType: TestType.Case,
        }}
        useColumnSetting
        getContainer={() => document.getElementById('container-1')}
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
        rowKey="key"
        columns={tableColumns}
        name={`${testEntity?.workspace?.key}_TestDetailTable`}
        actionRef={actionRef}
        loading={tableLoading}
        getDataSource={tableDataGetter}
      />
    </div>
  );
};

export default React.memo(TestDefect);
