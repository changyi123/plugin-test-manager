/** step 组件 prop */
export type StepComponentProp = {
  sharedState: SharedState;
  onSharedStateChange: (sharedState: Partial<SharedState>) => void;
};

/** 跨组件的状态 */
export type SharedState = {
  /** 导入节点的层级  */
  currentRepositoryNodePaths: string[];
  /** redirect 链接  */
  redirectLink: string;
  /** 脑图数据 */
  minderData: any;
  /** 是否可进入下一阶段，检验操作则返回 false */
  canGoNext: boolean;
  /** repository tree */
  repositoryTree: any;
};
