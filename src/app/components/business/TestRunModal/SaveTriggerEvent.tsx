import { useEventEmitter } from 'ahooks';
import { EventEmitter } from 'ahooks/lib/useEventEmitter';
import React from 'react';

const SaveTriggerContext = React.createContext({} as EventEmitter<void>);

export const SaveTriggerProvider = ({ children }) => {
  const eventEmitter = useEventEmitter();
  return <SaveTriggerContext.Provider value={eventEmitter}>{children}</SaveTriggerContext.Provider>;
};

export const useSaveTriggerEvent = () => {
  return React.useContext(SaveTriggerContext);
};
