import { message, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';

import { exportTestExecution } from '@/lib/api/item';
import { EXPORT_EXECUTION_FIELDS } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';

import cx from './ExportModal.less';
import { downLoadFile, getFileNameFromContentDisposition } from './common/util';
import useRequest from './common/useRequest';
const ExportModal = props => {
  const { t } = useI18n();
  const basicFields = useMemo(() => {
    const basic = [...EXPORT_EXECUTION_FIELDS];
    return basic.map(field => ({
      ...field,
      label: t(`page.repository.repoDropDown.excelExportTitle.${field.label}`),
      checked: true,
      readonly: true,
    }));
  }, [t]);

  const { onCancel } = props;
  const {
    selectedExecutionIds,
    selectedTestPlanIds,
    setSelectedTestPlanIds,
    testPlanList,
    setSelectedExecutionIds,
    _executionList,
    executionList,
    planMapExecution,
  } = useRequest();
  const loadingRef = React.useRef(false);
  const [loading, setLoading] = useState(false);
  return (
    <Modal
      open={true}
      okButtonProps={{ disabled: !selectedExecutionIds.length, loading: loading }}
      okText={t('executionTaskExport.sure')}
      title={t('executionTaskExport.record')}
      cancelText={t('executionTaskExport.cancel')}
      onOk={async () => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        setLoading(true);
        try {
          const hasAll = selectedExecutionIds.includes('all');
          const _selectedExecutionIds = hasAll
            ? executionList.map(item => item.id)
            : selectedExecutionIds;
          const _filterSelectedExecutionIds = _selectedExecutionIds.filter(_id => _id !== 'all');
          const iql = `'test_manager_linkType' = "RunLinkExecution" and 'test_manager_type' = "TestRun" and 'test_manager_linkItems' in [${_filterSelectedExecutionIds
            .map(_id => JSON.stringify(_id))
            .join(',')}] order by test_manager_linkItems desc, 创建时间 desc`;
          const findTestPlanName = testPlanList?.find(
            _plan => _plan.id === selectedTestPlanIds[0],
          )?.name;
          const res = await exportTestExecution({
            iql,
            iqlContext: {
              displayContext: 'test_manager',
            },
            extraParams: {
              fileName: `测试执行记录导出-【${findTestPlanName}】`,
              exportType: 'testExecution',
              planMapExecution,
            },
            choseFields: basicFields,
            appKey: 'test_manager',
            viewId: 'filters-Default', // just for file name
          });
          if (res.data?.type === 'application/octet-stream') {
            message.warning(t('executionTaskExport.fileTooLargeTip'));
          } else if (res.data.type === 'application/json') {
            const reader = new FileReader();
            reader.readAsText(res.data);
            reader.onloadend = () => {
              const result = JSON.parse(reader.result as string);
              const reason = (
                <>
                  {t('executionTaskExport.exportError') +
                    result?.map(v => v.message)?.join(',') +
                    ','}
                  <span
                    className={cx('link')}
                    onClick={() => {
                      message.destroy('error-message');
                    }}
                  >
                    {t('executionTaskExport.viewDetails')}
                  </span>
                </>
              );
              message.error({ content: reason, key: 'error-message' });
            };
          } else {
            const fileName = getFileNameFromContentDisposition(
              res.headers['content-disposition'],
              `Team ${dayjs().format('YYYY-MM-DDTHH_mm_ss')}.xlsx`,
            );
            downLoadFile(res.data, fileName);
          }
          onCancel();
        } catch (e) {
          message.error(e.message);
        } finally {
          loadingRef.current = false;
          setLoading(false);
        }
      }}
      onCancel={onCancel}
      maskClosable={false}
    >
      <div>
        <div>{t('executionTaskExport.plan')}</div>
        <Select
          className={cx('select')}
          value={selectedTestPlanIds}
          onChange={values => {
            setSelectedTestPlanIds([values]);
          }}
        >
          {testPlanList.map(item => {
            return (
              <Select.Option key={item.id} value={item.id}>
                {item.name}
              </Select.Option>
            );
          })}
        </Select>
      </div>
      <div>
        <div className={cx('title')}>{t('executionTaskExport.execution')}</div>
        <Select
          className={cx('select')}
          mode="multiple"
          onChange={values => {
            setSelectedExecutionIds(values);
          }}
        >
          {_executionList.map(item => {
            return (
              <Select.Option key={item.id} value={item.id}>
                {item.name}
              </Select.Option>
            );
          })}
        </Select>
      </div>
      <span className={cx('maxSupport')}>{t('executionTaskExport.maxSupport')}</span>
    </Modal>
  );
};

export default ExportModal;
