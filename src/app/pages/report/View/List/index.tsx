import { Button } from 'antd';
import React, { useCallback, useMemo, useRef } from 'react';

import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';
import { TestType } from '@/lib/constants';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { getProximaBasePath, getTenantKey } from '@/lib/utils/helper';

// import { useWorkspaceTemplate } from '@/services/testReport/query';
import cx from './index.less';

const List: React.FC<any> = () => {
  const { t } = useI18n();
  const { workspace } = useTestConfig();
  // const { data, isLoading } = useWorkspaceTemplate({
  //   workspace: workspace?.objectId,
  //   pagination: { limit: 999 },
  // });

  // console.log('data ------------------->', data);

  // const fieldsData = useGetCustomerFieldCell([SystemField.CreatedAt, SystemField.CreatedBy]);
  // const fieldCellsPropDict = React.useMemo(() => {
  //   return keyBy(fieldsData, 'key');
  // }, [fieldsData]);

  // console.log('fieldCellsPropDict -------------->', fieldCellsPropDict);

  const actionRef = useRef<BusinessTableActionType>();
  // const [tableLoading, settableLoading] = useState(false);
  const tableDataGetter = useCallback(async () => {
    return {
      list: [{}],
      total: 1,
    };
  }, []);

  const columns: any = useMemo(
    () => [
      {
        width: 200,
        key: 'title',
        fixed: true,
        isSystem: true,
        title: t('common.title'),
        className: 'test-case-title',
        // extraProps: {
        //   onClick: record => setSelectedTestPlan(record),
        // },
        render(_, rowData) {
          return (
            <div className={'test-plan-title-box'}>
              <div className={'test-plan-title'}>{rowData.name}</div>
            </div>
          );
        },
      },
      {
        key: 'reportStatus',
        title: '状态',
        width: 100,
        render(_, rowData) {
          return <span>{rowData?.caseCount}</span>;
        },
      },
      {
        key: 'reportPlan',
        title: '测试计划',
        width: 200,
        render(_, rowData) {
          return <span>{rowData?.caseCount}</span>;
        },
      },
      {
        key: 'action',
        title: '操作',
        isSystem: true,
        fixed: 'right' as any,
        width: 100,
        render(_) {
          return (
            <>
              <Button
                type="link"
                size="small"
                onClick={() => {
                  const baseUrl = getProximaBasePath() ? `${getProximaBasePath()}` : '/';
                  // 跳转到导入页面
                  const href = `${baseUrl}/${getTenantKey()}/workspaces/${
                    workspace?.key
                  }/plugin/test_manager_test-report/?reportId=123456&detail=true`;

                  window.open(href, '_blank');
                }}
              >
                查看
              </Button>
              {/* <Button type="link" size="small">
                下载
              </Button> */}
              <Button type="link" size="small">
                删除
              </Button>
            </>
          );
        },
      },
    ],
    [t, workspace?.key],
  );

  return (
    <div className={cx('report-list')}>
      <BusinessTable
        titleCellOption={{
          workspaceKey: workspace?.key,
          testType: TestType.Plan,
          isHideIcon: true,
        }}
        defaultColumnKey={['reportStatus', 'reportPlan', 'createdBy', 'createdAt']}
        useColumnSetting
        rowKey="objectId"
        columns={columns}
        actionRef={actionRef}
        loading={false}
        getDataSource={tableDataGetter}
      />
    </div>
  );
};

export default List;
