import dayjs from 'dayjs';

// Reduce obj arr
export const reduceObjArr = ({ arr, keys }: { arr: any[]; keys: string[] }): string => {
  return arr.reduce((accumulatorStr, nextObj) => {
    const nextValue = keys.length > 1 ? `${nextObj[keys[0]]}(${nextObj[keys[1]]})` : nextObj[keys[0]];
    if (!accumulatorStr) return nextValue;
    return accumulatorStr + ',' + nextValue;
  }, undefined);
};
// 时间戳判断标注
export const IS_TIMESTAMP = new Date('1980').getTime();

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const tranferItem = ({ item }) => {
  // 字符串类型
  if (typeof item === 'string') {
    return item;
  } else if (typeof item === 'number') {
    if (item > IS_TIMESTAMP) {
      return dayjs(item).format('YYYY-MM-DD HH:mm:ss');
    }
    return item;
  } else if (Array.isArray(item)) {
    // 数组
    if (typeof item[0] === 'string') {
      return item.join(',');
    } else if (item[0]?.nickname && item[0]?.username) {
      return reduceObjArr({ arr: item, keys: ['nickname', 'username'] });
    } else if (item[0]?.value) {
      return reduceObjArr({ arr: item, keys: ['value'] });
    } else if (item[0]?.label) {
      return reduceObjArr({ arr: item, keys: ['label'] });
    } else if (item[0]?.lable) {
      return reduceObjArr({ arr: item, keys: ['lable'] }); // 兼容部分lable key
    } else if (item[0]?.name) {
      return reduceObjArr({ arr: item, keys: ['name'] });
    }
    return '--';
  } else if (typeof item === 'object' && item !== null) {
    // 对象
    if (item.nickname && item.username) {
      return `${item.nickname}(${item.username})`;
    } else if (item.name) {
      return item.name;
    } else if (item.username) {
      return item.username;
    } else if (item.roles || item.users) {
      // 当前处理人 / ItemHandleler
      const strArr = [];
      Object.values(item).forEach((arr: any[]) => {
        arr.forEach(user => {
          if (user?.nickname) {
            strArr.push(`${user.nickname}(${user.username})`);
          } else if (user?.label) {
            strArr.push(user.label);
          }
        });
      });
      return strArr.join(',');
    } else if (item.label) {
      return item.label;
    } else if (item.lable) {
      return item.lable; // 兼容部分lable key
    }
    return '--';
  }

  return '--';
};
