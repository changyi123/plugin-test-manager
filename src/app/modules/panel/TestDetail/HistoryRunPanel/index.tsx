import { Checkbox, Spin, Table, Tooltip } from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { StatusBadge } from '@/components/business/Status';
import Field from '@/components/common/Field';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { QuestionCircleFilled } from '@/icons';
import { getCaseAllRuns } from '@/lib/api/item';
import { TestType } from '@/lib/constants';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { getRootContainer } from '@/lib/utils/helper';

import css from './index.less';

const Execution: React.FC = () => {
  const { t } = useI18n();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(1);

  const { testEntity } = useTestConfig();

  // table column 数据
  const tableColumns = useMemo(() => {
    return [
      {
        title: t('common.testPlan'),
        key: 'linkedPlan',
        width: 200,
        render: (_, record) => {
          return (
            <OverflowTooltip title={record.linkedPlan?.name}>
              {record.linkedPlan?.name}
            </OverflowTooltip>
          );
        },
      },
      {
        title: t('common.testExecution'),
        key: 'linkedExecution',
        width: 200,
        render: (_, record) => {
          return (
            <OverflowTooltip title={record.linkedExecution?.name}>
              {record.linkedExecution?.name}
            </OverflowTooltip>
          );
        },
      },
      {
        title: t('common.designee'),
        key: 'executor',
        width: 150,
        render: (_, record) => {
          return <Field.User readonly userInfo={record?.executor?.[0]} />;
        },
      },
      {
        title: t('page.plan.testEntityList.executeCount'),
        key: 'executeCount',
        width: 150,
        render: (_, record) => {
          return record?.executeCount || 0;
        },
      },
      {
        title: t('modules.panel.testDetail.historyRunPanel.latestExecutionStatus'),
        key: 'status',
        width: 150,
        render: (_, record) => {
          return (
            <StatusBadge
              useRootContainer
              readonly={true}
              status={record.status}
              onStatusChange={() => {}}
            />
          );
        },
      },
      {
        title: t('modules.panel.testDetail.historyRunPanel.executeTime'),
        key: 'executeTime',
        width: 200,
        render: (_, record) => {
          return record.executeTime ? dayjs(record?.executeTime).format('YYYY-MM-DD HH:mm') : '';
        },
      },
    ];
  }, [t]);

  const onChange = e => {
    setChecked(e.target.checked);
    setCurrentIndex(1);
  };

  const pageChange = page => {
    setCurrentIndex(page);
  };

  const getRecords = useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        limit: 10,
        offset: (currentIndex - 1) * 10,
      };
      //checked为true，展示每个计划下最新的执行
      if (checked) {
        Object.assign(params, {
          query: { type: TestType.Run, id: Object.values(testEntity?.caseRun || {}) },
        });
      } else {
        Object.assign(params, {
          query: { type: TestType.Run, referenceCase: testEntity?.objectId },
        });
      }

      const { list, total } = await getCaseAllRuns(params);
      setTotal(total);
      setData(list);
    } finally {
      setLoading(false);
    }
  }, [testEntity, checked, currentIndex]);

  useEffect(() => {
    getRecords();
  }, [getRecords]);

  return (
    <div className={css('execution-panel')}>
      <Spin spinning={loading}>
        <Checkbox onChange={onChange} value={checked} className={css('checkbox-wrapper')}>
          {t('modules.panel.testDetail.historyRunPanel.onlyShowLatelyRun')}
          <Tooltip
            getPopupContainer={getRootContainer}
            title={t('modules.panel.testDetail.historyRunPanel.runTip')}
          >
            <QuestionCircleFilled style={{ marginLeft: 6 }} />
          </Tooltip>
        </Checkbox>
        <Table
          rowKey="objectId"
          columns={tableColumns}
          dataSource={data}
          scroll={{
            x: 'max-content',
          }}
          pagination={{
            size: 'small',
            showTotal(total) {
              return `${t('common.tableTotal.0')} ${total} ${t('common.tableTotal.1')}`;
            },
            pageSizeOptions: ['10'],
            current: currentIndex,
            onChange: pageChange,
            total: total,
          }}
        />
      </Spin>
    </div>
  );
};

export default React.memo(Execution);
