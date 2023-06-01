import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import React, { useCallback, useRef } from 'react';

import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';

import CreateReportModel, { ActionType } from '../Model/createReportModel';
import cx from './index.less';

const ReportHeader: React.FC<any> = () => {
  const modalRef = useRef<ActionType>();
  const { t } = useI18n();

  const { workspace } = useTestConfig();

  const createReport = useCallback(() => {
    const res = modalRef.current.open({});

    console.info(111111111111, res);
  }, []);

  return (
    <>
      <div className={cx('report-header')}>
        <div>{t('common.testReport')}</div>
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
