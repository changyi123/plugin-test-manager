import { EventEmitter } from 'ahooks/lib/useEventEmitter';

/** step 组件 prop */
export type StepComponentProp = {
  sharedState: SharedState;
  saveButtonEmitter: EventEmitter<any>;
  onSharedStateChange: (sharedState: Partial<SharedState>) => void;
};

/** 跨组件的状态 */
export type SharedState = {
  workspaceKey: string;
  /** repository id */
  repositoryId: string;
  /** redirect 链接  */
  redirectLink: string;
  /** 脑图数据 */
  minderData: any;
  /** 是否可进入下一阶段，检验操作则返回 false */
  canGoNext: boolean;
  /** repository tree */
  repositoryTree: any;
  /** 优先级配置项 */
  priorityOptions: any[];
  /** 脑图节点提交数据 */
  submitMinderData: any;
};
