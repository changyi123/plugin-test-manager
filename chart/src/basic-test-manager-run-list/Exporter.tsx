import { message } from 'antd';

const Exporter = ({ onExportFinished }) => {
  message.warning('暂不支持导出');
  onExportFinished && onExportFinished();
  return;
};

export default Exporter;
