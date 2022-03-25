// const triggerParams = {
//     data: [{
//             id: 'qATTCWHO4A',
//             name: '测试032201',
//             workspace: 'LPT1',
//             itemType: 'hqTQcpfaiO',
//             status: 'HqdG1eLkKc'
//         },
//         {
//             id: '5t2whqoHD11',
//             name: '测试032202',
//             workspace: 'LPT1',
//             itemType: 'hqTQcpfaiO',
//             status: 'HqdG1eLkKc'
//         }
//     ],
//     appFieldsData: [{
//             group: '44/55/66',
//             priority: '高',
//             action: '1.xxx\r\n2.www',
//             result: '1.xxx\r\n2.www',
//             itemId: 'qATTCWHO4A'
//         },
//         {
//             group: '测试01/测试02/测试041',
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

const handleRroupPath = datas => {
    const getPath = (gro, _datas, path = []) => {
        path.push(gro.name);

        if (gro.parentId) {
            path = getPath(_datas.find(d => d.objectId === gro.parentId), _datas, path)
        }

        return path
    }

    return datas.map(d => ({
        ...d,
        path: getPath(d, datas).reverse().join('/')
    }))
}

const getRepoData = async () => {
    const repoData = await apis.getAllData(false, TEST_MANAGER_REPO, {
        workspaceKey: getWorkspaceKey(data)
    });

    const newRepoData = repoData.map(d => {
        const _data = d.toJSON();

        return {
            name: _data.name,
            objectId: _data.objectId,
            testDetailIds: _data.testDetailIds ?? [],
            parentId: _data.parent?.objectId ?? null,
            workspaceKey: _data.workspaceKey,
        };
    });

    return handleRroupPath(newRepoData)
}

const getParent = (RepoParseObj, datas, repoData) => {
    const _data = datas.find(d => d.path === repoData.path.replace(`/${repoData.name}`, ''));

    return _data?.objectId && RepoParseObj.createWithoutData(_data.objectId)
}

const saveRepo = async (RepoParseObj, gro, parent, i) => {
    const repo = new RepoParseObj({
        parent: i === 0 ? undefined : parent,
        workspaceKey: getWorkspaceKey(data),
        name: gro.name,
    })

    await repo.save();
}

const handleRepoData = (RepoParseObj, datas, newRepoData, i) => {

    return datas.map(async gro => {
        const parent = i === 0 ? undefined : getParent(RepoParseObj, newRepoData, gro);

        console.log(333, parent)
        return await saveRepo(RepoParseObj, gro, parent, i)
    })
}

const createRepoGroup = async (datas, i) => {
    const RepoParseObj = await apis.getParseModel(false, TEST_MANAGER_REPO);
    const newRepoData = await getRepoData();

    const _data = datas.filter(d => d.index === i)

    return handleRepoData(RepoParseObj, _data, newRepoData, i);
}

const getImportGroupData = () => appFieldsData.map(d => d.group?.split('/').reduce((prev, cur, index) => {
    prev[index] = {
        name: cur,
        parent: index === 0 ? null : prev[index - 1].name,
        path: index === 0 ? cur : `${prev[index-1].path}/${cur}`,
        index,
    }

    return prev;
}, [])).flat();

const getToCreateGroupData = async () => {
    const newRepoData = await getRepoData();

    return getImportGroupData().filter(d => !newRepoData.some(g => g.path === d.path))
}

const handleFieldsData = async (testManagerTestData) => {
    const repoDatas = await getRepoData();
    const RepoParseObj = await apis.getParseModel(false, TEST_MANAGER_REPO);

    const newRepoObj = appFieldsData.map(field => {
        const repoData = repoDatas.find(gro => gro.path === field.group);

        
        const repository = new RepoParseObj({
            objectId: repoData.objectId,
        });

        const getAddId = () => {
            const testMap = new Map()

            testManagerTestData.forEach(d => {
                const _data = d.toJSON();
                testMap.set(_data.reference.objectId, _data.objectId)
            })

            return testMap.get(field.itemId)
        }
        
        const getDetailIds = () => repoData.testDetailIds.concat(getAddId())

        repository.set('testDetailIds', getDetailIds())

        return repository
    })

    return await apis.saveAllObject(newRepoObj);
}

// 导入成功后，创建事项数据后的回调函数
const importCallBack = async () => {
    const testManagerTestData = await createTestMangerTest();
    const toCreateGroupData = await getToCreateGroupData();

    // 创建用例库
    for (let i = 0; i < 5; i++) {
        await createRepoGroup(toCreateGroupData, i)
    }

    // 绑定用例到用例库
    handleFieldsData(testManagerTestData)

}

importCallBack()

return {
    code: 200,
    message: '成功',
};