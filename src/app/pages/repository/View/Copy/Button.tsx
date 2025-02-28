import { useMemoizedFn } from 'ahooks';
import { Dropdown, DropdownProps, message, notification } from 'antd/lib';
import React, { useState } from 'react';

import { copyTestCaseWithProcess } from '@/components/business/BatchResult/hooks';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { CopyTestCaseV2PayloadTo } from '@/lib/types/Test';

import CopyModal from './Modal';

interface ICopyButtonProps extends DropdownProps {
  getQueryParams: () => Record<string, unknown>;
  onStart: () => void;
  onFinished: () => void;
}

const CopyButton: React.FC<ICopyButtonProps> = props => {
  const { t } = useI18n();
  const {
    workspace,
    config: { itemTypeMap },
  } = useTestConfig();
  const [open, setOpen] = useState(false);
  const { disabled, onStart, onFinished, getQueryParams, ...otherProps } = props;

  const copyTestDetail = useMemoizedFn(async (to?: CopyTestCaseV2PayloadTo) => {
    try {
      await onStart();
      await copyTestCaseWithProcess({
        itemType: itemTypeMap.TestCase,
        queryParams: getQueryParams(),
        workspace: (to?.workspace ?? workspace) as any,
        repository: to?.repository,
        needSuffix: !to,
        handleSuccess: async () => {
          notification.success({
            message: t('page.repository.view.list.copyCaseMessageSuccess'),
          });
          await onFinished();
          open && setOpen(false);
        },

        handleFail: async error => {
          message.error(error.message);
          await onFinished();
          open && setOpen(false);
        },
      });
    } catch (e) {
      console.error(e);
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
