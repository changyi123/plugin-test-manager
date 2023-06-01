import { WordTemplate } from '@/services/models';

export const getFirstWordTemplate = async () => {
  return new Parse.Query(WordTemplate).first({ json: true } as any);
};
