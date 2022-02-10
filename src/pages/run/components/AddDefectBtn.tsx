import React, { useCallback } from 'react';
import { TestType } from '@/lib/constants';
import { addDefect } from '@/lib/api/runs';
import { useItemLinkTypeConfig } from './hooks';
import { PlusOutlined } from '@ant-design/icons';
import { useBaseAction } from '@/lib/hooks/useContext';
import { Menu, Dropdown, Button, message } from '@osui/ui';
import TestEntitySelectorModal, { ActionType } from '@/components/panel/TestEntitySelectorModal';

const AddDefectBtn: React.FC<{
  testId: string;
  currentDefectIds: string[];
  allRelationDefectIds: string[];
  save: (id: string[]) => void;
}> = ({ testId, save, currentDefectIds, allRelationDefectIds }) => {
  const { createItemUseModal } = useBaseAction();
  const { TestToDefect = '' } = useItemLinkTypeConfig();
  const currentRef = React.useRef(null);
  const testEntitySelectorRef = React.useRef<ActionType>();
  const createDefect = useCallback(async () => {
    const { item: defectItem } = await createItemUseModal({
      type: TestType.TestDefect,
    });

    // 创建事项关联
    await addDefect(TestToDefect, testId, [defectItem.objectId]);
    const needAddedItemIds = [].concat(currentDefectIds, defectItem.objectId).filter(Boolean);
    save?.(needAddedItemIds);
    message.success('缺陷新建成功');
  }, [createItemUseModal, testId, TestToDefect, save, currentDefectIds]);

  const addExistedDefect = async () => {
    const itemIds = await testEntitySelectorRef.current.open();

    // 创建事项关联
    await addDefect(TestToDefect, testId, itemIds);
    const needAddedItemIds = [].concat(currentDefectIds, itemIds).filter(Boolean);
    save?.(needAddedItemIds);
    message.success('缺陷添加成功');
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
      <Dropdown
        key="2"
        overlay={menu}
        trigger={['click']}
        getPopupContainer={() => currentRef.current}
      >
        <Button type="link" icon={<PlusOutlined />}>
          添加缺陷
        </Button>
      </Dropdown>
    </div>
  );
};

export default AddDefectBtn;
