import { WordTemplate } from '@/lib/models';

export const getFirstWordTemplate = async () => {
  return new Parse.Query(WordTemplate).first({ json: true } as any);
};
