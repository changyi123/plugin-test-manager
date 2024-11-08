import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { Formik } from 'formik';
import { Button, message, Select } from 'insight';
import { cloneDeep } from 'lodash';
import {
  DropdownInput,
  FilterQuery,
  useQueryFields,
} from 'proxima-sdk/components/Components/Chart';
import { FormField } from 'proxima-sdk/components/Components/Common';
import Icon, { CalculatorIcon } from 'proxima-sdk/components/Components/Icons';
import { useI18n } from 'proxima-sdk/hooks/Hooks';
import { BASIC_PIE_CHART } from 'proxima-sdk/lib/Global';
import { CustomField as CustomFieldProps } from 'proxima-sdk/schema/types/models';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AntdConfigProvider from '../common/AntdConfigProvider';
import { Dimension, TInterval } from '../common/Dimension';
import GlobalFilter from '../common/GlobalFilter';
import {
  BASIC_TABLE_CHART_INIT_VALUE,
  CASE_TABLE_CHART_INIT_VALUE,
  INIT_OPTION,
  X_DATA_KEY,
} from '../lib/global';
import useGlobalFilterIql from '../lib/hooks/useGlobalFilterIql';
import { GroupValue, OptionProps } from '../lib/type';
import { getOpenSwitchGlobalSearchIql } from '../lib/util';
import FormulaModal from './FormulaModal';
import cx from './Option.less';

const initialFormulaValues = {
  name: '',
  formula: '',
  type: 'number',
  precision: 2,
};

