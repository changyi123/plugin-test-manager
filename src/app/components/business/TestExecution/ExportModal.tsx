import { message, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';

import {
  exportTestExecution,
  getLinkedTestEntityByQuery,
  getTestEntityByQuery,
} from '@/lib/api/item';
import { EXPORT_EXECUTION_FIELDS, TestLinkType, TestType } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';
import { usePageContext } from '@/pages/plan/hook';

import cx from './ExportModal.less';
export const downLoadFile = (data: string, tempName: string): void => {
  const blob = new Blob([data], { type: 'application/octet-stream' });
  /* 兼容ie内核，360浏览器的兼容模式 */
  if (window.navigator && (window.navigator as any).msSaveOrOpenBlob) {
    (window.navigator as any).msSaveOrOpenBlob(blob, tempName);
  } else {
    /* 火狐谷歌的文件下载方式 */
    const downloadElement = document.createElement('a');
    const href = window.URL.createObjectURL(blob);
    downloadElement.href = href;
    downloadElement.download = tempName;
    document.body.appendChild(downloadElement);
    downloadElement.click();
    document.body.removeChild(downloadElement);
    window.URL.revokeObjectURL(href);
  }
};
export const getFileNameFromContentDisposition = (
  contentDisposition: string,
  defaultName: string,
): string => {
  // 解析扩展方式指定的文件名
  if (!contentDisposition) return defaultName;
  const extendedFilenameRegex = /filename\*=UTF-8''(.+)/;
  const extendedMatch = contentDisposition.match(extendedFilenameRegex);
  if (extendedMatch && extendedMatch[1]) {
    const extendedFileName = decodeURIComponent(extendedMatch[1]);
    return extendedFileName;
  }

  // 解析传统方式指定的文件名
  const traditionalFilenameRegex = /filename="(.+?)"/;
  const traditionalMatch = contentDisposition.match(traditionalFilenameRegex);
  if (traditionalMatch && traditionalMatch[1]) {
    const traditionalFileName = traditionalMatch[1];
    return traditionalFileName;
  }

  return defaultName;
};
const ExportModal = props => {
  const { onCancel } = props;
  const { t } = useI18n();
  const { workspaceKey, selectedTestPlan } = usePageContext();
  const [testPlanList, setTestPlanList] = useState([]);
  const [selectedTestPlanIds, setSelectedTestPlanIds] = useState([]);
  const [selectedExecutionIds, setSelectedExecutionIds] = useState([]);
  const [executionList, setExecutionList] = useState([]);
  const [planMapExecution, setPlanMapExecution] = useState({});

  console.info('zjqprops', props);

  const basicFields = useMemo(() => {
    const basic = [...EXPORT_EXECUTION_FIELDS];
    return basic.map(field => ({
      ...field,
      label: t(`page.repository.repoDropDown.excelExportTitle.${field.label}`),
      checked: true,
      readonly: true,
    }));
  }, [t]);
  // fetch Data
  useEffect(() => {
    const fetchData = async () => {
      const { list: testPlanList } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Plan,
        },
        fields: ['name', 'id'],
        notConcatField: true,
        limit: 99999,
      });
      console.info('testPlanList', testPlanList);
      setTestPlanList(testPlanList);
    };
    fetchData();
  }, [workspaceKey, selectedTestPlan]);
  // init select
  useEffect(() => {
    if (selectedTestPlan?.objectId) {
      setSelectedTestPlanIds([selectedTestPlan.objectId]);
    }
  }, [selectedTestPlan]);
  // select changed
  useEffect(() => {
    const fetchData = async _selectedTestPlanIds => {
      const { list: executionList } = await getLinkedTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
        },
        limit: 9999,
        linkType: TestLinkType.ExecutionLinkPlan,
        sourceIds: _selectedTestPlanIds,
        destinationType: TestType.Execution,
        fields: ['name', 'id'],
      });
      const _planMapExecution = {};
      executionList.forEach(item => {
        if (!_planMapExecution[item.source[0]]) {
          _planMapExecution[item.source[0]] = [];
        }
        if (item.objectId) _planMapExecution[item.source[0]].push(item.objectId);
      });
      setExecutionList(executionList);
      setPlanMapExecution(_planMapExecution);
    };
    if (selectedTestPlanIds?.length) {
      fetchData(selectedTestPlanIds);
    }
  }, [selectedTestPlanIds, workspaceKey]);
  const [loading, setLoading] = useState(false);
  const loadingRef = React.useRef(false);
  const _executionList = useMemo(() => {
    if (selectedTestPlanIds.length === 0) return [];
    return [
      {
        id: 'all',
        name: t('executionTaskExport.all'),
      },
    ].concat(executionList);
  }, [executionList, t, selectedTestPlanIds]);
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
          const res = await exportTestExecution({
            iql,
            iqlContext: {
              displayContext: 'test_manager',
            },
            extraParams: {
              fileName: '执行记录导出',
              exportType: 'testExecution',
              planMapExecution,
            },
            choseFields: basicFields,
            appKey: 'test_manager',
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
          mode="multiple"
          value={selectedTestPlanIds}
          onChange={values => {
            setSelectedTestPlanIds(values);
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
