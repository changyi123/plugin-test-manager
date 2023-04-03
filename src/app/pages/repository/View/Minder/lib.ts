import { v4 } from 'uuid';
import JSZip from 'jszip';
import { MinderNodeType } from 'common/constant';
import { Workbook, Topic, Dumper } from 'xmind/dist/browser';

/** 导出脑图数据 */
export const exportAndDownloadXMind = async (minderData, { t, priorityOptions }) => {
  const priorityKeyMapping = priorityOptions.reduce((mapping, priority) => {
    return {
      ...mapping,
      [priority.key]: priority.name,
    };
  }, {});
  /**  uid */
  const genUid = () => v4(8);
  /** 扁平化 minder data */
  const flattenMinderData = (nodes, pId) => {
    if (Array.isArray(nodes)) {
      return nodes.reduce((arr, node) => {
        const id = genUid();
        return arr.concat(
          { ...node.data, id, parentId: pId },
          flattenMinderData(node.children, id),
        );
      }, []);
    }
  };
  /** 添加主题 label */
  const setTopicLabel = (cid, { type, priority }) => {
    topic.on(cid);
    // root 节点不添加 label
    if (type && type !== MinderNodeType.Root) {
      topic.addLabel(t(`minderNodeTypeName.${type}`));
    }
    const priorityLabel = priorityKeyMapping[priority];
    if (priorityLabel) {
      topic.addLabel(priorityLabel);
    }
  };

  const rootMinderNode = minderData.root;
  // 生成根节点的 id
  rootMinderNode.data = {
    ...rootMinderNode.data,
    id: genUid(),
  };

  const workbook = new Workbook();
  const topic = new Topic({
    sheet: workbook.createSheet('XMind export', rootMinderNode.data.text),
  });

  // 设置根节点的 label
  topic.on();
  setTopicLabel(topic.cid(), rootMinderNode.data);

  // 扁平化 minder data
  const flattedMinderNodeDataList = flattenMinderData(
    rootMinderNode.children,
    rootMinderNode.data.id,
  );

  // 设置字节点的 label
  const topicCIdMapping = {};
  for (const data of flattedMinderNodeDataList) {
    if (!data) continue;
    const { id, parentId, text, type, priority } = data;
    // 挂载父节点
    topicCIdMapping[parentId] && topic.on(topicCIdMapping[parentId]);
    topicCIdMapping[id] = topic.add({ title: text }).cid();
    // 添加节点类型，优先级
    setTopicLabel(topicCIdMapping[id], { type, priority });
  }

  // 生成 files 文件
  const dumper = new Dumper({ workbook });
  const files = dumper.dumping();
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.filename, file.value);
  }
  const blob = await zip.generateAsync({ type: 'blob' });

  // download xmind
  const fileName = rootMinderNode.data.text;
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = `${fileName}.xmind`;
  link.click();
  window.URL.revokeObjectURL(link.href);
};
