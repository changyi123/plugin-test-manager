import { useMemoizedFn, useRequest } from 'ahooks';
import { Checkbox, message, Modal } from 'antd';
import { t } from 'i18next';
import { cloneDeep } from 'lodash';
import React from 'react';
import { useTranslation } from 'react-i18next';

import SelectorTag from '@/components/common/FilterSearch/SelectorTag';
import { getCustomFields } from '@/lib/api/proxima';
import { openFieldValuePopover } from '@/lib/api/sdk';
import { FILTER_EXPRESSIONS } from '@/lib/constants';

import cx from './index.less';

export type ActionType = {
  open: () => void;
};

const SendTypes = [
  {
    label: t('report.seneReportModal.sendType.siteMessage'),
    value: 'siteMessage',
  },
  {
    label: t('report.seneReportModal.sendType.email'),
    value: 'email',
  },
] as const;

const SendReportModal: React.FC<{
  actionRef: React.MutableRefObject<ActionType>;
}> = ({ actionRef }) => {
  const [sendTypeValue, setSendTypeValue] = React.useState([SendTypes[0].value] as any);
  const [assigneeSelectorValue, setAssigneeSelectorValue] = React.useState(null);
  const [open, setOpen] = React.useState(false);

  const { t } = useTranslation('', {
    keyPrefix: 'report.seneReportModal',
  });

  React.useImperativeHandle(actionRef, () => ({
    open() {
      setOpen(true);
    },
  }));

  const sendMessage = useMemoizedFn(() => {
    // TODO: 发送消息

    if (!sendTypeValue.length) return message.error(t('message.sendTypeEmpty'));
    if (!assigneeSelectorValue.length) return message.error(t('message.sendToEmpty'));

    // const body = {};
  });

  // 获取统计范围字段 fields
  const { data: selectorWithoutValue } = useRequest(
    async () => {
      const result = await getCustomFields(['assignee']);

      const getExpression = (value, expression) => {
        if (typeof value === 'number') {
          return value ? expression : null;
        }
        return value?.length ? expression : null;
      };

      return (
        result?.map(cur => ({
          key: cur.key,
          value: undefined,
          fieldId: cur.objectId,
          isExtend: cur.fieldType.isExtend,
          component: cur.fieldType.component,

          fieldName: t('sendTo.selectorTagName'),
          objectId: cur?.fieldId,
          active: Array.isArray(cur.value) ? !!cur.value?.length : !!cur.value,
          expression: getExpression(cur?.value, cur.expression),
        }))[0] ?? null
      );
    },
    {
      cacheKey: 'assignee_filter_props',
      staleTime: -1,
    },
  );

  const selector = React.useMemo(() => {
    if (selectorWithoutValue) {
      return {
        ...selectorWithoutValue,
        value: assigneeSelectorValue,
      };
    }
  }, [assigneeSelectorValue, selectorWithoutValue]);

  const getExpression = useMemoizedFn((component, key) => {
    return (FILTER_EXPRESSIONS(t)?.[component] ?? FILTER_EXPRESSIONS(t)?.[key])?.[0].value;
  });

  // 组装打开字段值选择器的函数
  const getFieldValueProps = useMemoizedFn((data, dom) => {
    const fieldId = data.fieldId;
    const expression = data.expression ?? getExpression(data.component, data.key);
    const props = {
      isExtend: false,
      fieldId,
      field: {
        fieldType: {
          component: data.key,
          label: data.fieldName,
          key: data.key,
        },
      },
      value: data?.value,
      label: data?.fieldName,
      //   workspace: workspace?.objectId,
      onChange: data => setAssigneeSelectorValue(data.value),
      onClose: () => {},
      expression,
      dom,
      useChange: false,
      showTab: false,
      allowNull: false,
    };
    return props;
  });

  return (
    <Modal
      open={open}
      onOk={sendMessage}
      className={cx('modal')}
      okText={t('button.send')}
      onCancel={() => setOpen(false)}
      title={<div className={cx('modalTitle')}>{t('modalTitle')}</div>}
    >
      <div className={cx('row')}>
        <div>
          <span className={cx('label')}>{t('sendType.label')}</span>
        </div>
        <span>
          <Checkbox.Group value={sendTypeValue} onChange={value => setSendTypeValue(value)}>
            {SendTypes.map(sendType => (
              <Checkbox key={sendType.value} value={sendType.value}>
                {sendType.label}
              </Checkbox>
            ))}
          </Checkbox.Group>
        </span>
      </div>
      <div className={cx('row')}>
        <div>
          <span className={cx('label')}>{t('sendTo.label')}</span>
        </div>
        <span>
          {selector && (
            <SelectorTag
              data={selector}
              key={selector?.fieldId}
              active={selector?.active}
              onClick={data => {
                const backup = cloneDeep(data);
                const props = getFieldValueProps(
                  backup,
                  document.querySelector(`#filter-search-selector-${selector?.fieldId}`),
                );

                openFieldValuePopover(props as any);
              }}
              showCloseIcon={false}
            />
          )}
        </span>
      </div>
    </Modal>
  );
};

export default React.memo(SendReportModal);
