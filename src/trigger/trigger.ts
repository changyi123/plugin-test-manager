export { runInitialScript } from './modules/trigger/initialScript';
export { deleteTestLink } from './modules/trigger/deleteTestLink';
export { handleBeforeCreate } from './modules/trigger/handleBeforeCreate';
export { handleAfterCreate, handleAsyncAfterCreate } from './modules/trigger/handleAfterCreate';
export { handleBeforeUpdate } from './modules/trigger/handleBeforeUpdate';
export { createdItemLinkType } from './modules/trigger/createdItemLinkType';
export { workspaceCreated, workspaceBind } from './modules/trigger/workspaceTrigger';
export { installAuditLog } from './modules/trigger/installAuditLog';
export { itemAfterSave, itemAfterSaveForApproval } from './modules/trigger/itemAfterSave';

// 自动化模块导出 - 用于手动测试
export { triggerPipeQueueConsumption } from './modules/automation/pipeQueueProcessor';
