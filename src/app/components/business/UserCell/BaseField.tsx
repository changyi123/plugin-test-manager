import './index.less';

import { DownOutlined } from '@ant-design/icons';
import { Col, Tooltip } from 'antd';
import { FIELD_TYPE_KEY_MAPPINGS } from 'apps-team-components-v1/dist/lib/global';
import classnames from 'classnames';
import { cloneDeep, concat, isArray, isEqual, noop, uniqWith } from 'lodash';
import { components } from 'proxima-sdk';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Overlay } from 'react-overlays';

import useI18n from '@/lib/hooks/useI18n';
import { useCurrentUser } from '@/lib/hooks/useTest';
import Parse from '@/lib/parse';
import { User as UserProps } from '@/lib/types/App';
import { i18n } from '@/lib/utils/i18n';
import { User as UserModel, Workspace } from '@/services/models';

import cx from './index.less';
const SearchPopoverSelect = components.Components.Common.SearchPopoverSelect;

interface RegularProps {
  message?: string;
  expression?: string;
}

// 字段触发类型
export const ONCHANGE_TYPE = {
  CURRENT_USER: 'currentUser',
};

export interface FieldProps {
  editMode?: boolean;
  name?: string;
  page?: string; // 从哪里使用的字段
  labelAlign?: 'left' | 'right' | 'top'; // 标签对齐方式
  labelWidth?: number; // 标签宽度
  hiddenLabel?: boolean;
  readonly?: boolean;
  apply?: string;
  validation?: RegularProps;
  userData?: Record<string, any>;
}

export type UserType = {
  username: string;
  label: string;
  value: string;
};

/** 用户被删除 */
export const isUserDeleted = (user: UserProps): boolean => user?.deleted === true;
/** 用户被禁用 */
export const isUserDisabled = (user: UserProps): boolean => user?.enabled === false;

export const generateUserDisplayName = (user: UserProps, onlyNickname = false): string => {
  const getDisplaySuffix = () => {
    if (isUserDeleted(user)) {
      return `(${i18n.t('common.haveDelete')})`;
    } else if (isUserDisabled(user)) {
      return `(${i18n.t('common.forbiddenActive')})`;
    } else if (!onlyNickname && user?.nickname) {
      return `(${user?.username})`;
    }
    return '';
  };

  const displaySuffix = getDisplaySuffix();
  if (onlyNickname) return `${user?.nickname || user?.username}${displaySuffix}`;
  return user?.nickname ? `${user?.nickname}${displaySuffix}` : user?.username;
};

/**
 * 获取字段width样式
 */
export const getFieldWidthStyle = (
  labelWidth: number,
  labelAlign: string,
  hiddenLabel: boolean,
  apply: string,
): any => {
  // 字段不是应用在表格
  // 字段algin模式不是上对齐
  if (hiddenLabel) {
    // 字段隐藏后，也需100%展示
    labelWidth = 0;
  }
  if (apply !== 'cell' && labelAlign !== 'top') {
    return { width: `calc(100% - ${labelWidth}px)` };
  }
  return {};
};

export const getPopupContainerFun = (
  getPopupContainer: (node?: HTMLElement) => HTMLElement,
  apply: string,
  page?: string,
): HTMLElement => {
  if (getPopupContainer) {
    return getPopupContainer();
  }
  // 弹窗 绑定在弹窗body上  抽屉绑在content-container上  详情单页绑在site-layout上
  const ele = document.getElementById(page + '-page-id');
  if (apply === 'cell' || !ele) {
    return document.body;
  }
  return ele;
};

// select 列表中需要移除被删除或被禁用的用户选项
const notDisplayUser = user => {
  return isUserDeleted(user) || isUserDisabled(user);
};

// option 结构适配
const userOptionAdapter = user => {
  return {
    label: generateUserDisplayName(user),
    value: user?.objectId,
    // 迭代任务板用负责人筛选时，需要传username
    key: user?.username,
  };
};

export const getUserOptionsByValues = async (
  values: string[],
  optionAdapter?: (user: UserProps) => any,
): Promise<Record<'label' | 'value', string>[]> => {
  const list = await new Parse.Query(Parse.User)
    .containedIn('objectId', values)
    .select('username', 'nickname', 'deleted', 'enabled')
    .findAll();
  const userList = list
    .map(item => {
      const user = item.toJSON() as UserProps;
      if (notDisplayUser(user)) return;
      return (optionAdapter ?? userOptionAdapter)(user);
    })
    .filter(Boolean);
  return userList;
};

// 格式化用户数据
const userDataFormat = user => ({
  label: generateUserDisplayName(user),
  value: user.objectId ?? user.value,

  username: user.username,
  nickname: user.nickname,
  deleted: user.deleted,
  enabled: user.enabled,
});

