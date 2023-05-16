import EventBus from './utils/eventBus';

const withKeyEventBus = <Data = any>(key: string) => {
  const event = {
    _instance: new EventBus(),
    dispatch: (data?: Data) => event._instance.dispatch(key, data),
    register: (cb: (data?: Data) => void) => event._instance.register(key, cb),
  };

  return event;
};

/** 目录树变更通知 */
export const repositoryFolderTreeEvent = withKeyEventBus('repositoryFolderTreeEvent');
