import React, { useCallback } from 'react';
import { Tooltip, message } from '@osui/ui';
import { CopyOutlined } from '@ant-design/icons';
import copy from '@/lib/utils/copyToClipboard';

import css from './index.less';

export interface ICopyIconProps {
  text: string;
}

const CopyIconCom: React.FC<ICopyIconProps> = ({ text }) => {
  const handleCopy = useCallback(
    (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
      e.stopPropagation();
      copy(text);
      message.success('复制成功');
    },
    [text],
  );
  return (
    <Tooltip title="复制">
      <CopyOutlined className={css('copy-icon')} onClick={e => handleCopy(e)} />
    </Tooltip>
  );
};

export default CopyIconCom;
