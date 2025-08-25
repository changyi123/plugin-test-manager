import { Button, message, Modal, Select, Space } from 'antd';
import dayjs from 'dayjs';
import _ from 'lodash';
import React, { useState } from 'react';

import { updateCaseVersion } from '@/lib/api/item';
import useI18n from '@/lib/hooks/useI18n';
import fetch from '@/lib/utils/fetch';
import { getRootContainer } from '@/lib/utils/helper';

export type TestBatchUpateModalActionRef = {
  open: (params: {
    caseId?: string;
    testRunIds?: string[];
    tableData?: any[];
    workspaceKey?: string;
  }) => Promise<void>;
};

interface TestBatchUpdateExeModalProps {
  actionRef?: React.ForwardedRef<TestBatchUpateModalActionRef>;
  refresh?: () => void;
}

/*
 * @description:  这个文件我合并过来的，不用看提交人是我。后续有问题不要问我为什么这样写
 * */
const TestBatchUpdateExeModal: React.FC<TestBatchUpdateExeModalProps> = ({
  actionRef,
  refresh,
}) => {
  const { t } = useI18n();
  const [isVisible, setIsVisible] = useState(false);
  const [selOpt, setSelOpt] = useState([]);
  const [selected, setSelected] = useState('');
  const [keys, setKeys] = useState<string[]>([]);
  const [currentTestRunIds, setCurrentTestRunIds] = useState<string[]>([]);
  const [currentWorkspaceKey, setCurrentWorkspaceKey] = useState<string>();

  React.useImperativeHandle(
    actionRef,
    () => ({
      async open(data) {
        setIsVisible(true);

        const { caseId, testRunIds = [], tableData = [], workspaceKey } = data || {};
        setCurrentTestRunIds(testRunIds);
        setCurrentWorkspaceKey(workspaceKey);

        const curItem: any = _.chain(tableData)
          .filter(item => _.includes(testRunIds, item.objectId))
          .value();
        // console.info('curItem', curItem);
        const _keys = _.chain(curItem).map('key').value();
        setKeys(_keys);
        const res = await fetch.post('/parse/api/search', {
          iql: `'key' in ${JSON.stringify(
            _keys,
          )} and 'baseLineSources' in ['BaseLineItemVersion'] order by createdAt desc`,
          size: 9999,
          includeHiddenItem: true,
        });
        const _newArr = _.map(_.get(res, 'data.payload.items', []), _case =>
          _.pick(_case, ['key', 'id', 'itemId', 'values.baseLineItemVersion.name', 'createdAt']),
        );
        const _arrLableKey = _.map(_newArr, _case => ({
          label:
            _case?.values?.baseLineItemVersion?.name +
            '@' +
            dayjs(_case?.createdAt).format('YYYY-MM-DD HH:mm'),
          value: _case.id,
          itemId: _case?.itemId,
        }));
        const latestOption = {
          label: t('common.newest'),
          value: 'new', // 版本 不传
          itemId: caseId,
        };

        const isSnapShot = !!curItem?.[0].referenceCaseSnapshot && !curItem?.[0].referenceCase;
        setSelOpt(isSnapShot ? [] : [latestOption, ..._arrLableKey]);
      },
    }),
    [],
  );

  const handleCloseModal = React.useCallback(() => {
    setTimeout(() => {
      setIsVisible(false);
    }, 100);
  }, []);

  const handleBatchUpdateVersion = async () => {
    const selectedOption = _.chain(selOpt).find({ value: selected }).value();
    const itemId = selectedOption?.itemId;
    const value = selectedOption?.value;
    console.info('value', value);
    // const _name = selectedOption?.label || '';
    try {
      const res = await updateCaseVersion({
        runId: currentTestRunIds[0],
        baseLineItemId: value === 'new' ? null : (itemId && value) || null,
        caseId: itemId,
        workspaceKey: currentWorkspaceKey,
      });

      if (res?.status === 'ok') {
        message.success(t('common.success'));
        handleCloseModal();
        refresh && refresh();
      } else {
        message.error(res?.data || t('common.error'));
      }
    } catch (error) {
      message.error(error?.message || t('common.error'));
    }
  };

  const handleConfirmModal = async () => {
    if (
      _.isNaN(selected) ||
      _.isEmpty(selected) ||
      _.isNull(selected) ||
      _.isUndefined(selected) ||
      (selected && selected.trim()?.length === 0)
    ) {
      message.success(t('components.business.testBatchUpateModel.msgUpateVersion'));
      return;
    }
    await handleBatchUpdateVersion();
  };
  const ModalFooterActionButtonsNode = React.useMemo(() => {
    return (
      <>
        <Button onClick={handleCloseModal}>{t('common.close')}</Button>
        <Button type="primary" onClick={handleConfirmModal}>
          {t('common.confirm')}
        </Button>
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
      footer={ModalFooterActionButtonsNode}
      bodyStyle={{
        height: '150px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Space>
        <Select
          style={{ width: 400 }}
          options={selOpt}
          onChange={v => {
            setSelected(v);
          }}
          placeholder={t('components.business.testBatchUpateModel.msgUpateVersion')}
        />
      </Space>
    </Modal>
  );
};

export default TestBatchUpdateExeModal;
