import React, { useMemo } from 'react';
// import { EditorField } from '@giteeteam/apps-team-components';
import { useCurrentUser, useGetUserById } from '@/lib/api/user';
import { Button, Input } from 'antd';
import { updateTestRun } from '@/lib/api/runs';
import { v4 as uuid } from 'uuid';
import dayjs from 'dayjs';
import { Space } from 'antd';

import cx from './TestComment.less';
import useI18n from '@/lib/hooks/useI18n';

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
    if (cur.type === 'img') {
      prev = prev.concat(cur.url ?? '');
    }

    prev = prev.concat(cur.text ?? '');

    if (cur.children) {
      prev = prev.concat(getText(cur.children));
    }

    return prev;
  }, '');

const TestComment: React.FC<any> = (props: any) => {
  const { t } = useI18n();
  const { testRunEntity, testRunData, onDataChange, modelScrollRef } = props;

  // 当前编辑器中显示的文本
  const { data: currentUser } = useCurrentUser();
  const [commentValue, setCommentValue] = React.useState(defaultValue);
  const [testCommentList, setTestCommentList] = React.useState([]);
  const [ids, setIds] = React.useState([]);
  const [showEditor, setShowEditor] = React.useState(false);
  const [disable, setDisable] = React.useState(true);
  // const [placeholder] = React.useState('在此输入评论内容');
  // const changeHandle = value => setCommentValue(value);

  const { data: userInfo, mutate } = useGetUserById(ids);

  React.useEffect(() => {
    if (showEditor) {
      modelScrollRef.current.parentElement.scrollTop =
        modelScrollRef.current.parentElement.scrollHeight;
    }
  }, [modelScrollRef, showEditor]);

  React.useEffect(() => {
    const data = userInfo?.map(d => d.toJSON()) ?? [];
    if (data.length) {
      setTestCommentList(
        (testRunData.comments ?? []).map(d => ({
          ...d,
          user: data.find(f => f.objectId === d.createUserId),
        })),
      );
    }
  }, [userInfo, testRunData.comments]);

  // const Editor = useMemo(() => {
  //   return (
  //     <EditorField
  //       editMode
  //       name="comment-editor"
  //       value={commentValue}
  //       placeholder={placeholder}
  //       hiddenLabel
  //       onChange={changeHandle}
  //       watchChange
  //     />
  //   );
  // }, [commentValue, placeholder]);

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
    const UserField = ({ user }) => {
      return (
        <div className={cx('user-box')}>
          <div className={cx('user-code')}>
            {user.username.trim().split('')[0].toLocaleUpperCase()}
          </div>
          <div className={cx('user-name', user.enabled ? '' : 'enabled')}>{user.nickname}</div>
        </div>
      );
    };

    const deleteComment = async data => {
      await updateTestRun(testRunEntity, {
        comments: testRunData.comments?.filter(d => d.id !== data.id),
      });
      onDataChange();
    };

    return (
      <>
        {testCommentList.length ? (
          testCommentList.map(comment => (
            <div className={cx('comment-list')} key={comment.id}>
              <div className={cx('comment-list-header')}>
                <UserField user={comment.user} />
                <div>
                  {comment.createTime}
                  <Button
                    className={cx('delete-btn')}
                    size="small"
                    type="link"
                    onClick={() => deleteComment(comment)}
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
              <div className={cx('comment-editor')}>
                {/* <EditorField
                  name={comment.id}
                  value={comment.value}
                  readonly
                  hiddenLabel
                  hideEditBtn
                /> */}
              </div>
            </div>
          ))
        ) : (
          <p style={{ color: '#b0b5bc' }}>
            {t('components.business.testRunModal.testComment.noData')}
          </p>
        )}
      </>
    );
  }, [onDataChange, testCommentList, testRunData.comments, testRunEntity, t]);

  return (
    <>
      <div className={cx('commont-box')}>
        {readpnlyEditor}
        {!showEditor ? (
          <Input
            placeholder={t('components.business.testRunModal.testComment.editorComment')}
            onFocus={() => setShowEditor(true)}
          />
        ) : (
          <>
            {/* {Editor} */}
            <Space style={{ marginTop: '12px' }}>
              <Button disabled={disable} onClick={submitTestComment}>
                {t('common.save')}
              </Button>
              <Button
                onClick={() => {
                  setCommentValue(defaultValue);
                  setShowEditor(false);
                }}
              >
                {t('common.delete')}
              </Button>
            </Space>
          </>
        )}
      </div>
    </>
  );
};

export default TestComment;