export type BaseUserProps = FieldProps & {
  workspaceId?: string;
  fieldTypeKey?: string;
  emptyChild?: React.ReactElement;
  displayDeletedUser?: boolean;
  userData?: any;
  placeholder?: string;
  value?: Array<any>;
  onChange?: (val: any, type?: string) => void;
  mode?: any;
  hasCurrentUser?: boolean; // 用于判断是否需要显示currentUser
  extraOptions?: UserType[]; // 外部传进来的额外用户选项，和系统用户作拼接
  showUserAvatar?: React.ReactElement; // 自定义显示的用户头像
  getPopupContainer?: (node?: HTMLElement) => HTMLElement;
};

export const useUserSelect = (
  userRoles: string[],
  values?: string[],
  shouldFetch = false,
  currentUser?: UserProps,
  hasCurrentUser?: boolean,
  extraOptions?: UserType[],
  fieldTypeKey?: string,
  workspaceId?: string,
): any => {
  const [roles, setRoles] = useState(null);
  const [users, setUsers] = useState([]);
  const [searchValue, setSearch] = useState('');
  const requestCacheRef = useRef({});
  const isFetchingRef = useRef(false);
  const { t } = useI18n();

  useEffect(() => {
    // 获取当前空间下的成员角色
    const getUserRoles = async workspaceId => {
      const query = new Parse.Query(Parse.Role)
        .equalTo('workspace', Workspace.createWithoutData(workspaceId))
        .startsWith('name', 'all_member_workspace')
        .select('objectId');
      const value = await query.find();
      const result = value.map(v => v.toJSON().objectId) || [];
      setRoles(result);
    };
    if (userRoles?.length) {
      setRoles(userRoles);
      return;
    }
    if (fieldTypeKey === FIELD_TYPE_KEY_MAPPINGS.Assignee && workspaceId && shouldFetch) {
      getUserRoles(workspaceId);
      return;
    }
    if (shouldFetch) setRoles([]);
  }, [fieldTypeKey, userRoles, workspaceId, shouldFetch]);

  // 请求数据缓存 key
  const requestCacheKey = useMemo(() => searchValue + roles?.toString(), [searchValue, roles]);

  // 全量缓存
  const totalCacheRef = useRef([]);
  const totalCache = useMemo(
    () => ({
      append(options) {
        totalCacheRef.current = uniqWith(
          totalCacheRef.current.concat(options),
          (a, b) => a.value === b.value,
        );
      },
      getById(ids: string[]) {
        return totalCacheRef.current.filter(opt => ids.includes(opt.value));
      },
    }),
    [],
  );

  // 存储用户 option 数据
  const storeUsers = useCallback(
    async _options => {
      // 禁用，删除状态用户不展示到选择列表中
      const options = _options
        .map(userDataFormat)
        .filter(user => !isUserDeleted(user) && !isUserDisabled(user));
      const notExistedKeys = values?.filter(
        val => val && options.every(item => item.value !== val),
      );
      totalCache.append(options);
      isFetchingRef.current = false;
      requestCacheRef.current[requestCacheKey] = options;
      if (notExistedKeys?.length) {
        const cachedOptions = totalCache.getById(notExistedKeys);
        if (cachedOptions.length) {
          setUsers(options.concat(cachedOptions));
          return;
        }
        getUserOptionsByValues(notExistedKeys, userDataFormat).then(appendOptions => {
          totalCache.append(appendOptions);
          setUsers(options.concat(appendOptions));
        });
      } else {
        setUsers(options);
      }
    },
    [values, requestCacheKey, totalCache],
  );

  // 搜索用户
  const fetchUser = useCallback(
    async searchValue => {
      if (isFetchingRef.current) return;
      // 存在请求数据缓存，直接使用缓存
      if (requestCacheRef.current[requestCacheKey]) {
        return storeUsers(requestCacheRef.current[requestCacheKey]);
      }
      isFetchingRef.current = true;

      // 用户list排序
      const sortList = (arr, searchValue) => {
        if (!searchValue?.trim()) {
          // 当不存在搜索数据的时候，当前用户默认显示在第一条
          const index = arr.findIndex(v => v.objectId === currentUser?.objectId);
          const userObj = {
            username: 'currentUser',
            nickname: t('pages.fields.user.default.currentUser'),
            objectId: 'currentUser',
          };
          if (index !== -1) {
            // 如果获取的user列表中存在当前登录用户，需要将他提取出来放在第一个
            const cloneArr = cloneDeep(arr);
            const value = cloneDeep(arr[index]);
            cloneArr.splice(index, 1);
            if (hasCurrentUser) {
              // 如果是需要显示currentUser的将currentUser放在第一位
              return [userObj, value, ...cloneArr];
            } else {
              return [value, ...cloneArr];
            }
          } else {
            if (hasCurrentUser) {
              if (currentUser) {
                return [userObj, currentUser, ...arr];
              } else {
                return [userObj, ...arr];
              }
            } else {
              if (currentUser) {
                return [currentUser, ...arr];
              } else {
                return arr;
              }
            }
          }
        } else {
          // 当有搜索数据的时候，显示搜索的user
          return arr;
        }
      };

      // 存在角色
      if (roles?.length) {
        // 新建,获取dropdown的FieldType
        const queryRole = new Parse.Query(Parse.Role);
        // 若存在用户角色
        queryRole.containedIn('objectId', roles);
        const proList = [];
        const resRole = await queryRole.find();
        resRole.map((res: any) => {
          const p = new Promise(resolve => {
            const relation = res.getUsers();
            resolve(
              Parse.Query.or(
                relation.query().contains('username', searchValue),
                relation.query().contains('nickname', searchValue),
              ).find(),
            );
          }).then((res: Array<any>) => {
            return res.map(item => item.toJSON());
          });
          proList.push(p);
        });
        Promise.all(proList).then((res: Array<any>) => {
          const userList = uniqWith(res.concat().flat(), isEqual);
          storeUsers(sortList(userList, searchValue));
        });
      } else {
        const finds = await Parse.Query.or(
          new Parse.Query(UserModel).contains('username', searchValue),
          new Parse.Query(UserModel).contains('nickname', searchValue),
        ).find();
        const _users = finds.map(item => item.toJSON());
        storeUsers(sortList(_users, searchValue));
      }
    },
    [requestCacheKey, roles, storeUsers, t, currentUser, hasCurrentUser],
  );

  const usersList = useMemo(() => concat(extraOptions || [], users), [extraOptions, users]);

  useEffect(() => {
    // 不是编辑状态下，不要请求user数据
    if (shouldFetch && roles) {
      fetchUser(searchValue);
    }
  }, [shouldFetch, searchValue, fetchUser, roles]);

  return { users: usersList, setSearch, fetchUser };
};

