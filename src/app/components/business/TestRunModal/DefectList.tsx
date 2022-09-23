import React from 'react';
import { useHover } from 'ahooks';
import cx from './DefectList.less';
import { DeleteOutlined } from '@/icons';
import { Item, Status } from '@/lib/types/App';
import AddDefectButton from './AddDefectButton';
import { useItemLinkTypeConfig } from './hooks';
import { TabsComponentBaseProps } from './type';
import { Popconfirm, Tooltip, Empty } from 'antd';
import { components } from 'proxima-sdk';
import { addTestDefect, deleteTestDefect, updateTestRunDetail } from '@/lib/api/item';

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
  const steps = testRunData.runDetail?.steps ?? [];
  const { TestToDefect = '' } = useItemLinkTypeConfig();
  const currentDefectItemIds = testRunData.runDetail?.defectItemIds ?? [];

  // 添加缺陷
  const handleDefectAdd = async defectItemIds => {
    // onLoading();
    await Promise.all([
      addTestDefect(TestToDefect, testRunData, defectItemIds),
      updateTestRunDetail(testRunEntity, {
        runDetail: {
          defectItemIds,
        },
      }),
    ]);
    onDataChange();
  };

  // 删除缺陷
  const handleDeleteDefect = async defectItemId => {
    onLoading();

    const newDefectItemIds = currentDefectItemIds.filter(id => defectItemId !== id);

    await Promise.all([
      deleteTestDefect(TestToDefect, testRunData, [defectItemId]),
      updateTestRunDetail(testRunEntity, {
        runDetail: {
          defectItemIds: newDefectItemIds,
        },
      }),
    ]);
    onDataChange();
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
        <span className={cx('tag')}>{isGlobalDefect ? '全局' : `步骤${position}`}</span>
        <ItemIcon className={cx('icon')} icon={(item.itemType as any)?.icon}></ItemIcon>
        <span className={cx('key')}>{item.key}</span>
        <span>{item.name}</span>

        <span style={ItemStatusStyles[status.type]} className={cx('status')}>
          {status?.name}
        </span>
        <Popconfirm
          okText="确定"
          cancelText="取消"
          placement="left"
          disabled={!isGlobalDefect}
          getPopupContainer={getPopupContainer}
          title="当前操作会删除与该缺陷的关联关系，是否继续执行？"
          onConfirm={() => isGlobalDefect && handleDeleteDefect(defect.itemId)}
        >
          <Tooltip
            placement="left"
            getPopupContainer={getPopupContainer}
            title={!isGlobalDefect ? `请在步骤${position}中移除该缺陷` : undefined}
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
        <Empty style={{ marginTop: 60 }} description="当前测试执行未关联缺陷" />
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
