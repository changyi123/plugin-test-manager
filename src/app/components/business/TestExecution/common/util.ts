import { getAppEnv } from '@/lib/appEnv';
import fetch from '@/lib/utils/fetch';
import { getPluginWebTriggerBaseUrl } from '@/lib/utils/helper';

export const downLoadFile = (data: string, tempName: string): void => {
  const blob = new Blob([data], { type: 'application/octet-stream' });
  /* 兼容ie内核，360浏览器的兼容模式 */
  if (window.navigator && (window.navigator as any).msSaveOrOpenBlob) {
    (window.navigator as any).msSaveOrOpenBlob(blob, tempName);
  } else {
    /* 火狐谷歌的文件下载方式 */
    const downloadElement = document.createElement('a');
    const href = window.URL.createObjectURL(blob);
    downloadElement.href = href;
    downloadElement.download = tempName;
    document.body.appendChild(downloadElement);
    downloadElement.click();
    document.body.removeChild(downloadElement);
    window.URL.revokeObjectURL(href);
  }
};

export const getFileNameFromContentDisposition = (
  contentDisposition: string,
  defaultName: string,
): string => {
  // 解析扩展方式指定的文件名
  if (!contentDisposition) return defaultName;
  const extendedFilenameRegex = /filename\*=UTF-8''(.+)/;
  const extendedMatch = contentDisposition.match(extendedFilenameRegex);
  if (extendedMatch && extendedMatch[1]) {
    const extendedFileName = decodeURIComponent(extendedMatch[1]);
    return extendedFileName;
  }

  // 解析传统方式指定的文件名
  const traditionalFilenameRegex = /filename="(.+?)"/;
  const traditionalMatch = contentDisposition.match(traditionalFilenameRegex);
  if (traditionalMatch && traditionalMatch[1]) {
    const traditionalFileName = traditionalMatch[1];
    return traditionalFileName;
  }

  return defaultName;
};
