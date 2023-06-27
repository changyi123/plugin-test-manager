export type Guard = {
  canActive: (...args: any) => boolean | Promise<boolean>;
  renderResultPage: () => React.ReactNode;
};
