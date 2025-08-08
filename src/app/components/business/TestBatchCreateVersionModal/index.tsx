import React, { useState } from 'react';
import _ from 'lodash';
import { Button, Modal, Space, Input, message } from 'antd';
import { getRootContainer } from '@/lib/utils/helper';
import useI18n from '@/lib/hooks/useI18n';
import cx from './index.less';
import fetch from '@/lib/utils/fetch';
import { batchCreateVersionsFn } from '@/lib/api/item';

export type TestBatchCreateVersionModalActionRef = {
  open: ({ testRunIds }: { testRunIds?: string[] }) => Promise<void>;
};

interface TestBatchUpdateExeModalProps {
  actionRef?: React.ForwardedRef<TestBatchCreateVersionModalActionRef>,
  refresh?: () => void,
}

const TestBatchCreateVersionModal: React.FC<TestBatchUpdateExeModalProps> = ({
  actionRef,
  refresh,
}) => {
  const { t } = useI18n();
  const [isVisible, setIsVisible] = useState(false);
  const [selected, setSelected] = useState('')
  const [keys, setKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(false);

  React.useImperativeHandle(
    actionRef,
    () => ({
      async open(data) {
        setIsVisible(true);
        const { testRunIds = [] } = data || {}
        setKeys(testRunIds)
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

      await fetch.post('/parse/api/baseLineItems', {
        add: {
          keys: keys,
        },
        sourceType: global.appKey ?? 'test_manager',
        baseLineItemVersion: {
          name: selected,
        },
      });

      // TODO: 修改打版本接口
      // const param = {
      //   add: {
      //     keys: keys,
      //   },
      //   sourceType: global.appKey ?? 'test_manager',
      //   baseLineItemVersion: {
      //     name: selected,
      //   },
      // };
      // const res = await batchCreateVersionsFn(param);
      // console.log('---res---', res)

      message.success(t('common.success'));
      handleCloseModal();
      refresh && refresh();
    } finally {
      setLoading(false);
    }
  }, 500);

  const handleConfirmModal = async() => {
    if (_.isNaN(selected) || _.isEmpty(selected) || _.isNull(selected) || _.isUndefined(selected) || (selected && selected.trim()?.length === 0)) {
      message.success(t('components.business.testBatchUpateModel.placeholderVersionName'));
      return 
    }
    await handleBatchCreateVersion();
  }
  const ModalFooterActionButtonsNode = React.useMemo(() => {
    return (
      <>
        <Button onClick={handleCloseModal}>{t('common.close')}</Button>
        <Button type="primary" onClick={handleConfirmModal} loading={loading}>{t('common.confirm')}</Button>
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
      className={cx('testBatchUpdateExeModal')}
      footer={ModalFooterActionButtonsNode}
      bodyStyle={{ height: '150px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    >
      <Space>
        <span>{t('components.business.testBatchUpateModel.versionName')}: </span>
        <Input
          style={{ width: 200 }}
          onChange={(v) => {
            setSelected(v.target.value)
          }}
          placeholder={t('components.business.testBatchUpateModel.placeholderVersionName')}
        />
      </Space>
    </Modal>
  );
};

export default TestBatchCreateVersionModal;
