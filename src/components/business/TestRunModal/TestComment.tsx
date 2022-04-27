import React, { useMemo } from 'react';
import { EditorField } from '@projectproxima/components';
import { Button, Input, Space } from 'antd';

import cx from './TestComment.less';
import { useCurrentUser, useGetUserById } from '@/lib/api/user';
import { updateTestRun } from '@/lib/api/runs';
import { v4 as uuid } from 'uuid';
import dayjs from 'dayjs';

const defaultValue = [
  {
    type: 'p',
    children: [
      {
        text: '',
      },
    ],
  },
];

const getText = (values: any[]): string =>
  values.reduce((prev, cur) => {
    prev = prev.concat(cur.text ?? '');

    if (cur.children) {
      prev = prev.concat(getText(cur.children));
    }

    return prev;
  }, '');

const TestComment: React.FC<any> = (props: any) => {
  const { testRunEntity, testRunData, onDataChange } = props;

  // 当前编辑器中显示的文本
  const { data: currentUser } = useCurrentUser();
  const [commentValue, setCommentValue] = React.useState(defaultValue);
  const [testCommentList, setTestCommentList] = React.useState([]);
  const [ids, setIds] = React.useState([]);
  const [showEditor, setShowEditor] = React.useState(false);
  const [disable, setDisable] = React.useState(true);
  const [placeholder] = React.useState('在此输入评论内容');
  const changeHandle = value => setCommentValue(value);

  const { data: userInfo, mutate } = useGetUserById(ids);

  React.useEffect(() => {
    const data = userInfo.map(d => d.toJSON());
    if (data.length) {
      setTestCommentList(
        testRunData.comments.map(d => ({
          ...d,
          user: data.find(f => f.objectId === d.createUserId),
        })),
      );
    }
  }, [userInfo, testRunData.comments]);

  const Editor = useMemo(() => {
    return (
      <EditorField
        editMode
        name="comment-editor"
        value={commentValue}
        placeholder={placeholder}
        hiddenLabel
        onChange={changeHandle}
        watchChange
      />
    );
  }, [commentValue, placeholder]);

  React.useEffect(() => {
    if (testRunData.comments) {
      setIds(
        testRunData.comments?.reduce((prev, cur) => {
          !prev.includes(cur.createUserId) && prev.push(cur.createUserId);
          return prev;
        }, []) ?? [],
      );
    }
  }, [testRunData.comments]);

  React.useEffect(() => {
    mutate();
  }, [ids, mutate]);

  React.useEffect(() => {
    const text = getText(commentValue).trim();
    setDisable(!text);
  }, [commentValue]);

  const submitTestComment = async () => {
    const getComments = () => {
      return {
        id: uuid(),
        value: commentValue,
        createTime: dayjs().format('YYYY-MM-DD HH:mm'),
        createUserId: currentUser.id,
      };
    };

    await updateTestRun(testRunEntity, {
      comments: [getComments()].concat(testRunData?.comments ?? []),
    });

    setCommentValue(defaultValue);
    setShowEditor(false);
    onDataChange();
  };

  const readpnlyEditor = useMemo(() => {
    console.log(111);

    return (
      <>
        {testCommentList.length &&
          testCommentList.map(comment => (
            <div className={cx('comment-list')} key={comment.id}>
              <div className={cx('comment-list-header')}>
                {comment.createUserId}
                {/* <UserField user={comment.createUserId} /> */}
                <div>{comment.createTime}</div>
              </div>
              <EditorField
                name={comment.id}
                value={comment.value}
                readonly
                hiddenLabel
                hideEditBtn
              />
            </div>
          ))}
      </>
    );
  }, [testCommentList]);

  return (
    <>
      <div className={cx('commont-box')}>
        {readpnlyEditor}
        {!showEditor ? (
          <Input placeholder="编写评论" onFocus={() => setShowEditor(true)} />
        ) : (
          <>
            {Editor}
            <Space style={{ marginTop: '12px' }}>
              <Button disabled={disable} onClick={submitTestComment}>
                保存
              </Button>
              <Button
                onClick={() => {
                  setCommentValue(defaultValue);
                  setShowEditor(false);
                }}
              >
                取消
              </Button>
            </Space>
          </>
        )}
      </div>
    </>
  );
};

export default TestComment;