const Option: React.FC<OptionProps> = ({
  allManifest,
  usefulFields,
  option,
  setOption,
  setSearchOption,
  uid,
}) => {
  const i18n = useI18n();
  const { type, group, value, cluster, formulas: PropsFormulas = [] } = option;

  const [visible, setVisible] = useState(false);
  const [formulas, setFormulas] = useState(PropsFormulas);
  const [initialFormula, setInitialFormula] = useState(initialFormulaValues);
  const [isFormulaEdit, setIsFormulaEdit] = useState(false);
  // 全局筛选器数据，用于编辑页全局筛选器开关的回显
  const [globalFiltersIql, setGlobalFiltersIql] = useGlobalFilterIql(uid);

  const formulasName = useMemo(() => formulas.map(formula => formula.name), [formulas]);

  // 获取数据源类型的自定义字段
  const _xData = useQueryFields({
    customFields: [
      {
        name: '测试用例模块',
        key: 'r_test_manager_repository',
        fieldType: { key: 'r_test_manager_repository_keyword' },
      },
    ],
    keys: ['r_test_manager_repository_keyword'],
  });

  // 获取列纬度的自定义字段
  const _clusterData = useQueryFields({
    customFields: usefulFields,
    keys: X_DATA_KEY,
  });

  // 只有事项数
  const numberFields = useMemo(() => {
    return [
      {
        key: 'count',
        fieldType: {
          key: 'count',
        },
        name: i18n.t('reportPlugin.common.iql.count'),
      },
    ] as CustomFieldProps[];
  }, [i18n]);

  const ref = useRef(null);

  const initialValues = {
    type,
    group: (group?.[0] as GroupValue)?.key || undefined,
    value: value,
    cluster: (cluster?.[0] as GroupValue)?.key || undefined,
  };

  useEffect(() => {
    // 如果是第一次没有值
    if (!group) {
      setOption(CASE_TABLE_CHART_INIT_VALUE);
      setSearchOption(BASIC_TABLE_CHART_INIT_VALUE);
    }
  }, [group, cluster]);

  const typeOptions = useMemo(() => {
    return allManifest.map(item => (
      <Select.Option value={item.originalKey} key={item.originalKey} option={item.option}>
        {item.name}
      </Select.Option>
    ));
  }, [allManifest]);

  // isDetailGlobalFilterConds标识触发详情页的查询，则取的是
  const handleSubmit = () => {
    setSearchOption({
      ...option,
      globalFiltersIql: getOpenSwitchGlobalSearchIql(globalFiltersIql),
    });
  };

  const openAddFormulas = useCallback(() => {
    setVisible(true);
  }, []);

  const handleSubmitFormula = useCallback(
    values => {
      if (isFormulaEdit) {
        const index = formulas.findIndex(formula => formula.name === initialFormula.name);
        const newFormulas = cloneDeep(formulas);
        newFormulas.splice(index, 1, values);
        setFormulas(newFormulas);
        setOption({
          ...option,
          formulas: newFormulas,
        });
      } else {
        setFormulas([].concat(formulas, [values]));
        setOption({
          ...option,
          formulas: [].concat(formulas, [values]),
        });
      }
      closeFormulaModal();
    },
    [formulas, option, isFormulaEdit],
  );

  const handleDeleteFormula = useCallback(
    index => {
      const newFormulas = cloneDeep(formulas);
      newFormulas.splice(index, 1);
      setFormulas(newFormulas);
      setOption({
        ...option,
        formulas: newFormulas,
      });
    },
    [formulas, option],
  );

  const handleEditFormula = useCallback(formula => {
    setInitialFormula(formula);
    setVisible(true);
    setIsFormulaEdit(true);
  }, []);

  const closeFormulaModal = useCallback(() => {
    setInitialFormula(initialFormulaValues);
    setVisible(false);
    setIsFormulaEdit(false);
  }, []);

  return (
    <AntdConfigProvider>
      {visible && (
        <FormulaModal
          visible={visible}
          onCancel={closeFormulaModal}
          handleSubmit={handleSubmitFormula}
          formulasName={formulasName}
          initialValues={initialFormula}
          isEdit={isFormulaEdit}
        />
      )}
      <Formik innerRef={ref} initialValues={initialValues} onSubmit={handleSubmit}>
        {({ setFieldValue, handleSubmit }) => (
          <>
            <div className={'form-main-title'}>
              <strong className={'info-title'}>{i18n.t('reportPlugin.common.option.title')}</strong>
              <span
                className={'option-reset'}
                onClick={() => {
                  setOption({ ...option, ...INIT_OPTION });
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
                  <Select {...field} optionFilterProp="children" disabled>
                    {typeOptions}
                  </Select>
                </>
              )}
            </FormField>
            <FormField label={i18n.t('reportPlugin.basicTableChart.option.xAxis')} name="group">
              {() => (
                <>
                  <Dimension
                    value={group}
                    chartType={type}
                    fields={_xData}
                    onChange={selectedOptions => {
                      if (selectedOptions.length > 3) {
                        return message.error(
                          i18n.t('reportPlugin.basicTableChart.option.errorMsg.limitGroup'),
                        );
                      }
                      const group = selectedOptions.map(options => {
                        const fieldValue = options?.[0]?.value;
                        const intervalValue = options?.[1]?.value;
                        const customField = _xData.find(field => field.key === fieldValue);
                        const { key, name, fieldType } = customField;
                        const newGroup: GroupValue = {
                          key,
                          name,
                          fieldType: fieldType.key,
                        };
                        if (intervalValue) {
                          newGroup.interval = intervalValue as TInterval;
                        }
                        return newGroup;
                      });
                      // 重复选择一个字段的统计周期，去重之前选择的
                      const selectedMap = new Map();
                      group.forEach((g, index) => {
                        if (selectedMap.has(g.fieldType)) {
                          const hasIndex = selectedMap.get(g.fieldType);
                          group.splice(hasIndex, 1);
                        }
                        selectedMap.set(g.fieldType, index);
                      });
                      setOption({
                        ...option,
                        group,
                      });
                      setFieldValue('group', group);
                    }}
                    placeholder={i18n.t('reportPlugin.basicTableChart.option.xAxisPlaceholder')}
                    multiple
                    disabled
                  />
                </>
              )}
            </FormField>
            <FormField label={i18n.t('reportPlugin.basicTableChart.option.yAxis')} name="value">
              {({ field }) => (
                <DropdownInput
                  {...field}
                  customFields={numberFields}
                  value={value}
                  onChange={val => {
                    setOption({
                      ...option,
                      value: val,
                    });
                    setFieldValue('value', val);
                  }}
                  mode={type === BASIC_PIE_CHART ? '' : 'multiple'}
                  disabled
                />
              )}
            </FormField>
            <FormField label={i18n.t('reportPlugin.basicTableChart.option.cluster')} name="cluster">
              {() => (
                <Dimension
                  value={cluster}
                  chartType={type}
                  fields={_clusterData}
                  onChange={selectedOptions => {
                    if (selectedOptions.length > 2) {
                      return message.error(
                        i18n.t('reportPlugin.basicTableChart.option.errorMsg.limitCluster'),
                      );
                    }
                    const cluster = selectedOptions.map((option: any) => {
                      const fieldValue = option?.value;
                      const customField = _clusterData.find(field => field.key === fieldValue);
                      const { key, name, fieldType } = customField;
                      const newGroup: GroupValue = {
                        key,
                        name,
                        fieldType: fieldType.key,
                      };
                      return newGroup;
                    });
                    // 重复选择一个字段的统计周期，去重之前选择的
                    const selectedMap = new Map();
                    cluster.forEach((g, index) => {
                      if (selectedMap.has(g.fieldType)) {
                        const hasIndex = selectedMap.get(g.fieldType);
                        cluster.splice(hasIndex, 1);
                      }
                      selectedMap.set(g.fieldType, index);
                    });
                    setOption({
                      ...option,
                      cluster,
                    });
                    setFieldValue('group', cluster);
                  }}
                  placeholder={i18n.t('reportPlugin.basicTableChart.option.clusterPlaceholder')}
                  multiple
                />
              )}
            </FormField>
            <Button
              type="text"
              onClick={openAddFormulas}
              className={'formulas-add'}
              icon={<PlusOutlined />}
            >
              {i18n.t('reportPlugin.basicTableChart.option.addColumn')}
            </Button>
            <div className={cx('formulas-box')}>
              {formulas.map((formula, index) => (
                <span
                  className={cx('formula')}
                  onClick={() => handleEditFormula(formula)}
                  key={index}
                >
                  <Icon component={CalculatorIcon} />
                  <span className={cx('formula-name')}>{formula.name}</span>
                  <CloseOutlined
                    onClick={e => {
                      e.stopPropagation();
                      handleDeleteFormula(index);
                    }}
                  />
                </span>
              ))}
            </div>

            <div className={'form-main-title'}>
              <strong className={'info-title'}>{i18n.t('reportPlugin.common.filter.title')}</strong>
            </div>
            <FilterQuery setOption={setOption} option={option} />
            <GlobalFilter
              globalFiltersIql={globalFiltersIql}
              setGlobalFiltersIql={setGlobalFiltersIql}
            />
            <Button type="primary" className={cx('chart-search')} onClick={() => handleSubmit()}>
              {i18n.t('reportPlugin.common.submit')}
            </Button>
          </>
        )}
      </Formik>
    </AntdConfigProvider>
  );
};

export default Option;
