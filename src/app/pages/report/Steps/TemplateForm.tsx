import { useRequest } from 'ahooks';
import { Input, Radio, Select } from 'antd';
import React, { useMemo, useState } from 'react';

import useI18n from '@/lib/hooks/useI18n';

import { FormProps } from './RangeForm';
import cx from './TemplateForm.less';

const TemplateForm: React.FC<FormProps> = ({ state, workspace }) => {
  const { t } = useI18n();

  const [inputStatus, setInputStatus] = useState(undefined);
  const [radioStatus, setRadioStatus] = useState(undefined);
  const [selectStatus, setSelectStatus] = useState(undefined);

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

  // 查询模板数据
  const { data: templateList, loading } = useRequest(
    async () => {
      // TODO 查询模板数据
      return [];
    },
    {
      ready: Boolean(workspace?.objectId),
      cacheKey: `templateList_${workspace?.key}`,
      refreshDeps: [workspace?.objectId],
      staleTime: -1,
    },
  );

  return (
    <>
      <div className={cx('form-box')}>
        <span className={cx('step-label', 'required')}>{t('report.reportName')}</span>
        {inputStatus === 'error' && <span className={cx('error')}>{t('report.required')}</span>}
        <div className={cx('step-cont')}>
          <Input
            placeholder={t('report.reportNamePlaceholder')}
            defaultValue={state.name}
            onChange={e => {
              state.name = e.target.value;
            }}
            status={inputStatus}
            onBlur={() => {
              setInputStatus(state.name ? undefined : 'error');
            }}
          ></Input>
        </div>
      </div>
      <div className={cx('form-box')}>
        <span className={cx('step-label', 'required')}>{t('report.reportResult')}</span>
        {radioStatus === 'error' && <span className={cx('error')}>{t('report.required')}</span>}
        <div className={cx('step-cont')}>
          <Radio.Group
            options={options}
            defaultValue={state.conclusion}
            onChange={e => {
              state.conclusion = e.target.value;
            }}
            onBlur={() => {
              setRadioStatus(state.conclusion ? undefined : 'error');
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
            loading={loading}
            status={selectStatus}
            onChange={e => {
              state.template = templateList.find(d => d.value === e.target.value);
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
