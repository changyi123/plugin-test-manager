/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-spread */
import React, { FC } from 'react';
import { Modal } from '@osui/ui';

import cx from './index.less';
import { getRootContainer } from '@/lib/utils/helper';

interface ModelItem {
  isModalVisible: boolean;
  handleDeleteDone: (data: any) => void;
  handleDeleteCancel: () => void;
  deleteSize: number;
}

const DeleteModal: FC<ModelItem> = ({
  isModalVisible,
  handleDeleteDone,
  handleDeleteCancel,
  deleteSize,
}) => {
  return (
    <Modal
      destroyOnClose
      maskClosable={false}
      width={600}
      autoHeight
      title="删除用例"
      visible={isModalVisible}
      getContainer={() => getRootContainer()}
      onOk={handleDeleteDone}
      onCancel={handleDeleteCancel}
    >
      <p className={cx('sub_title')}>
        <span> 是否确定删除&nbsp;{deleteSize}&nbsp;个用例？删除后，数据不可再恢复。</span>
      </p>
    </Modal>
  );
};
export default DeleteModal;
