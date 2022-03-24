// const triggerParams = {
//     data: [
//         // {
//         //     id: 'qATTCWHO4A',
//         //     name: '测试032201',
//         //     workspace: 'LPT1',
//         //     itemType: 'hqTQcpfaiO',
//         //     status: 'HqdG1eLkKc'
//         // },
//         {
//             id: '5t2whqoHD11',
//             name: '测试032202',
//             workspace: 'LPT1',
//             itemType: 'hqTQcpfaiO',
//             status: 'HqdG1eLkKc'
//         }
//     ],
//     appFieldsData: [
//         // {
//         //     group: '44/234234/jyt',
//         //     priority: '高',
//         //     action: '1.xxx\r\n2.www',
//         //     result: '1.xxx\r\n2.www',
//         //     itemId: 'qATTCWHO4A'
//         // },
//         {
//             group: '测试01/测试02/测试04',
//             priority: '中',
//             action: '1.xxx\r\n2.www',
//             result: '1.xxx\r\n2.www',
//             itemId: '5t2whqoHD1'
//         }
//     ]
// }

const {
    data,
    appFieldsData,
} = triggerParams;


const APP_KEY = 'test_manager';

const TEST_MANAGER_TEST = `${APP_KEY}_Test`;

const TEST_MANAGER_REPO = `${APP_KEY}_Repository`;

const splitGroup = group => group.split('/');

// 根据事项数据获取 workspaceKey 
const getWorkspaceKey = datas => datas.find(d => d.workspace)?.workspace;

const getActionAndResultIndex = value => value.match(/^[0-9]+/)[0];

const getResultData = (action, results) =>
    results.split(/\r\n/g).find(r => getActionAndResultIndex(r) === getActionAndResultIndex(action))


const getStepsData = datas => {
    if (!datas.action) return [];

    return datas.action.split(/\r\n/g).map(d => ({
        action: d,
        result: getResultData(d, datas.result)
    }))
}

// 创建测试用例数据，返回测试用例
const createTestMangerTest = async () => {
    const itemParseObj = await apis.getParseModel(false, 'Item');
    const testInstance = await apis.getParseObject(false, TEST_MANAGER_TEST);

    const workspaceKey = getWorkspaceKey(data);

    const _data = appFieldsData.map(_data => ({
            workspaceKey,
            type: 'TestDetail',
            reference: itemParseObj.createWithoutData(_data.itemId),
            detail: {
                precondition: _data.precondition,
                steps: getStepsData(_data)
            }
        }))
        .map(row => {
            const newTestInstance = testInstance.clone()
            newTestInstance.set(row);
            return newTestInstance
        })

    const newData = await apis.saveAllObject(_data);

    return newData;
}

// 导入成功后，创建事项数据后的回调函数
const importCallBack = async () => {
    const testManagerTestData = await createTestMangerTest();
    const RepoParseObj = await apis.getParseModel(false, TEST_MANAGER_REPO);

    const workspaceKey = getWorkspaceKey(data);

    const testDataList = testManagerTestData.map(d => ({
        itemId: d.get('reference').id,
        data: d,
    }))

    const repoData = await apis.getAllData(false, TEST_MANAGER_REPO, {
        workspaceKey: getWorkspaceKey(data)
    });

    const newRepoData = repoData.map(d => {
        const _data = d.toJSON();
        return {
            name: _data.name,
            key: _data.objectId,
            testDetailIds: _data.testDetailIds ?? [],
            parentId: _data.parent?.objectId ?? null,
            workspaceKey: _data.workspaceKey,
        };
    });

    appFieldsData.forEach(async d => {
        if (!d.group) {
            // 加入未分组
            console.log('加入未分组')
        } else {
            const groups = splitGroup(d.group);

            if (groups.length > 5) {
                // 暂不做任何处理
                console.log('超过5级，暂不做任何处理')
            }

            const getRepoDataByGroup = (treeData, groupName) => treeData?.find(tree => tree.name === groupName);

            if (groups.length > 0 && groups.length <= 5) {
                const groupObj = await groups.reduce(async (prev, cur) => {
                    const getParentId = params => params.key || params.objectId;
                    const createRepo = async params => {
                        const parent = getParentId(params);

                        const repo = new RepoParseObj({
                            parent: parent ? RepoParseObj.createWithoutData(parent) : undefined,
                            name: cur,
                            workspaceKey,
                        })

                        await repo.save();

                        return repo.toJSON();
                    };
                    const getPrev = async (newPrev, oldPrev) => {

                        newPrev = newPrev || await createRepo(oldPrev);
                        return newPrev;
                    };
                    const _prev = await prev;

                    prev = await getPrev(getRepoDataByGroup(newRepoData, cur), _prev)

                    return prev;
                }, {})

                if (groupObj) {
                    console.log('groupObj', groupObj)

                    const repository = new RepoParseObj({
                        objectId: groupObj.key,
                    });

                    const getTestDetailIds = () => {
                        const id = testDataList.find(list => list.itemId === d.itemId)?.data.toJSON().objectId;

                        return [...new Set([...groupObj.testDetailIds, id].filter(Boolean))]
                    }

                    repository.set('testDetailIds', getTestDetailIds());

                    await apis.saveAllObject([repository])
                }
            }
        }



    })
}

importCallBack()

return {
    code: 200,
    message: '成功',
};