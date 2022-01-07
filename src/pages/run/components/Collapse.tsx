import React, { useState } from 'react';
import { Space } from '@osui/ui';
import { RightOutlined, CaretRightOutlined } from '@ant-design/icons';

import css from './Collapse.less';

interface ICollapseProps {
  title: string;
  visible?: boolean;
  num?: number;
  titleExtra?: React.ReactNode;
}

interface CollapseInterface extends React.FC<ICollapseProps> {
  Panel: typeof CollapsePanel;
}

const Collapse: CollapseInterface = props => {
  const { title, visible = true, children } = props;
  const [show, setShow] = useState<boolean>(visible);

  return (
    <div className={css('collapse')}>
      <div className={css('collapse__header')} onClick={() => setShow(!show)}>
        <div className={css('collapse__header__icon')}>
          <RightOutlined className={show !== undefined && (show ? css('show') : css('close'))} />
        </div>
        <div className={css('collapse__header__topic')}>{title}</div>
      </div>

      {show && <div className={css('collapse__box')}>{children}</div>}
    </div>
  );
};

const CollapsePanel: React.FC<ICollapseProps> = props => {
  const { title, visible = true, children, titleExtra, num } = props;
  const [show, setShow] = useState<boolean>(visible);
  return (
    <div className={css('collapse__panel')}>
      <div className={css('collapse__panel__header')}>
        <div
          className={css('collapse__panel__header__tools')}
          onClick={e => {
            e.stopPropagation();
            setShow(!show);
          }}
        >
          <div className={css('icon')}>
            <CaretRightOutlined
              className={show !== undefined && (show ? css('show') : css('close'))}
            />
          </div>

          <div className={css('title')}>{title}</div>
        </div>

        {num && <div className={css('num')}>{num}</div>}

        {titleExtra && (
          <div className={css('collapse__panel__extra')}>
            <Space>{titleExtra}</Space>
          </div>
        )}
      </div>

      {show && <div className={css('collapse__panel__box')}>{children}</div>}
    </div>
  );
};

Collapse.Panel = CollapsePanel;

export default Collapse;
