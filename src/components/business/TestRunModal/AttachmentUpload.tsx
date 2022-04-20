import React from 'react';
import { Button, Upload } from 'antd';
import { TabsComponentBaseProps } from './type';
import { UploadOutlined } from '@/icons';

import cx from './AttachmentUpload.less';

type AttachmentUploadProps = TabsComponentBaseProps;

const AttachmentList: React.FC<any> = () => {
  const fileList = [
    {
      key: 'sdfasdfasf',
      name: 'a.xlsx',
      url: '111',
      size: '101212',
      uploadTime: '1111',
      status: 'uploading',
    },
    {
      key: '22sdfsad',
      name: 'a.xlsx',
      url: '111',
      size: '101212',
      uploadTime: '1111',
      status: 'done',
    },
  ];

  return (
    <>
      <div className={cx('file-cont')}>
        {fileList.map(file => (
          <div className={cx('file-list')} key={file.key}>
            <div className={cx('name', 'text')}>{file.name}</div>
            <div className={cx('status', 'text')}>{file.status}</div>
            <div className={cx('size', 'text')}>{file.size}</div>
            <div className={cx('upload-time', 'text')}>{file.uploadTime}</div>
            {/* <div className={cx('action')}>{file.name}</div> */}
          </div>
        ))}
      </div>
    </>
  );
};

const AttachmentUpload: React.FC<AttachmentUploadProps> = () => {
  const fileList = [
    {
      key: 1,
      name: 'a.xlsx',
      url: '111',
      size: '101212',
      uploadTime: '1111',
      status: 'uploading',
    },
    {
      key: 2,
      name: 'a.xlsx',
      url: '111',
      size: '101212',
      uploadTime: '1111',
      status: 'done',
    },
  ];

  const uploadProps = {
    name: 'file',
    multiple: true,
    showUploadList: false,
    customRequest: fileData => {
      // console.log(11111, fileData);
      // const fileArr = cloneDeep(fileList);
      [
        {
          key: fileData.file,
          name: 'a.xlsx',
          url: '111',
          size: '101212',
          uploadTime: '1111',
          status: 'uploading',
        },
        ...fileList,
      ];
      // // setFileList(fileArr);
      // const parseFile = new Parse.File(fileData.file.name, fileData.file);
      // parseFile.save().then(
      //   res => {
      //     fileArr[0].status = 'done';
      //     fileArr[0].href = res._url;
      //     fileArr[0].linkProps = { download: fileArr[0].name };
      //     setFileList(fileArr);
      //     setFlag(true);
      //   },
      //   error => {
      //     message.error(error.message);
      //     fileArr.shift();
      //     setFileList(fileArr);
      //   },
      // );
    },
  };
  return (
    <>
      <AttachmentList />
      <Upload {...uploadProps}>
        <Button type="link" icon={<UploadOutlined />} style={{ padding: 0 }}>
          上传附件
        </Button>
      </Upload>
    </>
  );
};

export default AttachmentUpload;
