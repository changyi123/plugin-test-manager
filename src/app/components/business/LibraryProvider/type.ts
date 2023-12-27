import { WorkflowStatusType } from 'apps-team-components-v1/dist/lib/global';

export type ElementType = 'Node' | 'Edge';
export type NodeType = 'Start' | 'Task';
export type DateType = 'dateTime' | 'date' | 'week' | 'month' | 'year';
export type ObjectId = string;

export interface BaseNodeProps {
  id: string;
  name: string;
  elementType: ElementType; // Node/Edge 表明是Node还是动作
}

// 选项列表数据
export interface ListItemType {
  key?: string;
  value?: string;
  label?: string;
  children?: string;
}

// 条件数据结果
export interface ConditionType {
  pickerType: DateType;
  comparedValue: string | number | ListItemType | ListItemType[];
  numberCompare: string;
  stringCompare: string;
  dropDownCompare: string;
  field: {
    key: string;
    value: string;
    children: string;
    componentType: string;
    data?: {
      customData?: Record<string, any>[];
    };
  };
}

export interface TransitionProperty {
  key: string;
  value: string;
  id?: string;
}

export interface PermissionType {
  roles?: ListItemType[];
  users?: ListItemType[];
  groups?: ListItemType[];
  workspaceRoles?: ListItemType[];
  customFields?: ListItemType[];
  creatorAuth?: boolean; // 判断事项创建人可流转
}

export type SelectItem = {
  label: string;
  value: string;
  type?: string;
  pid?: string;
};

// 状态的审批配置
export interface CheckInConfig {
  active: boolean; // 启用签到
  transition: SelectItem;
  // 签到对象，这里用对象方便之后扩展其他类型
  source: {
    fields: Array<ObjectId>;
  };
  requireComment: boolean; // 提交时是否需要填写意见
}

export type TransitionCondition = {
  screen?: { label: string; value: string };
  fieldType?: ConditionType[];
  permissionType?: PermissionType;
  scriptValidator?: string;
};

// 状态的审批配置
export interface ApprovalConfig {
  active?: boolean; // 启用审批
  condition?: {
    value: number;
    // percent:所有用户; number: 特定数量用户; numberPerPrincipal: '组内的特定用户'
    type: 'percent' | 'number' | 'numberPerPrincipal';
  };
  transition?: {
    approved: SelectItem[]; // 通过时的目标状态
    rejected: SelectItem[]; // 驳回时的目标状态
    unrestricted: SelectItem[]; // 无限制时的目标状态
  };
  source?: {
    type: 'groups' | 'fields' | 'users' | 'workspaceRoles'; // userGroup:用户组; workspaceRole:用户组; field:字段；user:用户
    fields: Array<ObjectId>; // 字段的objectId
    groups: Array<ObjectId>; // 用户组objectId数组
    users: Array<ObjectId>; // 用户objectId数组
    workspaceRoles: Array<ObjectId>; // 空间角色objectId数组
  };
  requireComment?: boolean; // 提交时是否需要填写审批意见
  allowAppendApprover?: boolean; // 是否允许加签
  allowDelegateApprover?: boolean; // 是否允许委派审批
  autoTransition?: boolean; // 是否允许自动流转
  autoNotice?: boolean; // 是否允许自动发送通知
  isConfigApproval?: boolean; // 是否配置审批同意按钮文案
  approvalButtonText?: string; // 同意按钮文案内容
  hideApprovalButton?: boolean; // 隐藏同意按钮
  isConfigReject?: boolean; // 是否配置审批拒绝按钮文案
  rejectButtonText?: string; // 拒绝按钮文案内容
  hideRejectButton?: boolean; // 隐藏拒绝按钮
}

export interface NodeProps extends BaseNodeProps {
  left?: number;
  top?: number;
  type: NodeType; // 节点类型，开始/任务
  key: WorkflowStatusType; // 状态类型，和颜色相关
  anyData?: TransitionCondition & { properties?: TransitionProperty[] };
  anyTag: boolean;
  approval?: ApprovalConfig;
  checkIn?: CheckInConfig;
}

export interface TransitionProps extends BaseNodeProps {
  source: NodeProps & { anchor: string };
  target: NodeProps & { anchor: string };
  geometry?: any;
  parameters?: TransitionCondition;
  properties?: TransitionProperty[];
  anyTag: boolean; // 标明这个流转动作不是从任意状态生产的
}

export interface ResultType {
  result: boolean;
  message?: string;
}
