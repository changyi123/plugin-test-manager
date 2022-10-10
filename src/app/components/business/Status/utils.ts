import { sortBy } from 'lodash';
// 状态类型序列
const STATUS_TYPE_SEQ = ['TODO', 'PASSED', 'BLOCK', 'FAILED', 'EXECUTING', 'CANCEL'];

// 顺序返回状态列表
export const sequence = statuses => {
  return sortBy(statuses, status => STATUS_TYPE_SEQ.indexOf(status.type), 'desc');
};

// 步骤状态流转
export const stepStatusFSM = () => {};
