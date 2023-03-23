export const getReportKey = data =>
  data
    ?.reduce(
      (prev, cur) => {
        prev = prev.concat(cur?.key);
        if (cur?.children?.length) {
          prev = prev.concat(getReportKey(cur?.children));
        }
        return prev;
      },
      [data?.key === 'root' ? null : data?.key],
    )
    .filter(Boolean);

export const getRepositoryQuery = (node, type = 'all') => {
  if (node?.key === 'root') {
    return type === 'current'
      ? {
          repository: {
            operator: 'not in',
            value: getReportKey([node]),
          },
        }
      : {};
  }
  return {
    repository: node === 'current' ? [node?.objectId] : getReportKey([node]),
  };
};
