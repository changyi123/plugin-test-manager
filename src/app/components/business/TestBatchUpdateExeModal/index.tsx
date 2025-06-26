import React, { useState } from 'react';
import _ from 'lodash';
import { Button, Modal, Space, Select, message } from 'antd';
import { getRootContainer } from '@/lib/utils/helper';
import useI18n from '@/lib/hooks/useI18n';
import fetch from '@/lib/utils/fetch';
import dayjs from 'dayjs';
import cx from './index.less';

export type TestBatchUpateModalActionRef = {
  open: ({ testRunIds }: { testRunIds?: string[], tableData?: any[] }) => Promise<void>;
};

interface TestBatchUpdateExeModalProps {
  actionRef?: React.ForwardedRef<TestBatchUpateModalActionRef>,
  refresh?: () => void,
}

const TestBatchUpdateExeModal: React.FC<TestBatchUpdateExeModalProps> = ({
  actionRef,
  refresh,
}) => {
  const { t } = useI18n();
  const [isVisible, setIsVisible] = useState(false);
  const [selOpt, setSelOpt] = useState([])
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
        const res = await fetch.post('/parse/api/search', {
          iql:`'key' in ${JSON.stringify(_keys)} and 'baseLineSources' in ['BaseLineItemVersion'] order by createdAt desc`,
          size: 9999,
          includeHiddenItem: true
        });
        const _newArr = _.map(_.get(res, 'data.payload.items', []), (_case) => _.pick(_case, ['key', 'id', 'itemId', 'values.baseLineItemVersion.name', 'createdAt']))
        const _arrLableKey = _.map(_newArr, (_case) => ({ label:  _case?.values?.baseLineItemVersion?.name +'@'+dayjs(_case?.createdAt).format('YYYY-MM-DD HH:mm'), value: _case.id, itemId: _case?.itemId, itemKey: _case?.key}))
        setSelOpt(_arrLableKey)
      },
    }),
    [],
  );
  
  const handleCloseModal = React.useCallback(() => {
    setTimeout(() => {
      setIsVisible(false);
    }, 100);
  }, []);
  
  const handleBatchUpdateVersion = async() => {
    const _name = (_.chain(selOpt).find({ value: selected }) as any).get('label', '').value()
    await fetch.post('/api-update-run-version', {
      add: {
        keys: keys,
      },
      sourceType: global.appKey ?? 'test_manager',
      baseLineItemVersion: {
        name: _.head(_.split(_name, '@')),
      },
    });
    message.success(t('common.success'));
    handleCloseModal()
    refresh && refresh()
  }

  const handleConfirmModal = async() => {
    if (_.isNaN(selected) || _.isEmpty(selected) || _.isNull(selected) || _.isUndefined(selected) || (selected && selected.trim()?.length === 0)) {
      message.success(t('components.business.testBatchUpateModel.msgUpateVersion'));
      return 
    }
    await handleBatchUpdateVersion()
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
      title={t('components.business.testBatchUpateModel.batchUpateExeCase')}
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
        <Select
          style={{ width: 400 }}
          options={selOpt}
          onChange={(v) => {
            setSelected(v)
          }}
          placeholder={t('components.business.testBatchUpateModel.msgUpateVersion')}
        />
      </Space>
    </Modal>
  );
};

export default TestBatchUpdateExeModal;
