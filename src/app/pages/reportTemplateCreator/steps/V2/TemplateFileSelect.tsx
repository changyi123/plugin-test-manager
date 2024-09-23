import { Select } from 'antd';
import React, { useMemo } from 'react';

import useI18n from '@/lib/hooks/useI18n';
import { getTestManagerContainer } from '@/lib/utils/helper';
import { useReportTemplateList } from '@/services/testReport/query';

import cx from './BasicConfig.less';

const TemplateFileSelect: React.FC = props => {
  const { t } = useI18n();

  const { data: templateFileList, isLoading: templateLoading } = useReportTemplateList();

  const templateFiles = useMemo(
    () =>
      templateFileList?.map(d => ({
        ...d,
        label: (
          <div
            className={cx('option')}
            style={{ display: 'flex', justifyContent: 'space-between' }}
          >
            {d.name}
          </div>
        ),
        value: d.objectId,
        searchText: d.name,
      })),
    [templateFileList],
  );

  return (
    <Select
      {...props}
      className={cx('step-select')}
      placeholder={t('report.choiceTemplateFilePlaceholder')}
      options={templateFiles}
      loading={templateLoading}
      showSearch
      optionFilterProp="searchText"
      getPopupContainer={getTestManagerContainer}
    />
  );
};

export default React.memo(TemplateFileSelect);
