import { getParseQuery, requestCoreApi } from '@giteeteam/apps-team-api';

import { TestType } from '../../../common/constant';
const log = (msg, ...restArgs) => {
  console.info(`[test-manager-runAfterImport] ${msg}`, ...restArgs);
};

const getSnapShotName = (names, snapShotName) => {
  let newName = snapShotName;
  while (names.includes(newName)) {
    newName += '_1';
  }
  return newName;
};

const handleSnapShot = async () => {
  try {
    const itemIds = global.triggerParams?.data || [];
    const createItems = global.triggerParams?.createItems || [];
    const updateItems = global.triggerParams?.updateItems || [];
    const snapShotConfig = global.triggerParams?.extraParams?.snapShotConfig;

    const snapShotEnabled = snapShotConfig?.enabled;
    const snapShotName = snapShotConfig?.name;

    log(
      'snapShotConfig',
      JSON.stringify({
        snapShotConfig,
        createItems,
        snapShotEnabled,
        snapShotName,
        updateItems,
      }),
    );

    if (!snapShotEnabled) {
      log('没有启用导入后打版本');
      return;
    }

    if (!itemIds?.length) {
      log('itemIds is null');
      return;
    }

    const createItemKeys =
      createItems
        ?.filter?.(item => item?.values?.r_test_manager_type === TestType.Case)
        ?.map(item => item.key) || [];
    const updateItemKeys =
      updateItems
        ?.filter?.(item => item?.values?.r_test_manager_type === TestType.Case)
        ?.map(item => item.key) || [];
    log('item keys', JSON.stringify(createItemKeys), JSON.stringify(updateItemKeys));

    let updateItemVersionMap = {};

    // 修改的事项需要确定是否存在当前版本名称的历史版本事项
    if (updateItemKeys?.length) {
      const iql = `key in ${JSON.stringify(
        updateItemKeys,
      )} and 'baseLineSources' in ['BaseLineItemVersion']`;

      log('查询历史版本iql', iql);

      const versionItemResult: any = await requestCoreApi('POST', '/parse/api/search', {
        iql,
        fields: ['id', 'key', 'baseLineItemVersion'],
        includeHiddenItem: true,
        size: 99999,
      });

      updateItemVersionMap = versionItemResult?.payload?.items.reduce((result, item) => {
        const key = item.key;
        if (!result[key]) {
          result[key] = {
            names: [],
            items: [],
          };
        }
        result[key].names.push(item.values?.baseLineItemVersion?.name);
        result[key].items.push(item);
        return result;
      }, {});
      log('updateItemVersionMap', JSON.stringify(updateItemVersionMap));
    }

    const finalVersionMap = {
      [snapShotName]: createItemKeys,
    };

    updateItemKeys.forEach(key => {
      const names = updateItemVersionMap[key]?.names || [];
      // 不存在版本时，按照新增一样处理
      if (!names?.length) {
        finalVersionMap[snapShotName].push(key);
      } else {
        const newName = getSnapShotName(names, snapShotName);
        if (!finalVersionMap[newName]) {
          finalVersionMap[newName] = [];
        }
        finalVersionMap[newName].push(key);
      }
    });

    log('finalVersionMap', JSON.stringify(finalVersionMap));

    await Promise.all(
      Object.keys(finalVersionMap).map(name => {
        const keys = finalVersionMap[name];
        log('baseLineItem', JSON.stringify({ keys, name }));
        return requestCoreApi('POST', '/parse/api/baseLineItems', {
          add: { keys },
          baseLineItemVersion: { name },
        });
      }),
    );

    log('baseLine success');
  } catch (err) {
    console.error(err);
    log('用例打版本失败', err);
  }
};

const runAfterImport = async () => {
  const mapIds = global.triggerParams?.data || [];
  console.info('linkMapId_pre', mapIds, {
    iql: `id in ${JSON.stringify(mapIds)}`,
    isShowDetails: true,
    displayContext: 'test_manager',
  });

  const ItemQuery = await getParseQuery(false, 'Item');
  const itemList = await ItemQuery.containedIn('objectId', mapIds)
    .select(['objectId', 'values'])
    .find({
      useMasterKey: true,
    });
  const itemJson = itemList.map(item => item.toJSON());
  console.log('itemJson', itemJson);
  const linkMapId = {};
  itemJson.forEach(item => {
    const { values } = item;
    const { r_test_manager_runMapCaseKey: mapKey, r_test_manager_type: mapType } = values;
    if (mapKey) {
      if (!linkMapId[mapKey]) {
        linkMapId[mapKey] = {};
      }
      linkMapId[mapKey][mapType] = item.objectId;
    }
  });
  console.info('linkMapId', linkMapId);
  if (Object.keys(linkMapId).length > 0) {
    const updateItems = Object.keys(linkMapId).map(mapKey => {
      return {
        objectId: linkMapId[mapKey].TestRun,
        values: {
          r_test_manager_referenceCase: linkMapId[mapKey].TestCase,
          r_test_manager_testCases: [linkMapId[mapKey].TestCase],
        },
      };
    });
    await requestCoreApi('PUT', '/parse/api/v2/items/bulk', {
      data: updateItems,
    }).then(data => {
      console.info('updateItems_after', data);
    });
  }

  await handleSnapShot();

  //   setTimeout(async () => {
  //     await requestCoreApi('POST', '/parse/api/search', {
  //       iql: `id in ${JSON.stringify(mapIds)}`,
  //       isShowDetails: true,
  //       displayContext: 'test_manager',
  //     }).then(async (data: any) => {
  //       console.log('fuck_man', data);
  //       const items = data?.payload.items ?? [];
  //       const linkMapId = {};
  //       items.forEach(item => {
  //         const { values } = item;
  //         const { r_test_manager_runMapCaseKey: mapKey, r_test_manager_type: mapType } = values;
  //         if (mapKey) {
  //           if (!linkMapId[mapKey]) {
  //             linkMapId[mapKey] = {};
  //           }
  //           linkMapId[mapKey][mapType] = item.id;
  //         }
  //       });
  //       console.info('linkMapId', linkMapId);
  //       if (Object.keys(linkMapId).length > 0) {
  //         const updateItems = Object.keys(linkMapId).map(mapKey => {
  //           return {
  //             objectId: linkMapId[mapKey].TestRun,
  //             values: {
  //               r_test_manager_referenceCase: linkMapId[mapKey].TestCase,
  //             },
  //           };
  //         });
  //         await requestCoreApi('PUT', '/parse/api/v2/items/bulk', {
  //           data: updateItems,
  //         }).then(data => {
  //           console.info('updateItems_after', data);
  //         });
  //       }
  //     });
  //   }, 5000);
};
export { runAfterImport };
