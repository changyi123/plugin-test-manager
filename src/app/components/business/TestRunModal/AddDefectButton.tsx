import { PlusOutlined } from '@ant-design/icons';
import { Button, Dropdown, Menu, message } from 'antd';
import React from 'react';

import TestEntitySelectorModal, { ActionType } from '@/components/business/TestEntitySelectorModal';
import { addTestDefect } from '@/lib/api/item';
import { TestType } from '@/lib/constants';
import { useBaseAction } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { TestEntity } from '@/lib/types/Test';

import { useItemLinkTypeConfig } from './hooks';

type AddDefectButtonProps = {
  testId?: string;
  plainStyle?: boolean;
  className?: string;
  testRunEntity?: TestEntity<TestType.Run>;
  currentDefectIds: string[];
  allRelationDefectIds: string[];
  onSave: (ids: string[]) => void;
  onLoading?: (load?: boolean) => void;
};

const AddDefectButton: React.FC<AddDefectButtonProps> = props => {
  const {
    testRunEntity,
    onSave,
    onLoading,
    currentDefectIds,
    allRelationDefectIds,
    className,
    plainStyle,
  } = props;
  const { t } = useI18n();
  const { createItemUseModal, getCreatePermission } = useBaseAction();
  const { TestToDefect = '' } = useItemLinkTypeConfig();
  const currentRef = React.useRef(null);
  const testEntitySelectorRef = React.useRef<ActionType>();
  const createDefect = React.useCallback(async () => {
    const { itemList: defectItemList } = await createItemUseModal({
      type: TestType.TestDefect,
      extraData: {
        useItemBatchCreate: true,
      },
    });

    onLoading?.();
    // 创建事项关联
    try {
      const tasks = defectItemList.map(d =>
        addTestDefect(TestToDefect, testRunEntity, [d.objectId]),
      );
      await Promise.all(tasks);
      // await addTestDefect(TestToDefect, testRunEntity, [defectItem.objectId]);
      const needAddedItemIds = []
        .concat(
          currentDefectIds,
          defectItemList?.map(d => d.objectId),
        )
        .filter(Boolean);
      onSave?.(needAddedItemIds);
      message.success(t('components.business.testRunModal.addDefectButton.createDefectSuccess'));
    } catch (error) {
      message.error(error?.message);
      onLoading?.(false);
    }
  }, [createItemUseModal, onLoading, TestToDefect, testRunEntity, currentDefectIds, onSave, t]);

  const addExistedDefect = async () => {
    if (getCreatePermission(TestType.TestDefect)) {
      message.error(t('page.plan.testEntityList.addItemTips'));
      return;
    }
    const itemIds = await testEntitySelectorRef.current.open({ selectValue: [] });

    if (itemIds?.length > 0) {
      onLoading?.();
      // 创建事项关联
      try {
        await addTestDefect(TestToDefect, testRunEntity, itemIds);
        const needAddedItemIds = [].concat(currentDefectIds, itemIds).filter(Boolean);
        onSave?.(needAddedItemIds);
        message.success(t('components.business.testRunModal.addDefectButton.addDefectSuccess'));
      } catch (error) {
        message.error(error?.message);
        onLoading?.(false);
      }
    }
  };

  const menu = (
    <Menu>
      <Menu.Item key="0">
        <a onClick={addExistedDefect}>
          {t('components.business.testRunModal.addDefectButton.addExistingDefect')}
        </a>
      </Menu.Item>
      <Menu.Item key="1">
        <a onClick={createDefect}>
          {t('components.business.testRunModal.addDefectButton.createDefect')}
        </a>
      </Menu.Item>
    </Menu>
  );

  return (
    <div ref={currentRef}>
      <TestEntitySelectorModal
        title={t('components.business.testRunModal.addDefectButton.modelTitle')}
        testType={TestType.TestDefect}
        actionRef={testEntitySelectorRef}
        ignoreTestEntityIds={allRelationDefectIds ?? []}
      />
      {plainStyle ? (
        <div className={className}>
          <Button onClick={addExistedDefect} type="link">
            {t('components.business.testRunModal.addDefectButton.addDefect')}
          </Button>
          <Button onClick={createDefect} type="link">
            {t('components.business.testRunModal.addDefectButton.createDefect')}
          </Button>
        </div>
      ) : (
        <Dropdown
          key="2"
          overlay={menu}
          trigger={['click']}
          getPopupContainer={() => currentRef.current}
        >
          <Button type="link" className={className}>
            <PlusOutlined />
            {t('components.business.testRunModal.addDefectButton.addDefect')}
          </Button>
        </Dropdown>
      )}
    </div>
  );
};

export default AddDefectButton;
