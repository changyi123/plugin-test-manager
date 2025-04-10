import { PlusOutlined } from '@ant-design/icons';
import { Button, Dropdown, Menu, message } from 'antd';
import React from 'react';

import TestEntitySelectorModal, { ActionType } from '@/components/business/TestEntitySelectorModal';
import { TestType } from '@/lib/constants';
import { useBaseAction } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { Step, TestEntity } from '@/lib/types/Test';
import { getEditorOrStringText } from '@/lib/utils/helper';
import { usePageContext } from '@/pages/plan/hook';

import { getRootContainer } from '../TestStep/helper';
import { useItemLinkTypeConfig } from './hooks';

type AddDefectButtonProps = {
  testId?: string;
  plainStyle?: boolean;
  step?: Step;
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
    step,
    onLoading,
    currentDefectIds,
    allRelationDefectIds,
    className,
    plainStyle,
  } = props;
  const { t } = useI18n();
  const { createItemUseModal, getCreatePermission } = useBaseAction();
  const { selectedTestPlan, activeExecutionPlan } = usePageContext();
  const { TestToDefect = '' } = useItemLinkTypeConfig();
  const currentRef = React.useRef(null);
  const testEntitySelectorRef = React.useRef<ActionType>();
  const createDefect = React.useCallback(
    async (isNeedContentFieldsInfo = false) => {
      let content = null;
      if (isNeedContentFieldsInfo) {
        const { action, actualResult, result, data, index } = step;
        content = [
          {
            children: [
              {
                text: `${t('components.business.testRunModal.testStep.planName')}：${
                  selectedTestPlan?.name
                }  `,
              },
            ],
            type: 'p',
          },
          {
            type: 'p',
            id: 'jizvv',
            children: [
              {
                text: `${t('components.business.testRunModal.testStep.testExecutionName')}：${
                  activeExecutionPlan?.name
                }  `,
              },
            ],
          },
          {
            type: 'p',
            id: 'ls15d',
            children: [
              {
                text: `${t('components.business.testRunModal.testStep.testCaseName')}：${testRunEntity?.name}  `,
              },
            ],
          },
          {
            type: 'p',
            id: 'lx4en',
            children: [
              {
                text: `${t('components.business.testRunModal.testStep.stepNumber')}：${index + 1}`,
              },
            ],
          },
          {
            type: 'p',
            id: '1p7t5',
            children: [
              {
                text: `${t(
                  'components.business.testRunModal.testStep.stepName',
                )}：${getEditorOrStringText(action)}  `,
              },
            ],
          },
          {
            type: 'p',
            id: '20ule',
            children: [
              {
                text: `${t(
                  'components.business.testRunModal.testStep.expect',
                )}：${getEditorOrStringText(result)}  `,
              },
            ],
          },
          {
            type: 'p',
            id: '29ygx',
            children: [
              {
                text: `${t(
                  'components.business.testRunModal.testStep.data',
                )}：${getEditorOrStringText(data)}  `,
              },
            ],
          },
          {
            type: 'p',
            id: 'jq7og',
            children: [
              {
                text: `${t(
                  'components.business.testRunModal.testStep.result',
                )}：${getEditorOrStringText(actualResult)}`,
              },
            ],
          },
        ];
      }
      const { itemList: defectItemList } = await createItemUseModal({
        type: TestType.TestDefect,
        extraData: {
          extraValues: { content },
          useItemBatchCreate: true,
        },
      });

      onLoading?.();
      // 创建事项关联
      try {
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
    },
    [
      createItemUseModal,
      selectedTestPlan?.name,
      activeExecutionPlan?.name,
      testRunEntity,
      step,
      onLoading,
      currentDefectIds,
      onSave,
      t,
    ],
  );

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
        <a onClick={() => createDefect(true)}>
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
        getContainer={getRootContainer}
      />
      {plainStyle ? (
        <div className={className}>
          <Button onClick={addExistedDefect} type="link">
            {t('components.business.testRunModal.addDefectButton.addDefect')}
          </Button>
          <Button onClick={() => createDefect(false)} type="link">
            {t('components.business.testRunModal.addDefectButton.createDefect')}
          </Button>
        </div>
      ) : (
        <Dropdown
          key="2"
          dropdownRender={() => menu}
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
