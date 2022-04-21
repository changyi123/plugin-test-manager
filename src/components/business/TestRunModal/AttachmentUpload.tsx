import React, { useState } from 'react';
import { Button, Upload } from 'antd';
import { TabsComponentBaseProps } from './type';
import { DeleteOutlined, DownloadOutlined, UploadOutlined, LoadingOutlined } from '@/icons';
import Parse from '@/lib/parse';

import { message } from '@osui/ui';
import { updateTestRun } from '@/lib/api/runs';
// import { Dayjs } from 'dayjs';

import cx from './AttachmentUpload.less';
import { actionConfirm } from '@/lib/utils/helper';
type AttachmentUploadProps = TabsComponentBaseProps;

const AttachmentList: React.FC<any> = props => {
  const { fileList, setFileList, testRunData, testRunEntity } = props;

  const deleteFileLise = file => {
    const arr = file.url.split('/');
    const fileName = arr[arr.length - 1];
    Parse.Cloud.run('deleteFile', {
      fileName: fileName,
    })
      .then(() => {
        const fileArr = fileList.filter(v => v.uid !== file.uid);

        updateTestRun(testRunEntity, {
          runDetail: {
            ...(testRunData.runDetail ?? {}),
            attachments: fileArr,
          },
        });

        setFileList(fileArr);
      })
      .catch(error => {
        message.error(error.message);
        // const data = cloneDeep(fileList);
        // const index = fileList.findIndex(v => v.uid === file.uid);
        // data[index].status = 'done';
        // setFileList(data);
      });
  };

  return (
    <>
      <div className={cx('file-cont')}>
        {fileList?.map(file => (
          <div className={cx('file-list')} key={file.uid}>
            <div className={cx('name', 'text')}>{file.name}</div>
            <div className={cx('status', 'text')}>
              {file.status === 'uploading' ? (
                <div className={cx('status-icon')}>
                  <LoadingOutlined />
                  <span className={cx('icon-text')}>上传中</span>
                </div>
              ) : (
                <div className={cx('status-icon')}>
                  <span className={cx('upload-done-icon')}></span>
                  <span className={cx('icon-text')}>上传完成</span>
                </div>
              )}
            </div>
            <div className={cx('size', 'text')}>{file.size}</div>
            <div className={cx('upload-time', 'text')}>{file.time}</div>
            <div className={cx('action')}>
              <DownloadOutlined className={cx('icon')} />
              <DeleteOutlined
                className={cx('icon')}
                onClick={() =>
                  actionConfirm('该操作会将该附件从测试用例中移除，是否继续操作？', () => {
                    deleteFileLise(file);
                  })
                }
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

const AttachmentUpload: React.FC<AttachmentUploadProps> = props => {
  const { testRunData, testRunEntity } = props;

  const fileRef = React.useRef(new Map());

  const [fileList, setFileList] = useState<any[]>(testRunData.runDetail?.attachments ?? []);

  const saveParseFile = async fileData => {
    const getFileList = (isError = false) =>
      (isError
        ? [...fileRef.current.values()].filter(d => d.uid !== fileData.file.uid)
        : [...fileRef.current.values()]
      )
        .concat(fileList)
        .reduce((prev, cur) => {
          !prev.some(d => d.uid === cur.uid) && prev.push(cur);

          return prev;
        }, []);

    setFileList(getFileList());

    const parseFile = new Parse.File(fileData.file.name, fileData.file);

    parseFile.save().then(
      async res => {
        fileRef.current.set(fileData.file.uid, {
          uid: fileData.file.uid,
          name: fileData.file.name,
          size: fileData.file.size,
          // status: 'done',
          url: res.toJSON().url,
        });

        // 存储关系到测试用例
        await updateTestRun(testRunEntity, {
          runDetail: {
            ...(testRunData.runDetail ?? {}),
            attachments: getFileList(),
          },
        });

        setFileList(getFileList());
      },
      error => {
        message.error(error.message);
        setFileList(getFileList(true));
      },
    );
  };

  const uploadProps = {
    name: 'file',
    multiple: true,
    showUploadList: false,
    customRequest: async fileData => {
      fileRef.current.set(fileData.file.uid, {
        uid: fileData.file.uid,
        name: fileData.file.name,
        size: fileData.file.size,
        status: 'uploading',
      });

      await saveParseFile(fileData);
    },
  };

  const AttachmentLists = React.useMemo(
    () => (
      <AttachmentList
        fileList={fileList}
        setFileList={setFileList}
        testRunEntity={testRunEntity}
        testRunData={testRunData}
      />
    ),
    [fileList, setFileList, testRunEntity, testRunData],
  );

  return (
    <>
      {AttachmentLists}
      <Upload {...uploadProps}>
        <Button type="link" icon={<UploadOutlined />} style={{ padding: 0 }}>
          上传附件
        </Button>
      </Upload>
    </>
  );
};

export default AttachmentUpload;
