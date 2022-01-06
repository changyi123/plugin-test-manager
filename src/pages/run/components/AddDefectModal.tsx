import React, { useState } from 'react';
import type { ModalProps } from '@osui/modal';
import { Modal, Spin, message } from '@osui/ui';
import useMergedState from 'rc-util/lib/hooks/useMergedState';
import { getItemByIQL } from '@/lib/api/proxima';
import DebounceSelect from '@/components/common/DebounceSelect';
import { useSafeState, useRequest } from 'ahooks';
import css from './StepList.less';
import { useTestConfig } from '@/lib/hooks/useContext';
import { addDefect } from '@/lib/api/runs';
import { useItemLinkTypeConfig } from './hooks';

interface IDefectModalProps {
  trigger?: JSX.Element;
  visible?: boolean;
  testId: string;
  currentDefectIds?: string[];
  save?: () => (value: string[]) => void;
  onCancel?: ModalProps['onCancel'];
}

interface AddDefectSelect {
  placeholder?: string;
  ignoreTestEntityIds?: string[];
}

let chooseItems = [];

export const AddDefectSelect: React.FC<AddDefectSelect> = props => {
  const { ignoreTestEntityIds = [] } = props;
  const { config } = useTestConfig();
  const { defectsMapping } = config;
  const [selectValue, setSelectValue] = useSafeState<Array<string>>([]);
  const filterOptions = React.useCallback(
    options => {
      // 在 ignoreTestEntityIds 列表的数据给过滤掉
      return options.filter(opt => !ignoreTestEntityIds.includes(opt.value));
    },
    [ignoreTestEntityIds],
  );

  const handleSelectChange = React.useCallback(
    (values: Array<string>) => {
      setSelectValue(values);
      chooseItems = values;
    },
    [setSelectValue],
  );

  const { loading, runAsync: getItems } = useRequest(
    async name => {
      const { items } = await getItemByIQL({
        limit: 50,
        nameLike: name,
        itemType: defectsMapping,
      });

      return items
        .map(item => {
          return {
            label: (
              <div>
                <span style={{ display: 'inline-block', marginRight: 4, fontSize: 13 }}>
                  {item.name}
                </span>
                <span style={{ fontSize: 12, color: '#aaa' }}>({item.key})</span>
              </div>
            ),
            value: item.objectId,
          };
        })
        .filter(Boolean);
    },
    {
      manual: true,
    },
  );

  return (
    <Spin spinning={loading}>
      <DebounceSelect
        getPopupContainer={() => document.getElementById('dropdown_add_defect')}
        mode="multiple"
        value={selectValue}
        notFoundContent={loading ? <Spin /> : <div>未找到事项</div>}
        className={css('select')}
        fetchOptions={getItems}
        filterOptions={filterOptions}
        onChange={handleSelectChange}
        placeholder={props.placeholder ?? '选择事项'}
      />
    </Spin>
  );
};

const AddDefectModal: React.FC<IDefectModalProps> = props => {
  const { TestToDefect = '' } = useItemLinkTypeConfig();
  const [isVisible, setIsVisible] = useMergedState<boolean>(!!props.visible, {
    value: props.visible,
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleCloseModal = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    setIsVisible(false);
    props.onCancel?.(e);
  };

  const handleConfirmModal = () => {
    setConfirmLoading(true);
    addDefect(TestToDefect, props.testId, chooseItems).then(() => {
      message.success('添加成功');
      setConfirmLoading(false);
      if (props.currentDefectIds) {
        props.save && props.save()([...props.currentDefectIds, ...chooseItems]);
        return;
      }
      props.save && props.save()(chooseItems);
    });
  };

  return (
    <>
      <Modal
        getContainer={() => document.getElementById('dropdown_add_defect')}
        title={'请选择添加缺陷'}
        visible={isVisible}
        maskClosable={false}
        width="800px"
        okButtonProps={{
          loading: confirmLoading,
        }}
        onOk={handleConfirmModal}
        onCancel={handleCloseModal}
        destroyOnClose
      >
        {isVisible && <AddDefectSelect />}
      </Modal>
      {props.trigger &&
        React.cloneElement(props.trigger, {
          ...props.trigger.props,
          onClick: (e: any) => {
            setIsVisible(!isVisible);
            props.trigger?.props?.onClick?.(e);
          },
        })}
    </>
  );
};

export default AddDefectModal;
