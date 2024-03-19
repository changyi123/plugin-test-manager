import { Checkbox, Spin, Table, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { groupBy } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';

import { StatusBadge } from '@/components/business/Status';
import Field from '@/components/common/Field';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { QuestionCircleFilled } from '@/icons';
import { getCaseAllRuns } from '@/lib/api/item';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { getRootContainer } from '@/lib/utils/helper';

import css from './index.less';

const Execution: React.FC = () => {
  const { t } = useI18n();
  const [testRuns, setTestRuns] = useState([]);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const finallyRuns = useMemo(() => {
    if (!checked) {
      return testRuns;
    }
    const groupRuns = groupBy(testRuns, run => run?.linkedPlan?.objectId);
    const list = Object.keys(groupRuns)
      .map(key => {
        const group = groupRuns[key];

        group.sort((a, b) => (b.time || 0) - (a.time || 0));

        return group?.[0];
      })
      .filter(Boolean);

    return list;
  }, [testRuns, checked]);

  const onChange = e => {
    setChecked(e.target.checked);
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const list = await getCaseAllRuns(testEntity?.objectId);
        setTestRuns(list);
      } finally {
        setLoading(false);
      }
    };
    if (testEntity?.objectId) {
      fetch();
    }
  }, [testEntity?.objectId]);

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
          dataSource={finallyRuns}
          scroll={{
            x: 'max-content',
          }}
        />
      </Spin>
    </div>
  );
};

export default React.memo(Execution);
