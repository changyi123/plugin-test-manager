import { useMemoizedFn } from 'ahooks';
import { Dropdown, DropdownProps, message, notification } from 'antd/lib';
import React, { useState } from 'react';

import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';
import { copyTestCaseV2 } from '@/lib/api/item';
import { useBaseAction } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { CopyTestCaseV2PayloadTo } from '@/lib/types/Test';

import CopyModal from './Modal';

interface ICopyButtonProps extends DropdownProps {
  queryParams: Record<string, unknown>;
  onStart: () => void;
  onFinished: () => void;
}

const CopyButton: React.FC<ICopyButtonProps> = props => {
  const { t } = useI18n();
  const { testCaseFieldKeys } = useBaseAction();
  const [open, setOpen] = useState(false);
  const { disabled, onStart, onFinished, queryParams, ...otherProps } = props;

  const copyTestDetail = useMemoizedFn(async (to?: CopyTestCaseV2PayloadTo) => {
    try {
      await onStart();
      const res = await copyTestCaseV2({
        to,
        queryParams,
        fields: [].concat(SystemFieldKeys, testCaseFieldKeys),
      });
      if (res?.status === 'error') {
        message.error(res.data);
      }

      notification.success({
        message: t('page.repository.view.list.copyCaseMessageSuccess'),
      });
    } catch (e) {
      console.error(e);
    } finally {
      await onFinished();
      open && setOpen(false);
    }
  });

  return (
    <>
      {open && (
        <CopyModal
          open={open}
          onCancel={() => setOpen(false)}
          title={t('common.copyToOthers')}
          handleOk={copyTestDetail}
        />
      )}
      <Dropdown
        {...otherProps}
        menu={{
          items: [
            {
              key: 'copy',
              label: (
                <a onClick={() => !disabled && copyTestDetail()}>{t('common.copyToCurrent')}</a>
              ),
            },
            {
              key: 'copyToOthers',
              label: <a onClick={() => setOpen(true)}>{t('common.copyToOthers')}</a>,
            },
          ],
        }}
        disabled={disabled}
      />
    </>
  );
};

export default CopyButton;