// 判断user前后两值是否一致
const isEqualUsers = (prevUsers, currentUsers) => {
  const isPrevArr = isArray(prevUsers);
  const isCurrentArr = isArray(currentUsers);
  if (isPrevArr !== isCurrentArr) return false;
  const getValue = obj => obj?.value ?? obj?.objectId;
  if (!isPrevArr) return getValue(prevUsers) === getValue(currentUsers);
  const toString = arr => JSON.stringify(arr?.map(item => getValue(item)).filter(Boolean) || []);
  return isEqual(toString(prevUsers), toString(currentUsers));
};

const User: React.FC<BaseUserProps> = props => {
  const {
    fieldTypeKey,
    workspaceId,
    showUserAvatar,
    emptyChild,
    userData,
    placeholder,
    editMode,
    readonly,
    value: propsValue,
    labelWidth,
    apply,
    onChange: handleChanges,
    labelAlign,
    hiddenLabel,
    hasCurrentUser,
    extraOptions = [],
    getPopupContainer,
    page,
    displayDeletedUser,
    ...defaultProps
  } = props;
  const { t } = useI18n();
  const [editing, setEditting] = useState(false);
  const containerRef = useRef(null);
  const targetRef = useRef(null);
  const [value, setValue] = useState(propsValue || []);
  const userSelectValue = useMemo(() => value.map(val => val.value), [value]);
  // 当前用户
  const { data: currentUserObj } = useCurrentUser();

  const { users, setSearch } = useUserSelect(
    userData?.userRoles,
    userSelectValue,
    editing || editMode,
    currentUserObj as UserProps,
    hasCurrentUser,
    extraOptions,
    fieldTypeKey,
    workspaceId,
  );

  // 因会无故调用onChange, 所以在只读条件下直接return
  const onChange = useCallback(
    (value, type?) => {
      if (readonly) return;
      handleChanges(value, type);
    },
    [handleChanges, readonly],
  );

  // TODO: 梳理逻辑，只读情况下不应触发onChange
  // 目前发现只读情况下还是会走以下逻辑
  useEffect(() => {
    if (isArray(propsValue)) {
      // 获取最新的用户数据（获取用户删除禁用标识）
      const value = propsValue
        .map(user => {
          // 不过滤拼接的 currentUser 数据
          if ([user.value, user.username].includes('currentUser')) return user;
        })
        .filter(Boolean);
      if (hasCurrentUser) {
        // 当需要显示currentUser时直接显示
        setValue(value.map(userDataFormat));
      } else {
        // 否则，将currentUser，显示为当前登录用户
        const index = propsValue?.findIndex(v => {
          return [v.value, v.objectId].includes('currentUser');
        });
        if (index !== -1 && currentUserObj) {
          value[index] = currentUserObj;
        }
        // 防止当前登录用户与已选择的用户重复，进行去重处理
        const arr = uniqWith(value.map(userDataFormat), (a, b) => a.value === b.value);
        if (!isEqualUsers(arr, propsValue) && index !== -1 && !!page) {
          // 添加'currentUser'参数，区分value为当前用户和其他值，避免当前用户初始表单值时引起表单校验，解决表单校验时报错抖动问题。
          onChange?.(arr, ONCHANGE_TYPE.CURRENT_USER);
        }
        setValue(arr);
      }
    } else {
      setValue([]);
    }
  }, [propsValue, currentUserObj, hasCurrentUser, onChange, displayDeletedUser]);

  // 搜索用户,因为组件内部searhValue做了debouce，这里不需要debouce了
  const fetchUser = searchValue => {
    setSearch(searchValue?.trim());
  };

  // 初始化数据
  useEffect(() => {
    // 不是编辑状态下，不要请求user数据
    if (editing || editMode) {
      fetchUser('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.userRoles, editing, editMode]);

  const handleChange = useCallback(
    val => {
      val = Array.isArray(val) ? val.map(item => ({ ...item })) : [];
      setValue(val);
      if (!isEqual(val, value)) {
        onChange?.(val);
      }
      // visible隐藏后 编辑状态也隐藏
      if (!editMode) {
        setEditting(false);
      }
    },
    [onChange, editMode, value],
  );

  const handleClick = useCallback(
    e => {
      e.stopPropagation();
      setEditting(true);
      setTimeout(() => {
        // 只读，编辑模式不需要触发click事件
        !readonly && !editMode && targetRef?.current?.focus();
      });
    },
    [targetRef, readonly, editMode],
  );

  const handleSearchChange = searchValue => {
    setSearch(searchValue?.trim());
  };

  const [displayValue, tooltipDisplayValue] = useMemo(() => {
    if (value?.length === 0) return '';
    let displayValues = [];
    let tooltipDisplayValue = '';
    Array.isArray(value) &&
      value.forEach((item, i) => {
        displayValues = displayValues.concat(
          <span key={i}>
            {i ? ',' : ''}
            <span
              className={cx(isUserDeleted(item) && 'deleted', isUserDisabled(item) && 'disabled')}
            >
              {generateUserDisplayName(item, true)}
            </span>
          </span>,
        );
        tooltipDisplayValue += `${i ? ',' : ''}${generateUserDisplayName(item)}`;
      });
    return [displayValues, tooltipDisplayValue];
  }, [value]);

  const style = useMemo(() => {
    return getFieldWidthStyle(labelWidth, labelAlign, hiddenLabel, apply);
  }, [labelWidth, labelAlign, hiddenLabel, apply]);

  useEffect(() => {
    if (defaultProps.mode !== 'multiple') {
      // 如果是单选模式，在值改变之后直接关闭编辑态
      setEditting(false);
    }
  }, [displayValue, defaultProps.mode]);

  return (
    <Col
      style={style}
      ref={containerRef}
      className={cx('field-value', 'user') + ' field-value'}
      data-hidehover={readonly || editMode || editing || apply === 'cell'}
      onClick={handleClick}
    >
      {(readonly || (!editMode && !editing)) &&
        (displayValue ? (
          <>
            {!!showUserAvatar && showUserAvatar}
            {!showUserAvatar && (
              <Tooltip title={tooltipDisplayValue}>
                <span className={classnames('tooltip-overflow', 'tooltip-maxline-1')}>
                  {displayValue}
                </span>
              </Tooltip>
            )}
          </>
        ) : emptyChild ? (
          emptyChild
        ) : (
          <span style={{ color: 'var(--theme-disabled-color)' }}>
            {readonly ? '-' : t('pages.fields.number.none')}
          </span>
        ))}
      {!readonly && (editMode || editing) && containerRef && (
        <Overlay
          show
          rootClose={true}
          container={containerRef} // apendChild的dom
          target={containerRef} // 失去焦点覆盖的dom
          onHide={noop}
        >
          {() => (
            <div className="field-value-overlay">
              <SearchPopoverSelect
                {...defaultProps}
                // 编辑模式下不需要默认弹出popvoer
                defaultVisible={!editMode}
                value={value}
                list={users}
                onChange={handleChange}
                onSearchChange={handleSearchChange}
                placeholder={placeholder}
                getPopupContainer={() => getPopupContainerFun(getPopupContainer, apply, page)}
              />
            </div>
          )}
        </Overlay>
      )}
      <DownOutlined className={cx('hover-icon')} />
    </Col>
  );
};

User.defaultProps = {
  readonly: false,
  editMode: false,
  labelWidth: 120,
};

export default User;
