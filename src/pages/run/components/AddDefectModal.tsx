import React, { useEffect } from 'react';
import type { ModalProps } from '@osui/modal';
import { Modal, Spin } from '@osui/ui';
import useMergedState from 'rc-util/lib/hooks/useMergedState';
import { getRootContainer } from '@/lib/utils/helper';
import { getItemByIQL } from '@/lib/api/proxima';
import DebounceSelect from '@/components/common/DebounceSelect';
import { useSafeState, useRequest } from 'ahooks';
import css from './StepList.less';

interface IDefectModalProps {
  trigger?: JSX.Element;
  visible?: boolean;
  testId: string;
  onCancel?: ModalProps['onCancel'];
}

interface AddDefectSelect {
  placeholder?: string;
  ignoreTestEntityIds?: string[];
}

export const AddDefectSelect: React.FC<AddDefectSelect> = props => {
  const { ignoreTestEntityIds = [] } = props;
  const [selectValue, setSelectValue] = useSafeState([]);
  const filterOptions = React.useCallback(
    options => {
      // 在 ignoreTestEntityIds 列表的数据给过滤掉
      return options.filter(opt => !ignoreTestEntityIds.includes(opt.value));
    },
    [ignoreTestEntityIds],
  );

  const { loading, runAsync: getItems } = useRequest(
    async name => {
      const { items } = await getItemByIQL({
        limit: 50,
        nameLike: name,
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
        mode="multiple"
        value={selectValue}
        className={css('select')}
        fetchOptions={getItems}
        filterOptions={filterOptions}
        onChange={value => setSelectValue(value)}
        placeholder={props.placeholder ?? '选择事项'}
      />
    </Spin>
  );
};

const AddDefectModal: React.FC<IDefectModalProps> = props => {
  const [isVisible, setIsVisible] = useMergedState<boolean>(!!props.visible, {
    value: props.visible,
  });

  const handleCloseModal = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    setIsVisible(false);
    props.onCancel?.(e);
  };

  return (
    <>
      <Modal
        getContainer={getRootContainer}
        title={'请选择添加缺陷'}
        visible={isVisible}
        maskClosable={false}
        width="800px"
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
