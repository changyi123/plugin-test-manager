import { Input, Radio, Select } from 'antd';
import React, { useMemo, useState } from 'react';

import useI18n from '@/lib/hooks/useI18n';
import { useWorkspaceTemplateListQuery } from '@/services/testReport/query';

import { FormProps } from './RangeForm';
import cx from './TemplateForm.less';

const TemplateForm: React.FC<FormProps> = ({ state, workspace }) => {
  const { t } = useI18n();

  const [inputStatus, setInputStatus] = useState(undefined);
  const [selectStatus, setSelectStatus] = useState(undefined);
  const [exceedLength, setExceedLength] = useState(false);

  const {
    data: { results: reportTemplateList },
    isLoading,
  } = useWorkspaceTemplateListQuery({
    workspace: workspace?.objectId,
    pagination: { limit: 999 },
  });

  const templateList = useMemo(
    () =>
      reportTemplateList?.map(d => ({
        ...d,
        label: d.name,
        value: d.objectId,
      })),
    [reportTemplateList],
  );

  const options = useMemo(() => {
    return [
      {
        value: 'pass',
        label: t('report.pass'),
      },
      {
        value: 'noPass',
        label: t('report.noPass'),
      },
      {
        value: 'partPass',
        label: t('report.partPass'),
      },
    ];
  }, [t]);

  return (
    <>
      <div className={cx('form-box')}>
        <span className={cx('step-label', 'required')}>{t('report.reportName')}</span>
        {inputStatus === 'error' && <span className={cx('error')}>{t('report.required')}</span>}
        {exceedLength && <span className={cx('error')}>{t('report.exceedLength')}</span>}
        <div className={cx('step-cont')}>
          <Input
            placeholder={t('report.reportNamePlaceholder')}
            defaultValue={state.name}
            onChange={e => {
              state.name = e.target.value;
            }}
            status={inputStatus}
            onBlur={() => {
              setExceedLength(state.name?.length > 25);
              setInputStatus(state.name ? undefined : 'error');
            }}
          ></Input>
        </div>
      </div>
      <div className={cx('form-box')}>
        <span className={cx('step-label', 'required')}>{t('report.reportResult')}</span>
        <div className={cx('step-cont')}>
          <Radio.Group
            options={options}
            defaultValue={state.reportStatus}
            onChange={e => {
              state.reportStatus = e.target.value;
            }}
          ></Radio.Group>
        </div>
      </div>
      <div className={cx('form-box')}>
        <span className={cx('step-label', 'required')}>{t('report.choiceTemplate')}</span>
        {selectStatus === 'error' && <span className={cx('error')}>{t('report.required')}</span>}
        <div className={cx('step-cont')}>
          <Select
            className={cx('step-select')}
            placeholder={t('report.choiceTemplatePlaceholder')}
            defaultValue={state.template?.objectId}
            options={templateList}
            loading={isLoading}
            status={selectStatus}
            showSearch
            filterOption={(input, option) =>
              ((option?.label ?? '') as any)?.toLowerCase().includes(input.toLowerCase())
            }
            onChange={val => {
              state.template = templateList.find(d => d.value === val) ?? {};
            }}
            onBlur={() => {
              setSelectStatus(state.template?.objectId ? undefined : 'error');
            }}
          ></Select>
        </div>
      </div>
    </>
  );
};

export default React.memo(TemplateForm);
