import React from 'react';
import { Button, Upload } from 'antd';
import { TabsComponentBaseProps } from './type';
import { UploadOutlined } from '@/icons';

type AttachmentListProps = TabsComponentBaseProps;

const AttachmentList: React.FC<AttachmentListProps> = () => {
  const uploadProps = {
    name: 'file',
    multiple: true,
    showUploadList: false,
    // customRequest: fileData => {
    //   console.log(11111, fileData);
    // },
  };
  return (
    <>
      <div>111</div>
      <Upload {...uploadProps}>
        <Button type="link" icon={<UploadOutlined />} style={{ padding: 0 }}>
          上传附件
        </Button>
      </Upload>
    </>
  );
};

export default AttachmentList;
