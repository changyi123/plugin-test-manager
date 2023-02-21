import React, { useEffect, useState, useCallback } from 'react';
import { CloudUploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { cloneDeep } from 'lodash';

import { UploadProps } from 'antd/lib/upload';

import { message, Upload } from 'antd';
import Parse from '@/lib/parse';
import useI18n from '@/lib/hooks/useI18n';

import cx from './index.less';
const { Dragger } = Upload;

// 空的数组list
export const EMPTY_FILE_LIST = [];

type annexData = {
  uid: string;
  name: string;
  status?: string;
  href?: string;
  linkProps?: { download: string };
};

export interface AnnexProps {
  value?: any[];
  readonly?: boolean;
  onChange?: (data: annexData[]) => void;
  desc?: string;
  maxCount?: number;
  uploadProps?: UploadProps;
}

const UploadFile: React.FC<AnnexProps> = props => {
  const { t } = useI18n();
  const { readonly, onChange, value, desc, maxCount, uploadProps } = props;
  const [fileList, setFileList] = useState(EMPTY_FILE_LIST);
  const [flag, setFlag] = useState(false);

  useEffect(() => {
    setFileList(value || EMPTY_FILE_LIST);
  }, [value]);
  const onRemove = useCallback(
    file => {
      const arr = file.href.split('/');
      const fileName = arr[arr.length - 1];
      Parse.Cloud.run('deleteFile', {
        fileName: fileName,
      })
        .then(() => {
          const fileArr = fileList.filter(v => v.uid !== file.uid);
          setFileList(fileArr);
          setFlag(true);
        })
        .catch(error => {
          message.error(error.message);
          const data = cloneDeep(fileList);
          const index = fileList.findIndex(v => v.uid === file.uid);
          data[index].status = 'done';
          setFileList(data);
        });
    },
    [fileList],
  );
  useEffect(() => {
    if (flag) {
      onChange?.(fileList);
      if (maxCount === 1 && fileList.length === 2) {
        onRemove(fileList[1]);
      }
      setFlag(false);
    }
  }, [flag, onChange, fileList, maxCount, onRemove]);

  const draggerProps = {
    ...uploadProps,
    fileList: fileList,
    name: 'annex',
    multiple: true,
    disabled: readonly,
    showUploadList: {
      showDownloadIcon: true,
      downloadIcon: <DownloadOutlined />,
    },
    customRequest(fileData) {
      const fileArr = cloneDeep(fileList);
      fileArr.unshift({
        uid: fileData.file.uid,
        name: fileData.file.name,
        status: 'uploading',
      });
      // 超过最大数量进行限制
      if (fileArr.length > maxCount) {
        message.error(`${t('components.common.uploadFile.uploadErrorMessage')}${maxCount}`);
        return;
      }
      setFileList(fileArr);
      const parseFile = new Parse.File(fileData.file.name, fileData.file);
      parseFile.save().then(
        res => {
          fileArr[0].status = 'done';
          fileArr[0].href = res._url;
          fileArr[0].linkProps = { download: fileArr[0].name };
          setFileList(fileArr);
          setFlag(true);
        },
        error => {
          message.error(error.message);
          fileArr.shift();
          setFileList(fileArr);
        },
      );
    },
    onRemove: onRemove,
    onDownload(file) {
      // 由于返回的url与系统url不同源，所以不能使用a标签进行下载
      const xhr = new XMLHttpRequest();
      xhr.open('GET', file.href, true);
      xhr.responseType = 'blob';
      xhr.onload = () => {
        if (xhr.status === 200) {
          // 获取文件blob数据并保存
          const urlObject = window.URL;
          const export_blob = new Blob([xhr.response]);
          const link = document.createElement('a');
          link.href = urlObject.createObjectURL(export_blob);
          link.download = file.name;
          link.click();
        }
      };
      xhr.send();
    },
  };

  return (
    <Dragger {...draggerProps} maxCount={1}>
      <p className={cx('upload-drag-text')}>
        <CloudUploadOutlined className={cx('upload')} />
        <span>{desc}</span>
      </p>
    </Dragger>
  );
};

export default UploadFile;
