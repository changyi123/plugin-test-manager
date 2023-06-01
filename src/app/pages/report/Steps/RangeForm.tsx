import { useRequest, useUpdateEffect } from 'ahooks';
import dayjs from 'dayjs';
import { values } from 'lodash';
import cloneDeep from 'lodash/cloneDeep';
import React, { useCallback, useMemo, useState } from 'react';

import SelectorTag from '@/components/common/FilterSearch/SelectorTag';
import { handleDataSelector } from '@/components/common/FilterSearch/utils';
import { getTestEntityByQuery } from '@/lib/api/item';
import { getCustomFields } from '@/lib/api/proxima';
import { openFieldValuePopover } from '@/lib/api/sdk';
import {
  FILTER_EXPRESSIONS,
  getReportFilterFields,
  IS_EXTEND_FIELDS,
  REPORT_SYSTEM_FIELD,
  TestPlanModel,
  TestType,
} from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';
import { Workspace } from '@/lib/types/App';
import { isDate } from '@/lib/utils/iql';

import cx from './RangeForm.less';

export type FormProps = {
  state: any;
  workspace?: Workspace;
};

const RangeForm: React.FC<any> = ({ state, workspace }) => {
  const { t } = useI18n();
  const [selectors, setSelectors] = useState(undefined);
  // 获取统计范围字段 fields
  const { data: defaultSelectors, loading } = useRequest(
    async () => {
      const res = await getCustomFields(REPORT_SYSTEM_FIELD);

      return [...getReportFilterFields(t), ...res]?.reduce((prev, cur) => {
        prev[cur.objectId] = {
          component: cur.fieldType.component,
          expression: null,
          isExtend: cur.fieldType.isExtend,
          key: cur.key,
          fieldId: cur.objectId,
          fieldName: cur.name,
          value: undefined,
        };

        return prev;
      }, {});
    },
    {
      ready: Boolean(REPORT_SYSTEM_FIELD?.length),
      refreshDeps: [REPORT_SYSTEM_FIELD],
      cacheKey: `Range_Form`,
      staleTime: -1,
    },
  );

  console.info(11111111111, selectors);

  useUpdateEffect(() => {
    if (!loading && defaultSelectors) {
      setSelectors(defaultSelectors);
    }
  }, [defaultSelectors, loading]);

  const getExpression = useCallback(
    (component, key) => {
      return (FILTER_EXPRESSIONS(t)?.[component] ?? FILTER_EXPRESSIONS(t)?.[key])?.[0].value;
    },
    [t],
  );

  const currentSelector = useMemo(() => {
    const getExpression = (value, expression) => {
      if (typeof value === 'number') {
        return value ? expression : null;
      }
      return value?.length ? expression : null;
    };
    const item = values(selectors).map(item => ({
      ...item,
      name: item?.fieldName,
      objectId: item?.fieldId,
      active: Array.isArray(item.value) ? !!item.value?.length : !!item.value,
      expression: getExpression(item?.value, item.expression),
    }));
    return item || [];
  }, [selectors]);

  const updateSelectorValue = useCallback(
    val => {
      const data = cloneDeep(selectors);
      const target = data[val.objectId];
      if (target) {
        target.value = val.value;
        target.expression = val.expression;
        state.selectors = handleDataSelector(data);
        setSelectors(state.selectors);
      }
    },
    [selectors, state],
  );

  const extendFetch = useCallback(async () => {
    const { list: data } = await getTestEntityByQuery({
      query: {
        workspaceKey: workspace?.key,
        type: TestType.Plan,
      },
      limit: 9999,
      select: ['id', 'name'],
    });

    return (
      data?.map(d => ({
        ...d,
        value: d.id,
        label: d.name,
        toolTip: d.name,
      })) ?? []
    );
  }, [workspace?.key]);

  // 组装打开字段值选择器的函数
  const getFieldValueProps = useCallback(
    (data, dom) => {
      const fieldId = data.fieldId;
      const systemTarget = getReportFilterFields(t).find(item => item.objectId === fieldId);
      const isExtend = IS_EXTEND_FIELDS.includes(data.component);
      const component = IS_EXTEND_FIELDS.includes(data.component) ? data.component : data.key;
      const expression = data.expression ?? getExpression(data.component, data.key);
      const props = {
        isExtend: systemTarget?.fieldType?.isExtend ?? isExtend,
        fieldId,
        field: {
          fieldType: {
            component: component,
            label: data.fieldName,
            key: data.key,
          },
        },
        value: data?.value,
        label: data?.fieldName,
        workspace: workspace?.objectId,
        onChange: updateSelectorValue,
        onClose: () => {},
        expression,
        dom,
        useChange: false,
        showTab: false,
      };
      if (fieldId === TestPlanModel) {
        (props as any).fetchMethod = () => extendFetch();
      }
      return props;
    },
    [t, getExpression, workspace?.objectId, updateSelectorValue, extendFetch],
  );

  const generateFieldValue = useCallback(data => {
    return isDate(data.key) ? (data.value as string[])?.map(item => dayjs(item)) : data.value;
  }, []);
  return (
    <>
      <div className={cx('form-box')}>
        <span className={cx('step-label')}>{t('common.report.range')}</span>
        <div className={cx('step-cont')}>
          {currentSelector
            ?.filter(item => item?.fieldId !== 'name')
            .map(item => (
              <SelectorTag
                key={item?.fieldId}
                active={item?.active}
                data={item}
                onClick={data => {
                  const backup = cloneDeep(data);
                  backup.value = generateFieldValue(backup);
                  const props = getFieldValueProps(
                    backup,
                    document.querySelector(`#filter-search-selector-${item?.fieldId}`),
                  );
                  openFieldValuePopover(props as any);
                }}
                showCloseIcon={false}
              />
            ))}
        </div>
      </div>
      {/* <div className={cx('form-box')}>
        <span className={cx('step-label')}>{t('common.report.reportInfo')}</span>
        <div className={cx('step-cont')}></div>
      </div> */}
    </>
  );
};

export default React.memo(RangeForm);
