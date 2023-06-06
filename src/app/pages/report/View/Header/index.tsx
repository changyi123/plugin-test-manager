import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
// import isEmpty from 'lodash/isEmpty';
import React, { useCallback, useRef } from 'react';

// import { TestPlanModel } from '@/lib/constants';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';

// import { selectorToIql } from '@/lib/utils/iql';
// import { TestReport } from '@/services/models';
import CreateReportModel, { ActionType } from '../../Model/createReportModel';
import cx from './index.less';

// const handleSelector = selector => {
//   if (isEmpty(selector)) return null;
//   const selectors = {} as Record<string, any>;
//   if (selector) {
//     // 处理测试用例库筛选字段
//     selectors[TestPlanModel] = {
//       ...selector,
//       component: 'Dropdown',
//       fieldName: 'id',
//     };
//   }
//   return {
//     ...selectors,
//   };
// };

const ReportHeader: React.FC<any> = () => {
  const modalRef = useRef<ActionType>();
  const { t } = useI18n();
  const { workspace } = useTestConfig();

  const createReport = useCallback(async () => {
    const res: any = await modalRef.current.open({});
    // const iqlMap = Object.entries(res.selectors).reduce((prev, [key, value]: any[]) => {
    //   prev[value.key] = selectorToIql(
    //     key === TestPlanModel ? handleSelector(value) : { key: value },
    //   );
    //   return prev;
    // }, {});
    // const testReport = new TestReport();
    console.info('res -------->', res);

    // console.info(
    //   111111111111,
    //   testReport.createReport(res.template.objectId, {
    //     name: res.name,
    //     reportStatus: res.reportStatus,
    //     reportOverviewData: res.reportOverviewData,
    //     dataSourceIql: res.iqlMap,
    //     workspace: workspace
    //     defectsMapping: config.defectsMapping
    //   }),
    // );
  }, []);

  return (
    <>
      <div className={cx('report-header')}>
        <div className={cx('report-title')}>{t('common.testReport')}</div>
        <div>
          <Button type="primary" icon={<PlusOutlined />} onClick={createReport}>
            {t('report.addReport')}
          </Button>
        </div>
      </div>

      <CreateReportModel actionRef={modalRef} workspace={workspace}></CreateReportModel>
    </>
  );
};

export default React.memo(ReportHeader);
