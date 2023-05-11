import { Button, Modal } from 'antd';
import { noop } from 'lodash';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { getRootContainer } from '@/lib/utils/helper';

import cx from './MaxRenderNodeConfirm.less';

const ActionHookMethodKeys = ['onNext', 'onGoBack', 'onCancel'] as const;

type ActionHookMethods = Record<typeof ActionHookMethodKeys[number], () => void>;

const MaxRenderNodeConfirm: React.FC<ActionHookMethods> = props => {
  const { t } = useTranslation('', {
    keyPrefix: 'page.repository.view.minder.maxRenderNodeConfirm',
  });

  const footer = (
    <div>
      <Button onClick={props.onCancel}>{t('cancel')}</Button>
      <Button onClick={props.onGoBack}>{t('goBack')}</Button>
      <Button type="primary" onClick={props.onNext}>
        {t('next')}
      </Button>
    </div>
  );

  return (
    <Modal
      open={true}
      width={450}
      footer={footer}
      closable={false}
      className={cx('modal')}
      bodyStyle={{ padding: 0 }}
      getContainer={getRootContainer}
    >
      <div className={cx('confirm')}>
        <p className={cx('title')}>{t('title')}</p>
        <p className={cx('content')}>{t('content')}</p>
      </div>
    </Modal>
  );
};

export const openMaxRenderNodeConfirm = (actionHooks: Partial<ActionHookMethods> = {}) => {
  // const mountContainer = getRootContainer();
  const renderElement = document.createElement('div');

  const props = ActionHookMethodKeys.reduce((acc, key) => {
    return {
      ...acc,
      [key]: () => {
        const method = actionHooks[key] ?? noop;
        method();
        unmountComponentAtNode(renderElement);
      },
    };
  }, {} as ActionHookMethods);

  render(<MaxRenderNodeConfirm {...props} />, renderElement);
};
