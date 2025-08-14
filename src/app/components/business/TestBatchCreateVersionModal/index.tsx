import { Button, Input, message, Modal, Space } from 'antd';
import _ from 'lodash';
import React, { useState } from 'react';

import { CopyOutlined } from '@/icons';
import { batchCreateVersionsFn } from '@/lib/api/item';
import useI18n from '@/lib/hooks/useI18n';
import copyTextToClipboard from '@/lib/utils/copyToClipboard';
import { getRootContainer } from '@/lib/utils/helper';

export type TestBatchCreateVersionModalActionRef = {
  open: ({ testRunIds }: { testRunIds?: string[]; tableData?: any[] }) => Promise<void>;
};

interface TestBatchUpdateExeModalProps {
  actionRef?: React.ForwardedRef<TestBatchCreateVersionModalActionRef>;
  refresh?: () => void;
}

const TestBatchCreateVersionModal: React.FC<TestBatchUpdateExeModalProps> = ({
  actionRef,
  refresh,
}) => {
  const { t } = useI18n();
  const [isVisible, setIsVisible] = useState(false);
  const [selected, setSelected] = useState('');
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  React.useImperativeHandle(
    actionRef,
    () => ({
      async open(data) {
        setIsVisible(true);
        const { testRunIds = [], tableData = [] } = data || {};
        const _keys = _.chain(tableData)
          .filter(item => _.includes(testRunIds, item.id))
          .map('key')
          .value();
        setKeys(_keys);
      },
    }),
    [],
  );

  const handleCloseModal = React.useCallback(() => {
    setTimeout(() => {
      setIsVisible(false);
    }, 100);
  }, []);

  const handleBatchCreateVersion = _.debounce(async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 修改打版本接口
      const param = {
        add: {
          keys: keys,
        },
        sourceType: global.appKey ?? 'test_manager',
        baseLineItemVersion: {
          name: selected,
        },
      };
      const res = await batchCreateVersionsFn(param);
      if (res.status !== 'error') {
        message.success(t('common.success'));
        handleCloseModal();
        refresh && refresh();
      } else {
        // 处理已存在版本的情况
        try {
          const parsedData = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
          if (parsedData && Array.isArray(parsedData) && parsedData.length > 0) {
            const keys = parsedData.map(item => item.key || item.name);
            const displayKeys = keys.length > 10 ? keys.slice(0, 10) : keys;
            const displayText = displayKeys.join('、');
            const fullText = keys.join('、');
            const suffix =
              keys.length > 10
                ? t('components.business.testBatchUpateModel.moreItemsSuffix', {
                    count: keys.length,
                  })
                : '';

            const errorMessage = t('components.business.testBatchUpateModel.versionExistsError', {
              displayText,
              suffix,
            });

            message.error(
              <div>
                {errorMessage}
                {React.createElement(CopyOutlined, {
                  style: {
                    color: '#1890ff',
                    cursor: 'pointer',
                    marginLeft: '8px',
                    fontSize: '16px',
                  },
                  onClick: () => {
                    copyTextToClipboard(fullText);
                    message.success(
                      t('components.business.testBatchUpateModel.copyAllKeysSuccess'),
                    );
                  },
                  title: t('components.business.testBatchUpateModel.copyAllKeysTitle'),
                })}
              </div>,
            );
          } else {
            message.error(
              res.data ||
                res.message ||
                t('components.business.testBatchUpateModel.requestException'),
            );
          }
        } catch (error) {
          message.error(
            res.data ||
              res.message ||
              t('components.business.testBatchUpateModel.requestException'),
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }, 500);

  const handleConfirmModal = async () => {
    if (
      _.isNaN(selected) ||
      _.isEmpty(selected) ||
      _.isNull(selected) ||
      _.isUndefined(selected) ||
      (selected && selected.trim()?.length === 0)
    ) {
      message.success(t('components.business.testBatchUpateModel.placeholderVersionName'));
      return;
    }
    await handleBatchCreateVersion();
  };
  const ModalFooterActionButtonsNode = React.useMemo(() => {
    return (
      <>
        <Button onClick={handleCloseModal}>{t('common.close')}</Button>
        <Button type="primary" onClick={handleConfirmModal} loading={loading}>
          {t('common.confirm')}
        </Button>
      </>
    );
  }, [handleCloseModal, handleConfirmModal, t, loading]);

  return (
    <Modal
      width={500}
      title={t('components.business.testBatchUpateModel.batchCreateVersion')}
      destroyOnClose
      open={isVisible}
      maskClosable={false}
      onCancel={handleCloseModal}
      getContainer={getRootContainer}
      footer={ModalFooterActionButtonsNode}
      bodyStyle={{
        height: '150px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Space>
        <span>{t('components.business.testBatchUpateModel.versionName')}: </span>
        <Input
          style={{ width: 200 }}
          onChange={v => {
            setSelected(v.target.value);
          }}
          maxLength={20}
          placeholder={t('components.business.testBatchUpateModel.placeholderVersionName')}
        />
      </Space>
    </Modal>
  );
};

export default TestBatchCreateVersionModal;
