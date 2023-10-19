export type TestEntityLinkActionData = {
  objectId: string;
  // linkItems 支持 { action: 'add' | 'delete', value: [] } 格式更新
  linkItems:
    | string[]
    | {
        action: 'add' | 'delete';
        value: string[];
      };
};
