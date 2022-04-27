import React, { useEffect, useState } from 'react';
import { Button, Upload, Checkbox, message, Image } from 'antd';
import { TabsComponentBaseProps } from './type';
import { DeleteOutlined, DownloadOutlined, UploadOutlined, LoadingOutlined } from '@/icons';
import Parse from '@/lib/parse';

import { updateTestRun } from '@/lib/api/runs';
import dayjs from 'dayjs';

import cx from './AttachmentUpload.less';
import { actionConfirm } from '@/lib/utils/helper';
type AttachmentUploadProps = TabsComponentBaseProps;

const AttachmentList: React.FC<any> = props => {
  const { fileRef, fileList, setFileList, testRunData, testRunEntity, onDataChange } = props;

  const [checkList, stCheckList] = useState<any[]>([]);
  const [isBatch, setIsBatch] = useState(false);
  const [indeterminate, setIndeterminate] = useState(false);
  const [checkedAll, setCheckedAll] = useState(false);

  useEffect(() => {
    setCheckedAll(checkList.length === fileList.length);
    setIndeterminate(!!checkList.length && checkList.length < fileList.length);
  }, [checkList, fileList]);

  const deleteFileLise = file => {
    const arr = file.url.split('/');
    const fileName = arr[arr.length - 1];
    Parse.Cloud.run('deleteFile', {
      fileName: fileName,
    })
      .then(async () => {
        const fileArr = fileList.filter(v => v.uid !== file.uid);

        await updateTestRun(testRunEntity, {
          runDetail: {
            ...(testRunData.runDetail ?? {}),
            attachments: fileArr,
          },
        });

        fileRef.current.delete(file.uid);

        setFileList(fileArr);
        onDataChange();
      })
      .catch(error => {
        message.error(error.message);
      });
  };

  const downLoadFile = file => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', file.url, true);
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
        // document.body.removeChild(link);
      }
    };
    xhr.send();
  };

  const checkoutAll = e => {
    setCheckedAll(e.target.checked);
    stCheckList(e.target.checked ? fileList.map(d => d.uid) : []);
    indeterminate && setIndeterminate(false);
  };

  const testImg = name => /\.(png|jpe?g|gif|svg)(\?.*)?$/.test(name);

  return (
    <>
      {fileList.length ? (
        <div className={cx('file-cont')}>
          <div className={cx('file-list-header')}>
            <Button onClick={() => setIsBatch(x => !x)}>{isBatch ? '取消操作' : '批量操作'}</Button>
            {isBatch && (
              <>
                <div className={cx('file-check')}>
                  <Checkbox
                    indeterminate={indeterminate}
                    onChange={checkoutAll}
                    checked={checkedAll}
                  >
                    已选择
                    <span style={{ padding: '0 4px', color: '#0045d9' }}>{checkList.length}</span>项
                  </Checkbox>
                </div>
                <div className={cx('file-batch-action')}>
                  <div
                    className={cx('action-icon')}
                    onClick={() => {
                      if (checkList.length) {
                        fileList
                          .filter(flie => checkList.includes(flie.uid))
                          .forEach(flie => {
                            downLoadFile(flie);
                          });
                      } else {
                        message.warning('请选择附件');
                      }
                    }}
                  >
                    <DownloadOutlined className={cx('icon')} />
                    下载
                  </div>
                  <div
                    className={cx('action-icon')}
                    onClick={() => {
                      if (checkList.length) {
                        actionConfirm(
                          '该操作会将该附件从测试用例中移除，是否继续操作？',
                          async () => {
                            const list = fileList.filter(file => !checkList.includes(file.uid));

                            Promise.all(
                              fileList
                                .filter(file => checkList.includes(file.uid))
                                .map(file => {
                                  const arr = file.url.split('/');
                                  const fileName = arr[arr.length - 1];

                                  return Parse.Cloud.run('deleteFile', {
                                    fileName: fileName,
                                  });
                                }),
                            );

                            await updateTestRun(testRunEntity, {
                              runDetail: {
                                ...(testRunData.runDetail ?? {}),
                                attachments: list,
                              },
                            });

                            fileRef.current.clear();
                            if (!checkedAll) {
                              list.forEach(file => {
                                fileRef.current.set(file.uid, file);
                              });
                            }
                            setFileList(list);
                            setCheckedAll(false);
                            stCheckList([]);

                            onDataChange();
                          },
                        );
                      } else {
                        message.warning('请选择附件');
                      }
                    }}
                  >
                    <DeleteOutlined className={cx('icon')} />
                    删除
                  </div>
                </div>
              </>
            )}
          </div>
          <Checkbox.Group
            value={checkList}
            onChange={checkValue => stCheckList(checkValue)}
            style={{ width: '100%' }}
          >
            {fileList?.map(file => (
              <div className={cx('file-list')} key={file.uid}>
                <div className={cx('list-cont')}>
                  <div className={cx('name', 'text')}>
                    {isBatch && (
                      <div className={cx('file-checkbox')}>
                        <Checkbox value={file.uid}></Checkbox>
                      </div>
                    )}
                    <div className={cx('name-cont')}>
                      <div className={cx('name-text')}>{file.name}</div>
                      {testImg && file.url && (
                        <div className={cx('name-img')}>
                          <Image src={file.url}></Image>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={cx('size', 'text')}>{file.size}kb</div>
                  <div className={cx('status', 'text')}>
                    {file.status === 'uploading' && <LoadingOutlined />}
                  </div>
                </div>
                <div className={cx('action-time')}>
                  <div className={cx('upload-time', 'text')}>{file.time}</div>
                  <div className={cx('action')}>
                    <div className={cx('action-icon')} onClick={() => downLoadFile(file)}>
                      <DownloadOutlined className={cx('icon')} />
                      下载
                    </div>
                    <div
                      className={cx('action-icon')}
                      onClick={() =>
                        actionConfirm('该操作会将该附件从测试用例中移除，是否继续操作？', () => {
                          deleteFileLise(file);
                          onDataChange();
                        })
                      }
                    >
                      <DeleteOutlined className={cx('icon')} />
                      删除
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Checkbox.Group>
        </div>
      ) : (
        ''
      )}
    </>
  );
};

const AttachmentUpload: React.FC<AttachmentUploadProps> = props => {
  const { testRunData, testRunEntity, onDataChange } = props;

  const fileRef = React.useRef(new Map());

  const [fileList, setFileList] = useState<any[]>([]);

  useEffect(() => {
    setFileList(testRunData.runDetail?.attachments ?? []);
    fileRef.current.clear();
  }, [testRunData.runDetail?.attachments]);

  const saveParseFile = async fileData => {
    const getFileList = (isError = false) => {
      const _list = (
        isError
          ? [...fileRef.current.values()].filter(d => d.uid !== fileData.file.uid)
          : [...fileRef.current.values()]
      )
        .concat(fileList)
        .reduce((prev, cur) => {
          !prev.some(d => d.uid === cur.uid) && prev.push(cur);

          return prev;
        }, []);

      return [
        ..._list.filter(d => !d.time),
        ..._list
          .filter(d => d.time)
          .sort((a, b) => (dayjs(b.time) as any) - (dayjs(a.time) as any)),
      ];
    };

    setFileList(getFileList());

    const parseFile = new Parse.File(fileData.file.name, fileData.file);

    parseFile.save().then(
      async res => {
        fileRef.current.set(fileData.file.uid, {
          uid: fileData.file.uid,
          name: fileData.file.name,
          size: parseFloat(`${fileData.file.size / 1024}`).toFixed(2),
          time: dayjs().format('YYYY-MM-DD HH:mm'),
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
        onDataChange();
      },
      error => {
        message.error(error.message);
        fileRef.current.delete(fileData.file.uid);
        setFileList(getFileList(true));
      },
    );
  };

  const uploadProps = {
    name: 'file',
    multiple: true,
    showUploadList: false,
    beforeUpload: file => {
      return new Promise<boolean>(resolve => {
        // 限制大小
        if (file.size / 1024 / 1024 > 50) {
          message.error(`${file.name}大小不能超过${50}MB`, 2);
          return Upload.LIST_IGNORE;
        } else {
          return resolve(true);
        }
      });
    },
    customRequest: async fileData => {
      fileRef.current.set(fileData.file.uid, {
        uid: fileData.file.uid,
        name: fileData.file.name,
        size: parseFloat(`${fileData.file.size / 1024}`).toFixed(2),
        status: 'uploading',
      });

      await saveParseFile(fileData);
    },
  };

  const AttachmentLists = React.useMemo(
    () => (
      <AttachmentList
        fileRef={fileRef}
        fileList={fileList}
        setFileList={setFileList}
        testRunEntity={testRunEntity}
        testRunData={testRunData}
        onDataChange={onDataChange}
      />
    ),
    [fileRef, fileList, setFileList, testRunEntity, testRunData, onDataChange],
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
