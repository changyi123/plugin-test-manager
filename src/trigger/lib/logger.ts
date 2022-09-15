export const logTimeCost = msg => {
  const sT = Date.now();
  const dump = () => {
    console.info(`${msg} cost: ${Date.now() - sT}ms`);
  };
  return dump;
};
