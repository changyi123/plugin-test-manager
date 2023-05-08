import { MinderNodeType } from 'common/constant';
import JSZip from 'jszip';
import { v4 } from 'uuid';
import { Dumper, Topic, Workbook } from 'xmind/dist/browser';
import XML from 'xml-js';

/** 导出脑图数据 */
export const exportAndDownloadXMind = async (minderData, { t, priorityOptions = [] }) => {
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
  const sheet = workbook.createSheet('XMind export', rootMinderNode.data.text);
  workbook.theme('XMind export', 'business');
  const topic = new Topic({
    sheet,
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
  const topicCIdMapping = {
    [rootMinderNode.data.id]: topic.cid(),
  };
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

/** 解析 XMind 转换为 Minder Data 数据 */
export const parseXMindFile2MinderData = async (file, { priorityOptions }) => {
  const contentJSONFileName = 'content.json';
  const contentXMLFileName = 'content.xml';

  const zip = new JSZip();

  const covertTopic2Minder = rootTopic => {
    const topic2MinderData = ({ labels, title }) => {
      const data = { type: '', priority: '', text: title };

      const TypeMapping = {
        [MinderNodeType.Module]: ['模块', 'Module', 'module'],
        [MinderNodeType.TestCase]: ['用例', '测试用例', 'TestCase', 'testCase', 'Case', 'case'],
        [MinderNodeType.Precondition]: ['前置条件', 'Precondition', 'precondition'],
        [MinderNodeType.Step]: ['步骤', 'Step', 'step'],
        [MinderNodeType.Result]: ['预期结果', 'Result', 'result'],
        [MinderNodeType.Data]: ['数据', 'Data', 'data'],
      };

      const PriorityMapping = priorityOptions.reduce(
        (mapping, opt) => ({
          ...mapping,
          [opt.key]: [opt.name, opt.key],
        }),
        {},
      );

      const getMappingKey = (mapping, label) => {
        for (const [key, set] of Object.entries(mapping as Record<string, string[]>)) {
          if (set?.includes(label)) {
            return key;
          }
        }
      };

      (labels ?? []).forEach(label => {
        if (!data.type) {
          data.type = getMappingKey(TypeMapping, label);
        }
        // 给标签增加优先级
        if (data.type === MinderNodeType.TestCase && !data.priority) {
          data.priority = getMappingKey(PriorityMapping, label);
        }
      });
      return data;
    };

    const traverseTopic = (topic, minderNode = {} as any) => {
      minderNode.data = topic2MinderData(topic);
      if (Array.isArray(topic?.children?.attached)) {
        minderNode.children = topic.children.attached.map(childTopic => traverseTopic(childTopic));
      }
      return minderNode;
    };

    return traverseTopic(rootTopic);
  };

  try {
    const { files } = await zip.loadAsync(file, { optimizedBinaryString: true });
    const hasJSONFile = files[contentJSONFileName];
    let content = null;
    // 兼容 XMind 8.7.1 版本，content.json 文件不存在
    if (!hasJSONFile) {
      const xmlStr = await files[contentXMLFileName].async('string');
      // 读取 content.xml 文件
      const json = JSON.parse(
        XML.xml2json(xmlStr, {
          compact: true,
          spaces: 4,
        }),
        (key, value) => {
          const getElementText = value => {
            if (!value || typeof value !== 'object') return value;

            // 有 _text 属性的对象，或者 key 为 text 的对象，直接返回 _text 属性
            return key === 'title' || Object.hasOwnProperty.call(value, '_text')
              ? value?._text ?? 'empty'
              : value;
          };

          if (['_attributes', 'xhtml:img'].includes(key)) return;

          if (key === 'children' && Object.hasOwnProperty.call(value, 'topics')) {
            return {
              attached: Array.isArray(value.topics.topic)
                ? value.topics.topic
                : [value.topics.topic],
            };
          }

          if (key === 'labels' && value?.label) {
            return Array.isArray(value.label)
              ? value.label.map(getElementText)
              : [getElementText(value.label)];
          }

          return getElementText(value);
        },
      );
      content = json['xmap-content'].sheet.topic;
    } else {
      // 读取 content.json 文件
      const contentJsonStr = await files[contentJSONFileName].async('string');
      content = JSON.parse(contentJsonStr).shift().rootTopic;
    }

    return covertTopic2Minder(content);
  } catch (err) {
    console.error(err);
  }
};

/** 统计节点数量 */
export const countMinderNodes = (rootNode, nodeType?: MinderNodeType) => {
  const traverse = (node, count = 0) => {
    if (nodeType) {
      if (node.data?.type === nodeType) count++;
    } else {
      count++;
    }

    Array.isArray(node.children) &&
      node.children.forEach(child => (count = traverse(child, count)));

    return count;
  };

  return traverse(rootNode);
};
