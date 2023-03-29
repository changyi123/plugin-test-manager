export const getReportKey = data => {
  return data
    ?.reduce((prev, cur) => {
      if (cur?.key !== 'root') {
        prev = prev.concat(cur?.key);
      }
      if (cur?.children?.length) {
        prev = prev.concat(getReportKey(cur.children));
      }
      return prev;
    }, [])
    .filter(Boolean);
};

export const getRepositoryQuery = (node, type = 'all') => {
  if (!node) return {};
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
    repository: type === 'current' ? [node?.key] : getReportKey([node]),
  };
};
