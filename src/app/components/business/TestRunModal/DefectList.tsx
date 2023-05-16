import { useHover } from 'ahooks';
import { Empty, message, Popconfirm, Tooltip } from 'antd';
import { components } from 'proxima-sdk';
import React from 'react';

import { DeleteOutlined } from '@/icons';
import { addTestDefect, deleteTestDefect, updateTestRunDetail } from '@/lib/api/item';
import useI18n from '@/lib/hooks/useI18n';
import { Item, Status } from '@/lib/types/App';
import { goToItemDetailPage } from '@/lib/utils/helper';

import AddDefectButton from './AddDefectButton';
import cx from './DefectList.less';
import { useItemLinkTypeConfig } from './hooks';
import { TabsComponentBaseProps } from './type';

const { ItemIcon } = components.Components.Common;

const getPopupContainer = () =>
  document.querySelector('[data-element-id="test-run-container"]') as HTMLDivElement;

const ItemStatusStyles = {
  Start: { backgroundColor: 'rgb(221, 225, 231)', color: 'rgb(65, 82, 110)' },
  InProgress: { backgroundColor: 'rgb(221, 235, 255)', color: 'rgb(3, 71, 166)' },
  Done: { backgroundColor: 'rgb(227, 252, 239)', color: 'rgb(16, 112, 80)' },
};

type DefectListProps = TabsComponentBaseProps;

const DefectList: React.FC<DefectListProps> = ({
  onLoading,
  testRunData,
  onDataChange,
  testRunEntity,
  allRelationDefects,
}) => {
  const { t } = useI18n();
  const steps = testRunData.runDetail?.steps ?? [];
  const { TestToDefect = '' } = useItemLinkTypeConfig();
  const currentDefectItemIds = testRunData.runDetail?.defectItemIds ?? [];

  // 添加缺陷
  const handleDefectAdd = async defectItemIds => {
    // onLoading();
    await addTestDefect(TestToDefect, testRunData, defectItemIds);
    await updateTestRunDetail(testRunEntity, {
      runDetail: {
        defectItemIds,
      },
    });
    onDataChange();
  };

  // 删除缺陷
  const handleDeleteDefect = async defectItemId => {
    onLoading();
    try {
      const newDefectItemIds = currentDefectItemIds.filter(id => defectItemId !== id);
      await deleteTestDefect(TestToDefect, testRunData, [defectItemId]);
      await updateTestRunDetail(testRunEntity, {
        runDetail: {
          defectItemIds: newDefectItemIds,
        },
      });
      onDataChange();
    } catch (error) {
      message.error(
        error?.message ?? t('components.business.testRunModal.defectList.noPermission'),
      );
      onLoading?.(false);
    }
  };
  const DefectItem: React.FC<{ defect: TabsComponentBaseProps['allRelationDefects'][0] }> = ({
    defect,
  }) => {
    const ref = React.useRef();
    const position =
      defect.type === 'step' && steps.findIndex(step => step.id === defect.stepId) + 1;

    const isGlobalDefect = defect.type === 'global';
    const item = (defect.item ?? {}) as Item;
    const status = (item.status ?? {}) as Status;

    const isHover = useHover(ref);

    return (
      <div ref={ref} className={cx('defect', isHover && 'hover')}>
        <span className={cx('tag')}>
          {t(`components.business.testRunModal.defectList.${isGlobalDefect ? 'global' : 'step'}`)}
          {isGlobalDefect ? '' : position}
        </span>
        <ItemIcon className={cx('icon')} icon={(item.itemType as any)?.icon}></ItemIcon>
        <a
          className={cx('link')}
          onClick={() => {
            goToItemDetailPage({
              workspaceKey: (item.workspace as any)?.key,
              itemKey: item.key,
            });
          }}
        >
          <span className={cx('key')}>{item.key}</span>
          {item.name}
        </a>

        <span style={ItemStatusStyles[status.type]} className={cx('status')}>
          {status?.name}
        </span>
        <Popconfirm
          okText={t('common.confirm')}
          cancelText={t('common.cancel')}
          placement="left"
          disabled={!isGlobalDefect}
          getPopupContainer={getPopupContainer}
          title={t('components.business.testRunModal.defectList.deleteButtonTips')}
          onConfirm={() => isGlobalDefect && handleDeleteDefect(defect.itemId)}
        >
          <Tooltip
            placement="left"
            getPopupContainer={getPopupContainer}
            title={
              !isGlobalDefect
                ? `${t('components.business.testRunModal.defectList.removeTips.0')}${position}${t(
                    'components.business.testRunModal.defectList.removeTips.1',
                  )}`
                : undefined
            }
          >
            <a
              style={{ display: isHover ? 'block' : 'none' }}
              className={cx('delete-btn', !isGlobalDefect && 'disabled')}
            >
              <DeleteOutlined />
            </a>
          </Tooltip>
        </Popconfirm>
      </div>
    );
  };

  // 所有已关联的缺陷，测试执行内的缺陷只允许关联一次
  const allRelationDefectItemIds = allRelationDefects.map(defect => defect.itemId);

  return (
    <div>
      {allRelationDefects.length ? (
        allRelationDefects.map(defect => <DefectItem defect={defect} key={defect.itemId} />)
      ) : (
        <Empty
          style={{ marginTop: 60 }}
          description={t('components.business.testRunModal.defectList.notLintDefect')}
        />
      )}

      <AddDefectButton
        plainStyle
        className={cx('add-btn')}
        testRunEntity={testRunEntity}
        allRelationDefectIds={allRelationDefectItemIds}
        currentDefectIds={testRunData.runDetail?.defectItemIds}
        onSave={defectItemIds => handleDefectAdd(defectItemIds)}
        onLoading={onLoading}
      />
    </div>
  );
};

export default DefectList;
