// 处理用例库数据，获取用例库完整路径
export const handleRepoPath = datas => {
  const getPath = (gro, _datas, path = []) => {
    path.push(gro.name);

    if (gro.parentKey && gro.parentKey !== 'root') {
      // 可能存在父节点被删除的情况，需要判断父节点是否存在
      const parent = _datas.find(d => d.objectId === gro.parentKey);
      if (parent) {
        path = getPath(parent, _datas, path);
      }
    }

    return path;
  };

  return datas?.map(repo => ({
    ...repo,
    path: getPath(repo, datas).reverse().join('/'),
  }));
};

// 处理用例库数据
export const getRepoData = datas =>
  datas
    ?.map(d => {
      if (d)
        return {
          name: d.name,
          objectId: d.objectId,
          parentKey: d.parent?.objectId ?? null,
          workspaceKey: d.workspaceKey,
        };
    })
    .filter(d => d !== null);
