import React, { useState } from 'react';
import _ from 'lodash';
import { Button, Modal, Space, Input, message } from 'antd';
import { getRootContainer } from '@/lib/utils/helper';
import useI18n from '@/lib/hooks/useI18n';
import fetch from '@/lib/utils/fetch';
import cx from './index.less';

export type TestBatchCreateVersionModalActionRef = {
  open: ({ testRunIds }: { testRunIds?: string[], tableData?: any[] }) => Promise<void>;
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

  React.useImperativeHandle(
    actionRef,
    () => ({
      async open(data) {
        setIsVisible(true);
        const { testRunIds=[], tableData=[]} = data || {}
        const _keys = _.chain(tableData).filter(item => _.includes(testRunIds, item.objectId)).map('key').value();
        setKeys(_keys)
      },
    }),
    [],
  );
  
  const handleCloseModal = React.useCallback(() => {
    setTimeout(() => {
      setIsVisible(false);
    }, 100);
  }, []);

  const handleBatchCreateVersion = _.debounce(async() => {
    await fetch.post('/parse/api/baseLineItems', {
      add: {
        keys: keys,
      },
      sourceType: global.appKey ?? 'test_manager',
      baseLineItemVersion: {
        name: selected,
      },
    });
    message.success(t('common.success'));
    handleCloseModal()
    refresh && refresh()
  }, 500)

  const handleConfirmModal = async() => {
    if (_.isNaN(selected) || _.isEmpty(selected) || _.isNull(selected) || _.isUndefined(selected) || (selected && selected.trim()?.length === 0)) {
      message.success(t('components.business.testBatchUpateModel.placeholderVersionName'));
      return 
    }
    await handleBatchCreateVersion()
  }
  const ModalFooterActionButtonsNode = React.useMemo(() => {
    return (
      <>
        <Button onClick={handleCloseModal}>{t('common.close')}</Button>
        <Button type="primary" onClick={handleConfirmModal}>{t('common.confirm')}</Button>
      </>
    );
  }, [handleCloseModal, t, selected, keys, refresh]);

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
