import { Button, Collapse, DatePicker, message, Modal, Spin } from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import OverflowTooltip from '@/components/common/OverflowTooltip';
import { checkDuplicateCases } from '@/lib/api/case';
import { deleteTestEntity } from '@/lib/api/item';
import useI18n from '@/lib/hooks/useI18n';

import { useDataContext } from '../hooks';
import cx from './index.less';

const formatter = 'YYYY-MM-DD';

const RangePicker: any = DatePicker.RangePicker;

interface DuplicateDataItem {
  workspaceId: string;
  workspaceName: string;
  workspaceKey: string;
  duplicateCases: Record<string, any>[];
  duplicateNum: number;
}

interface DuplicateDataResult {
  totalDuplicateNum: number;
  duplicateCaseIds: string[];
  list: DuplicateDataItem[];
}

const TestCaseRemoveDuplicates = () => {
  const { t } = useI18n();
  const { workspace } = useDataContext();
  const workspaceKey = workspace?.key;

  const [value, setValue] = useState(null);
  const [data, setData] = useState<DuplicateDataResult>();
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleDateChange = date => {
    if (date) {
      const newValue = [date[0].format(formatter), date[1].format(formatter)];
      setValue(newValue);
    }
  };

  const query = useCallback(async () => {
    try {
      if (!value?.length) {
        return message.error(t('page.config.testCaseRemoveDuplicates.chooseTime'));
      }

      const [startTime, endTime] = value;

      const createdAtField = t('page.config.testCaseRemoveDuplicates.createdAt');

      const params = {
        workspaceKeys: [workspaceKey],
        selector: `'${createdAtField}' >= '${startTime}' and '${createdAtField}' <= '${endTime}'`,
      };

      setLoading(true);

      const { data } = await checkDuplicateCases(params);

      setLoaded(true);

      setData(data as unknown as DuplicateDataResult);
    } finally {
      setLoading(false);
    }
  }, [workspaceKey, value, t]);

  const items = useMemo(() => {
    return data?.list.map(item => {
      return {
        key: item.workspaceId,
        label: (
          <>
            {item.workspaceName} ({item.duplicateNum})
          </>
        ),
        children: (
          <div className={cx('case-list')}>
            {item.duplicateCases.map(duplicateCase => {
              const title = `${duplicateCase.name}【${duplicateCase.key}】【${
                duplicateCase.repositoryName || t('page.config.testCaseRemoveDuplicates.allModules')
              }】`;

              return (
                <OverflowTooltip key={duplicateCase.key} className={cx('case-item')} title={title}>
                  {title}
                </OverflowTooltip>
              );
            })}
          </div>
        ),
      };
    });
  }, [data?.list, t]);

  const removeDuplicateCase = useCallback(() => {
    const caseIds = data?.duplicateCaseIds;
    if (!caseIds?.length) {
      return message.error(t('page.config.testCaseRemoveDuplicates.noDuplicateCase'));
    }
    Modal.confirm({
      title: t('page.config.testCaseRemoveDuplicates.modalTitle'),
      content: t('page.config.testCaseRemoveDuplicates.modalContent'),
      okType: 'danger',
      onOk: async () => {
        // 删除重复名称的测试用例
        const res = await deleteTestEntity(caseIds);
        if (res?.status === 'error') {
          message.error(res.data);
          return;
        }
        message.success(t('common.deleteSuccess'));
        setLoaded(false);
        setData(undefined);
      },
    });
  }, [data?.duplicateCaseIds, t]);

  useEffect(() => {
    setData(undefined);
    setLoaded(false);
    setValue(null);
  }, [workspaceKey]);

  return (
    <Spin spinning={loading}>
      <div className={cx('query-header')}>
        <RangePicker
          value={value ? [dayjs(value[0]), dayjs(value[1])] : null}
          onChange={handleDateChange}
        />

        <Button type="primary" onClick={query} className={cx('query-btn')}>
          {t('page.config.testCaseRemoveDuplicates.query')}
        </Button>
      </div>

      {loaded ? (
        items?.length ? (
          <>
            <div className={cx('duplicate-panel')}>
              <h2>
                {t('page.config.testCaseRemoveDuplicates.duplicateCaseNum', {
                  num: data?.totalDuplicateNum,
                })}
              </h2>
              <Collapse items={items} />
            </div>

            <div>
              <Button danger type="primary" onClick={removeDuplicateCase}>
                {t('page.config.testCaseRemoveDuplicates.removeDuplicates')}
              </Button>
            </div>
          </>
        ) : (
          <div className={cx('no-duplicate')}>
            {t('page.config.testCaseRemoveDuplicates.noDuplicateCase')}
          </div>
        )
      ) : null}
    </Spin>
  );
};

export default TestCaseRemoveDuplicates;
