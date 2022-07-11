// 处理用例库数据，获取用例库完整路径
export const handleRroupPath = datas => {
  const getPath = (gro, _datas, path = []) => {
    path.push(gro.name);

    if (gro.parentKey) {
      path = getPath(
        _datas.find(d => d.objectId === gro.parentKey),
        _datas,
        path,
      );
    }

    return path;
  };

  return datas?.map(d => ({
    ...d,
    path: getPath(d, datas).reverse().join('/'),
  }));
};

// 处理用例库数据
export const getRepoData = datas =>
  datas
    ?.map(d => {
      return d
        ? {
            name: d.name,
            objectId: d.objectId,
            parentKey: d.parent?.objectId ?? null,
            workspaceKey: d.workspaceKey,
          }
        : null;
    })
    .filter(d => d !== null);
