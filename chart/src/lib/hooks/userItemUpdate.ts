import Parse from 'proxima-sdk/lib/Parse';
import { useEffect } from 'react';

export const enum ConnectionType {
  CONNECTING = 'connecting', // 正在连接
  OPEN = 'open', // 已连接后触发
  CREATE = 'create', // items创建后触发
  UPDATE = 'update', // items更新时触发
  DELETE = 'delete', // items删除时触发
  CLOSE = 'close', // 连接关闭时
}

const query = new Parse.Query('Item');
let subscription = null;

let status = ConnectionType.CONNECTING;
let loading = false;

let timer = null;
const TIME_OUT_TIME = 3000;

let mutates = [];

const update = () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    mutates.forEach(mutate => mutate());
  }, TIME_OUT_TIME);
};

export async function useItemUpdate(
  sessionToken: string,
  mutate: () => void,
): Promise<{ status: ConnectionType }> {
  useEffect(() => {
    if (!mutates.includes(fn => fn === mutate)) {
      mutates.push(mutate);
    }

    return () => {
      const index = mutates.findIndex(fn => fn === mutate);
      if (index > -1) {
        mutates.splice(index, 1);
      }

      if (!mutates.length) {
        subscription && subscription.unsubscribe();
      }
    };
  }, [mutate]);

  if (loading) {
    return Promise.resolve({ status });
  }

  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async resolve => {
    loading = true;

    if (!subscription) {
      subscription = await query.subscribe(sessionToken);
      subscription.on(ConnectionType.OPEN, () => {
        loading = false;
        status = ConnectionType.OPEN;
        resolve({
          status,
        });
      });
      subscription.on(ConnectionType.CREATE, update);
      subscription.on(ConnectionType.UPDATE, update);
      subscription.on(ConnectionType.DELETE, update);
      subscription.on(ConnectionType.CLOSE, () => {
        subscription = null;
        loading = false;
        status = ConnectionType.CLOSE;
        mutates = [];
      });
    }
  });
}
