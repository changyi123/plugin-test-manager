import React from 'react';
import { Image } from '@osui/ui';
import { getDevConfig } from '@/devEnv';

const ItemIcon: React.FC<{ src: string }> = ({ src }) => {
  const { baseURL } = getDevConfig();
  const url = process.env.NODE_ENV === 'production' ? src : `${baseURL}${src}`;
  return <Image width={16} height={16} preview={false} src={url} />;
};

export default ItemIcon;
