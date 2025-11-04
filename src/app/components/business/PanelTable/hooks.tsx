import { useEffect, useMemo, useState } from 'react';
import statusesConfig from '@/pages/config/statuses.config';
import cx from './index.less';
import { Button, Checkbox, Dropdown } from 'antd';
import useI18n from '@/lib/hooks/useI18n';
import { getSelectedDataStatusStats } from '@/components/common/BusinessTable/hooks';

interface UsePanelExecutionStatusStatsParams {
    selectedRowKeys: string[];
    allTestEntities?: any[];
    setSelectedRowKeys?: React.Dispatch<React.SetStateAction<string[]>>;
}

export const usePanelExecutionStatusStats = ({
    allTestEntities,
    selectedRowKeys,
    setSelectedRowKeys,
  }: UsePanelExecutionStatusStatsParams) => {
    const { t } = useI18n();

    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [tempSelectedKeys, setTempSelectedKeys] = useState<string[]>([]);

    const groupedStats = useMemo(() => {
        if (!allTestEntities || !allTestEntities?.length) {
          return;
        }
        const selectedTestEntities = allTestEntities?.filter(item => 
          selectedRowKeys.includes(item.id)
        );
        return getSelectedDataStatusStats(selectedTestEntities);
    }, [selectedRowKeys, allTestEntities]);

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
            <span style={{ color: '#0c62ff', margin: '0 0.5em' }}>{count}</span>
            {t('common.item')}
          </span>
        );
      }

      return null;
    };
  
  
    return {
      renderStatusText,
    };
  };