import { requestCoreApi, getParseQuery } from '@giteeteam/apps-team-api';
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
