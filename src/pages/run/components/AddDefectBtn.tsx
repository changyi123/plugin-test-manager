import React, { useCallback } from 'react';
import { Menu, Dropdown, Button, message } from '@osui/ui';
import { uniqueId } from 'lodash';
import { PlusOutlined } from '@ant-design/icons';
import AddDefectModal from './AddDefectModal';
import { TestType } from '@/lib/constants';
import { useBaseAction } from '@/lib/hooks/useContext';
import { addDefect } from '@/lib/api/runs';
import { useItemLinkTypeConfig } from './hooks';

const AddDefectBtn: React.FC<{
  testId: string;
  currentDefectIds: string[];
  save: (id: string[]) => void;
}> = ({ testId, save, currentDefectIds }) => {
  const { createItemUseModal } = useBaseAction();
  const { TestToDefect = '' } = useItemLinkTypeConfig();
  const currentRef = React.useRef(null);
  const createDefect = useCallback(async () => {
    const token = uniqueId('TestDefect');
    const { item: defectItem, extraData } = await createItemUseModal({
      type: TestType.TestDefect,
      extraData: { token },
    });
    // token 不相同则不创建关联
    if (extraData.token !== token) return;

    addDefect(TestToDefect, testId, [defectItem.objectId]).then(() => {
      message.success('添加成功');
      if (currentDefectIds) {
        save && save([...currentDefectIds, defectItem.objectId]);
        return;
      }
      save && save([defectItem.objectId]);
    });
  }, [createItemUseModal, testId, TestToDefect, save, currentDefectIds]);

  const handleAddDefect = (itemIds: string[]) => {
    if (currentDefectIds) {
      save && save([...currentDefectIds, ...itemIds]);
      return;
    }
    save && save(itemIds);
  };

  const menu = (
    <Menu>
      <AddDefectModal
        trigger={
          <Menu.Item key="0">
            <a>添加缺陷</a>
          </Menu.Item>
        }
        testId={testId}
        currentDefectIds={currentDefectIds}
        save={() => handleAddDefect}
      />

      <Menu.Item key="1">
        <a onClick={createDefect}>创建缺陷</a>
      </Menu.Item>
    </Menu>
  );

  return (
    <div ref={currentRef}>
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
