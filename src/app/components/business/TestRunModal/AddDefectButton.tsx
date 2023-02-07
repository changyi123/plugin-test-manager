import React from 'react';
import { TestType } from '@/lib/constants';
import { useItemLinkTypeConfig } from './hooks';
import { PlusOutlined } from '@ant-design/icons';
import { useBaseAction } from '@/lib/hooks/useContext';
import { Menu, Dropdown, Button, message } from 'antd';
import TestEntitySelectorModal, { ActionType } from '@/components/business/TestEntitySelectorModal';
import { TestEntity } from '@/lib/types/Test';
import { addTestDefect } from '@/lib/api/item';

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
  const { createItemUseModal } = useBaseAction();
  const { TestToDefect = '' } = useItemLinkTypeConfig();
  const currentRef = React.useRef(null);
  const testEntitySelectorRef = React.useRef<ActionType>();
  const createDefect = React.useCallback(async () => {
    const { item: defectItem } = await createItemUseModal({
      type: TestType.TestDefect,
    });

    onLoading?.();
    // 创建事项关联
    try {
      await addTestDefect(TestToDefect, testRunEntity, [defectItem.objectId]);
      const needAddedItemIds = [].concat(currentDefectIds, defectItem.objectId).filter(Boolean);
      onSave?.(needAddedItemIds);
      message.success('缺陷新建成功');
    } catch (error) {
      message.error(error);
      onLoading?.(false);
    }
  }, [createItemUseModal, onLoading, TestToDefect, testRunEntity, currentDefectIds, onSave]);

  const addExistedDefect = async () => {
    const itemIds = await testEntitySelectorRef.current.open({ selectValue: [] });

    if (itemIds?.length > 0) {
      onLoading?.();
      // 创建事项关联
      try {
        await addTestDefect(TestToDefect, testRunEntity, itemIds);
        const needAddedItemIds = [].concat(currentDefectIds, itemIds).filter(Boolean);
        onSave?.(needAddedItemIds);
        message.success('缺陷添加成功');
      } catch (error) {
        message.error(error?.message);
        onLoading?.(false);
      }
    }
  };

  const menu = (
    <Menu>
      <Menu.Item key="0">
        <a onClick={addExistedDefect}>添加已存在缺陷</a>
      </Menu.Item>
      <Menu.Item key="1">
        <a onClick={createDefect}>创建缺陷</a>
      </Menu.Item>
    </Menu>
  );

  return (
    <div ref={currentRef}>
      <TestEntitySelectorModal
        title="请选择测试缺陷"
        testType={TestType.TestDefect}
        actionRef={testEntitySelectorRef}
        ignoreTestEntityIds={allRelationDefectIds ?? []}
      />
      {plainStyle ? (
        <div className={className}>
          <Button onClick={addExistedDefect} type="link">
            添加缺陷
          </Button>
          <Button onClick={createDefect} type="link">
            创建缺陷
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
            添加缺陷
          </Button>
        </Dropdown>
      )}
    </div>
  );
};

export default AddDefectButton;
