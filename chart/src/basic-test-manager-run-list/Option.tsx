import { Formik } from 'formik';
import { Button, InputNumber, Select } from 'insight';
import { SingleEvents } from 'proxima-event';
import { FilterQuery, useItemListColumns } from 'proxima-sdk/components/Components/Chart';
import { ColumnsSettings, FormField } from 'proxima-sdk/components/Components/Common';
import { useI18n } from 'proxima-sdk/hooks/Hooks';
import React, { useCallback, useMemo, useRef } from 'react';

import { useFields } from '@/lib/hooks/useBaseTableColumns';

import { AntdTeamConfigProvider } from '../common/AntdConfigProvider';
import GlobalFilter from '../common/GlobalFilter';
import { CHANGE_PAGE, DEFAULT_SHOW_FIELDS, INIT_ITEM_LIST_OPTION } from '../lib/global';
import useGlobalFilterIql from '../lib/hooks/useGlobalFilterIql';
import { OptionProps } from '../lib/type';
import { getOpenSwitchGlobalSearchIql } from '../lib/util';
import cx from './../common/BaseTableOption.less';

const Option: React.FC<OptionProps> = ({
  option: originOption,
  workspace,
  allManifest,
  usefulFields: originUsefulFields,
  setOption,
  setSearchOption,
  uid,
}) => {
  const i18n = useI18n();
  const { iql, pageSize, columnKeys = DEFAULT_SHOW_FIELDS, type } = originOption;
  const option = useMemo(() => {
    const newOption = originOption;
    if (!originOption?.queryType) {
      newOption.queryType = 'expression';
    }
    if (!originOption?.pageSize) {
      newOption.pageSize = 10;
    }
    return newOption;
  }, [originOption]);

  const oldIql = useRef(iql);
  const oldPageSize = useRef(pageSize);
  // 全局筛选器数据，用于编辑页全局筛选器开关的回显
  const [globalFiltersIql, setGlobalFiltersIql] = useGlobalFilterIql(uid);

  //全局不需要workspace
  const usefulFields = useFields(originUsefulFields);
  const { columns } = useItemListColumns(usefulFields, columnKeys, workspace ? workspace : null);
  console.info('Option', originUsefulFields, workspace, usefulFields, uid, columns);

  const ref = useRef(null);

  const initialValues = {
    iql: iql,
    type,
  };

  const handleColumnChange = useCallback(
    columns => {
      const columnKeys = columns.filter(c => !c.isHidden).map(c => c.key);
      setOption({ ...option, columnKeys });
    },
    [option, setOption],
  );

  const typeOptions = useMemo(() => {
    return allManifest.map(item => (
      <Select.Option value={item.originalKey} key={item.originalKey} option={item.option}>
        {item.name}
      </Select.Option>
    ));
  }, [allManifest]);

  const handleSubmit = () => {
    if (oldIql.current !== iql || oldPageSize.current !== pageSize) {
      SingleEvents.getInstance().fire(CHANGE_PAGE);
      oldIql.current = iql;
      oldPageSize.current = pageSize;
    }
    setSearchOption({
      ...option,
      globalFiltersIql: getOpenSwitchGlobalSearchIql(globalFiltersIql),
    });
  };

  return (
    <AntdTeamConfigProvider>
      <Formik innerRef={ref} initialValues={initialValues} onSubmit={handleSubmit}>
        {({ handleSubmit, setFieldValue }) => (
          <>
            <div className={'form-main-title'}>
              <strong className={'info-title'}>{i18n.t('reportPlugin.common.option.title')}</strong>
              <span
                className={'option-reset'}
                onClick={() => {
                  setOption({ ...option, ...INIT_ITEM_LIST_OPTION });
                  setFieldValue('group', undefined);
                  setFieldValue('cluster', undefined);
                }}
              >
                {i18n.t('reportPlugin.common.option.reset')}
              </span>
            </div>
            <FormField label={i18n.t('reportPlugin.common.option.type')} name="type">
              {({ field }) => (
                <>
                  <Select disabled {...field} optionFilterProp="children">
                    {typeOptions}
                  </Select>
                </>
              )}
            </FormField>
            <FormField
              label={i18n.t('reportPlugin.basicDemandSpeedChart.option.pageSize')}
              name="pageSize"
            >
              {({ field }) => (
                <>
                  <InputNumber
                    {...field}
                    parser={value => `$ ${value}`.replace(/[^\d]/g, '')}
                    formatter={value => (value as string).replace(/[^\d]/g, '')}
                    min={10}
                    max={50}
                    placeholder={i18n.t(
                      'reportPlugin.basicDemandSpeedChart.option.pageSizePlaceholder',
                    )}
                    value={pageSize}
                    onChange={val => {
                      if (val === null) {
                        setOption({ ...option, pageSize: 10 });
                        setFieldValue('pageSize', 10);
                      } else {
                        setOption({ ...option, pageSize: val });
                        setFieldValue('pageSize', val);
                      }
                    }}
                  />
                </>
              )}
            </FormField>
            <FormField name="ColumnsList">
              {({ field }) => (
                <>
                  <div className={cx('columns')}>
                    <ColumnsSettings
                      {...field}
                      titleText={i18n.t('reportPlugin.basicDemandSpeedChart.option.columnsList')}
                      customColumns={columns}
                      setColumnSettings={handleColumnChange}
                    />
                  </div>
                </>
              )}
            </FormField>
            <div className={'form-main-title'}>
              <strong className={'info-title'}>{i18n.t('reportPlugin.common.filter.title')}</strong>
            </div>
            <FilterQuery setOption={setOption} option={option} disabled={false} />
            <GlobalFilter
              globalFiltersIql={globalFiltersIql}
              setGlobalFiltersIql={setGlobalFiltersIql}
            />
            <Button type="primary" className="chart-search" onClick={() => handleSubmit()}>
              {i18n.t('reportPlugin.common.submit')}
            </Button>
          </>
        )}
      </Formik>
    </AntdTeamConfigProvider>
  );
};

export default Option;
