import { useListener } from '@projectproxima/proxima-sdk-js';
import { getLinkedTestEntityByQuery } from '@/lib/api/item';
import { useRequest } from 'ahooks';
import {
    TestLinkType,
    TestType,
} from '@/lib/constants';
import { useEffect, useMemo, useState } from 'react';
import statusesConfig from '@/pages/config/statuses.config';
import { usePageContext } from '@/pages/plan/hook';
import cx from './TableSelection.less';
import { Button, Checkbox, Dropdown, Spin } from 'antd';
import useI18n from '@/lib/hooks/useI18n';

interface UseExecutionStatusStatsParams {
    selectedExecution?: Record<string, any>;
    selectedRowKeys: string[];
    activeType: string;
    setSelectedRowKeys?: React.Dispatch<React.SetStateAction<string[]>>;
    setCheckedRowKeys?: (val?: string[]) => void;
}

export const getSelectedDataStatusStats = (selectedData: any[] = []) => {
  // 按状态分组
  const statusGroups: Record<string, any[]> = {};
  
  selectedData.forEach(item => {
    const status = item.status;
    if (!statusGroups[status]) {
      statusGroups[status] = [];
    }
    statusGroups[status].push(item);
  });
  
  // 过滤掉空的分组
  const validStatusGroups = Object.entries(statusGroups)
    .filter(([_, items]) => items.length > 0)
    .reduce((acc, [status, items]) => {
      acc[status] = items;
      return acc;
    }, {} as Record<string, any[]>);
  
  const statusKeys = Object.keys(validStatusGroups);
  const isMultipleStatus = statusKeys.length > 1;
  const singleStatus = statusKeys.length === 1 ? statusKeys[0] : null;
  
  return {
    // 分组数据：{ PASSED: [...], TODO: [...] }
    statusGroups: validStatusGroups,
    // 状态列表：['PASSED', 'TODO']
    statusKeys,
    // 是否多状态
    isMultipleStatus,
    // 单一状态时的状态值（如果只有一个状态）
    singleStatus,
    // 每个状态的数量统计：{ PASSED: 1, TODO: 1 }
    statusCounts: Object.entries(validStatusGroups).reduce((acc, [status, items]) => {
      acc[status] = items.length;
      return acc;
    }, {} as Record<string, number>)
  };
};
export const useExecutionStatusStats = ({
    selectedExecution,
    selectedRowKeys,
    activeType,
    setSelectedRowKeys,
    setCheckedRowKeys,
  }: UseExecutionStatusStatsParams) => {
    const { t } = useI18n();

    const { mutateStatusEvent, workspaceKey } = usePageContext();
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [tempSelectedKeys, setTempSelectedKeys] = useState<string[]>([]);
  
    const { data, refresh, loading } = useRequest(
      async () => {
        if (!selectedExecution?.objectId || activeType === 'TestPlan') {
          return null;
        }
  
        const { list: cases } = await getLinkedTestEntityByQuery({query: {
          workspaceKey: workspaceKey,
        } as any,
        linkType: TestLinkType.RunLinkExecution,
        sourceIds: [selectedExecution?.objectId],
        limit: 99999,
        destinationType: TestType.Run,
        select: [
          'id',
          'referenceCase',
          'status',
        ],
        });
        return cases;
      },
      {
        refreshDeps: [selectedExecution, workspaceKey, activeType],
      },
    );

    const groupedStats = useMemo(() => {
      if (!data) {
        return
      }
      const selectedTestEntities = data?.filter(item => 
        selectedRowKeys?.includes(item.id)
      );
      return getSelectedDataStatusStats(selectedTestEntities);
    }, [data, selectedRowKeys]);
  
    // 监听状态变更事件
    mutateStatusEvent?.useSubscription(key => {
      if (key === 'refreshExecutionList') {
        refresh();
      }
    });
  
    // 监听测试运行状态更新事件
    useListener('updateTestRunExecutionList', () => {
      refresh();
    });

    const getKeysByStatus = (status: string) => {
      return (groupedStats?.statusGroups[status] || []).map(item => item.id);
    };
  
    const isStatusChecked = (statusKey: string) => {
      const statusKeys = getKeysByStatus(statusKey);
      return statusKeys.every(key => tempSelectedKeys.includes(key));
    };
  
    const handleStatusChange = (statusKey: string, checked: boolean) => {
      const statusKeys = getKeysByStatus(statusKey);
      
      if (checked) {
        // 勾选：添加该状态下的所有 keys
        setTempSelectedKeys(prev => {
          const newKeys = [...prev, ...statusKeys];
          return Array.from(new Set(newKeys)); // 去重
        });
      } else {
        // 取消勾选：移除该状态下的所有 keys
        setTempSelectedKeys(prev => prev.filter(key => !statusKeys.includes(key)));
      }
    };
  
    const handleConfirm = () => {
      setSelectedRowKeys([...tempSelectedKeys]);
      setCheckedRowKeys?.([...tempSelectedKeys]);
      setDropdownVisible(false);
    };
  
    const handleCancel = () => {
      setTempSelectedKeys([...selectedRowKeys]); // 还原到原始选择
      setDropdownVisible(false);
    };
  
    // 初始化临时选择状态
    useEffect(() => {
      if (dropdownVisible) {
        setTempSelectedKeys([...selectedRowKeys]);
      }
    }, [dropdownVisible, selectedRowKeys]);
  
    const renderDropdownContent = () => {
      const displayStatusList = statusesConfig
        .filter(status => groupedStats?.statusKeys.includes(status.key))
        .map(status => {
          const items = groupedStats?.statusGroups[status.key] || [];
          const count = groupedStats?.statusCounts[status.key] || 0;
          const isChecked = isStatusChecked(status.key);
          
          return {
            key: status.key,
            name: status.name,
            color: status.color,
            count,
            items,
            isChecked,
          };
        });
      return (
        <div className={cx('dropdown-content')}>
        <div className={cx('dropdown-section')}>
          <div className={cx('dropdown-title')}>{t('modules.panel.testDetail.testDetailPanel.uncheckStates')}</div>
          <div className={cx('status-list')}>
            {displayStatusList
              .map(status => {
                return (
                  <div key={status.key} className={cx('status-item')}>
                    <Checkbox 
                      checked={status.isChecked}
                      onChange={(e) => handleStatusChange(status.key, e.target.checked)}
                    >
                      {status.name}
                    </Checkbox>
                    <span className={cx('status-count')}>{status.count} {t('common.item')}</span>
                  </div>
                );
              })}
          </div>
        </div>
        <div className={cx('dropdown-footer')}>
          <Button
            className={cx('cancel-btn')}
            onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="primary"className={cx('confirm-btn')} onClick={handleConfirm}>
            {t('common.confirm')}
          </Button>
        </div>
      </div>
      )
    }
      
  
    const renderStatusText = () => {
      if (loading) {
        return <Spin/>
      }
      if (groupedStats?.isMultipleStatus) {
        // 多个状态：显示"存在多类状态，查看"
        return (
          <span className={cx('status-text')}>
            {t('modules.panel.testDetail.testDetailPanel.multipleStates')}
            <Dropdown
              dropdownRender={renderDropdownContent}
              getPopupContainer={(node) => node.parentElement}
              trigger={['click']}
              placement="bottomRight"
              open={dropdownVisible}
              onOpenChange={(open) => setDropdownVisible(open)}
            >
              <span onClick={() => setDropdownVisible(true)} className={cx('view-link')}>{t('common.viewDistribution')}</span>
            </Dropdown>
          </span>
        );
      } else if (groupedStats?.singleStatus) {
        // 单一状态：显示"某某状态多少项"
        const statusInfo = statusesConfig.find(config => config.key === groupedStats?.singleStatus);
        const statusName = statusInfo?.name || groupedStats?.singleStatus;
        const count = groupedStats?.statusCounts[groupedStats?.singleStatus] || 0;
        
        return (
          <span className={cx('status-text')}>
            {statusName}{t('common.status')}
            <span className={cx('num')}>{count}</span>
            {t('common.item')}
          </span>
        );
      }
      return null;
    };
  
  
    return {
      renderStatusText,
      refresh,
    };
  };