import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import useI18n from '@/lib/hooks/useI18n';

import cx from './index.less';

interface TreeNode {
  key: string;
  name: string;
  title?: React.ReactNode;
  children?: TreeNode[];
  counts?: number[];
  parentKey?: string;
  [key: string]: any;
}

interface VirtualTreeProps {
  treeData: TreeNode[];
  selectedKeys: string[];
  expandedKeys: string[];
  onSelect: (keys: string[], info: { node: TreeNode }) => void;
  onExpand: (keys: string[]) => void;
  onRightClick?: (info: { event: React.MouseEvent; node: TreeNode }) => void;
  onDrop?: (info: {
    node: TreeNode;
    dragNode: TreeNode;
    dropPosition: number;
    dropToGap: boolean;
  }) => void;
  onExternalDrop?: (info: { data: any; targetNode: TreeNode; dropToGap: boolean }) => void;
  titleRender?: (node: TreeNode) => React.ReactNode;
  height?: number;
  itemHeight?: number;
  className?: string;
  draggable?: boolean;
}

const VirtualTree: React.FC<VirtualTreeProps> = ({
  treeData,
  selectedKeys,
  expandedKeys,
  onSelect,
  onExpand,
  onRightClick,
  onDrop,
  onExternalDrop,
  titleRender,
  height = 600,
  itemHeight = 32,
  className,
  draggable = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // 记录初始渲染状态，避免滚动条跳动
  const [, setIsInitialized] = useState(false);
  const { t } = useI18n();

  // 自定义拖拽状态 - 使用ref避免频繁重渲染
  const dragStateRef = useRef({
    dragging: false,
    dragNode: null as TreeNode | null,
    dropPosition: 0,
    dropToGap: false,
    lastDragOverTarget: null as HTMLElement | null,
    dropIndicatorElement: null as HTMLElement | null,
    // 自定义拖拽的新状态
    currentHoverNode: null as { node: TreeNode; pos: string; level: number } | null,
    mousePosition: { x: 0, y: 0 },
    startMousePosition: { x: 0, y: 0 },
    // 拖拽预览元素
    dragPreviewElement: null as HTMLElement | null,
    // 节流控制
    lastMoveTime: 0,
    moveThrottle: 32, // 增加到32ms节流，减少频繁更新
    // 增加稳定区域控制，避免边界频繁切换
    lastDropType: null as 'before' | 'after' | 'inside' | null,
    stableZoneThreshold: 4, // 4px的稳定区域
  });

  // 移除了expandedNodeCount，直接使用allExpandedNodes.length

  // 展平所有已展开的树节点（用于虚拟滚动的完整数据源）
  // 这里包含所有展开状态下应该显示的节点，无论是否在当前屏幕内
  const allExpandedNodes = useMemo(() => {
    const result: { node: TreeNode; level: number; pos: string }[] = [];

    const traverse = (nodes: TreeNode[], level = 0, parentPos = '0') => {
      nodes.forEach((node, index) => {
        const pos = `${parentPos}-${index}`;
        // 节点本身总是添加到结果中
        result.push({ node, level, pos });

        // 只有当节点展开且有子节点时，才递归处理子节点
        if (expandedKeys.includes(node.key) && node.children && node.children.length > 0) {
          traverse(node.children, level + 1, pos);
        }
      });
    };

    traverse(treeData);

    console.info('[VirtualTree] 已展开节点计算:', {
      totalExpandedNodes: result.length,
      expandedKeys: expandedKeys.length,
      conceptNote: '包含所有展开状态下的可见节点，无论是否在屏幕内',
    });

    return result;
  }, [treeData, expandedKeys]);

  // 虚拟滚动：计算所有展开节点的真实总高度
  const virtualScrollHeight = useMemo(() => {
    // 这是虚拟滚动的核心：所有展开节点的理论总高度
    const totalVirtualHeight = allExpandedNodes.length * itemHeight;

    console.info('[VirtualTree] 🎯 虚拟滚动高度:', {
      expandedNodeCount: allExpandedNodes.length,
      itemHeight,
      totalVirtualHeight,
      concept: '所有展开节点的虚拟总高度',
    });

    return totalVirtualHeight;
  }, [allExpandedNodes.length, itemHeight]);

  // 占位div高度：用于撑开滚动容器
  const placeholderHeight = useMemo(() => {
    // 关键修复：占位div高度 = 虚拟总高度，让滚动条反映真实的内容量
    const finalHeight = Math.max(virtualScrollHeight, height);

    console.info('[VirtualTree] 📏 占位div高度:', {
      virtualScrollHeight,
      containerMinHeight: height,
      finalPlaceholderHeight: finalHeight,
      formula: `max(${virtualScrollHeight}, ${height}) = ${finalHeight}`,
    });

    return finalHeight;
  }, [virtualScrollHeight, height]);

  // 计算可见范围（基于所有展开节点的数量）- 虚拟滚动的核心
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.ceil((scrollTop + height) / itemHeight);
    const result = {
      start: Math.max(0, start - 5), // 缓冲区
      end: Math.min(allExpandedNodes.length, end + 5), // 基于总展开节点数限制
    };

    // 减少日志频率，仅在范围显著变化时输出
    if (result.start % 10 === 0 || result.end >= allExpandedNodes.length - 5) {
      console.info('[VirtualTree] 可见范围:', {
        scrollTop,
        totalNodes: allExpandedNodes.length,
        visibleRange: `${result.start}-${result.end}`,
        renderCount: result.end - result.start,
      });
    }

    return result;
  }, [scrollTop, itemHeight, height, allExpandedNodes.length]);

  // 只渲染可见节点（从全部展开节点中切片）- 虚拟滚动的渲染优化
  const visibleNodes = useMemo(() => {
    const nodes = allExpandedNodes.slice(visibleRange.start, visibleRange.end);

    // 减少日志输出，仅在范围边界时记录
    if (visibleRange.start % 20 === 0) {
      console.info('[VirtualTree] 渲染节点:', {
        total: allExpandedNodes.length,
        rendering: `${visibleRange.start}-${visibleRange.end} (${nodes.length} 个)`,
        firstNode: nodes[0]?.node?.name,
        lastNode: nodes[nodes.length - 1]?.node?.name,
      });
    }

    return nodes;
  }, [allExpandedNodes, visibleRange]);

  // 优化滚动性能 - 使用ref避免频繁state更新
  const scrollRAF = useRef<number>();
  const lastLogTime = useRef<number>(0);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      const scrollContainer = e.currentTarget;

      // 节流日志输出，每500ms最多输出一次
      const now = Date.now();
      if (now - lastLogTime.current > 500) {
        console.info('[VirtualTree] 🔍 虚拟滚动诊断:', {
          scrollTop: newScrollTop,
          actualScrollHeight: scrollContainer.scrollHeight,
          expectedPlaceholderHeight: placeholderHeight,
          heightMatch: scrollContainer.scrollHeight === placeholderHeight,
          scrollPercentage:
            (
              (newScrollTop / (scrollContainer.scrollHeight - scrollContainer.clientHeight)) *
              100
            ).toFixed(1) + '%',
          analysis:
            scrollContainer.scrollHeight === placeholderHeight ? '✅ 高度匹配' : '❌ 占位div未生效',
        });
        lastLogTime.current = now;
      }

      // 取消之前的RAF
      if (scrollRAF.current) {
        cancelAnimationFrame(scrollRAF.current);
      }

      // 使用RAF节流，避免频繁更新
      scrollRAF.current = requestAnimationFrame(() => {
        setScrollTop(newScrollTop);
      });
    },
    [placeholderHeight],
  );

  // 初始化时设置标记，用于其他优化
  useLayoutEffect(() => {
    setIsInitialized(true);
    console.info('[VirtualTree] 组件已初始化');

    // 调试：检查实际DOM高度
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current;
      console.info('[VirtualTree] 🔍 DOM初始化检查:', {
        scrollHeight: scrollContainer.scrollHeight,
        clientHeight: scrollContainer.clientHeight,
        offsetHeight: scrollContainer.offsetHeight,
        expectedPlaceholderHeight: placeholderHeight,
        placeholderWorking: scrollContainer.scrollHeight === placeholderHeight,
      });
    }
  }, [placeholderHeight]);

  const handleNodeClick = useCallback(
    (node: TreeNode, e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect([node.key], { node });
    },
    [onSelect],
  );

  const handleExpandClick = useCallback(
    (node: TreeNode, e: React.MouseEvent) => {
      e.stopPropagation();
      const newKeys = expandedKeys.includes(node.key)
        ? expandedKeys.filter(k => k !== node.key)
        : [...expandedKeys, node.key];
      onExpand(newKeys);
    },
    [expandedKeys, onExpand],
  );

  const handleRightClick = useCallback(
    (node: TreeNode, e: React.MouseEvent) => {
      if (onRightClick) {
        onRightClick({ event: e, node });
      }
    },
    [onRightClick],
  );

  // 创建或获取插入线指示器
  const createDropIndicator = useCallback(() => {
    // 先尝试找到已存在的插入线
    let indicator = dragStateRef.current.dropIndicatorElement;

    // 检查元素是否还在DOM中
    if (indicator && !document.body.contains(indicator)) {
      indicator = null;
      dragStateRef.current.dropIndicatorElement = null;
    }

    if (indicator) {
      return indicator;
    }

    // 创建新的插入线元素
    indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      height: 2px;
      background-color: #0c62ff;
      z-index: 1000;
      pointer-events: none;
      border-radius: 1px;
      box-shadow: 0 0 2px rgba(12, 98, 255, 0.3);
      display: none;
    `;

    indicator.className = 'virtual-tree-drop-indicator';
    indicator.id = 'drag-drop-indicator';

    // 添加到body，使用fixed定位
    document.body.appendChild(indicator);
    dragStateRef.current.dropIndicatorElement = indicator;

    return indicator;
  }, []);

  // 高亮父节点
  const highlightParentNode = useCallback((parentKey: string | null) => {
    // 先清除所有高亮
    document.querySelectorAll('.virtual-tree-parent-highlight').forEach(el => {
      el.classList.remove('virtual-tree-parent-highlight');
    });

    if (parentKey) {
      const parentElement = document.querySelector(`[data-row-key="${parentKey}"]`);
      if (parentElement) {
        parentElement.classList.add('virtual-tree-parent-highlight');
      }
    }
  }, []);

  // 插入线定位（使用fixed定位）- 优化版本
  const updateDropIndicator = useCallback(
    (target: HTMLElement, showLineAbove: boolean, level: number, parentKey?: string | null) => {
      if (!target) {
        return;
      }

      const indicator = createDropIndicator();
      if (!indicator) {
        return;
      }

      try {
        // 高亮父节点
        highlightParentNode(parentKey);

        // 重置样式为线条 - 更粗更明显的线条
        indicator.innerHTML = '';
        indicator.style.backgroundColor = '#1890ff';
        indicator.style.border = 'none';
        indicator.style.borderRadius = '2px';
        indicator.style.height = '3px';
        indicator.style.boxShadow = '0 0 8px rgba(24, 144, 255, 0.6)';

        // 使用固定定位，直接基于视口
        const targetRect = target.getBoundingClientRect();
        const scrollContainer = scrollRef.current;
        const containerRect = scrollContainer?.getBoundingClientRect();

        if (!containerRect) {
          return;
        }

        // 计算缩进宽度 - 同级插入用完整宽度的线条
        const indentWidth = level * 14 + 22 + 16; // 加上左侧margin
        const lineWidth = containerRect.width - indentWidth - 48; // 为始终显示的滚动条留出空间

        // 计算垂直位置
        let topPosition: number;
        if (showLineAbove) {
          topPosition = targetRect.top - 2;
        } else {
          topPosition = targetRect.bottom - 2;
        }

        // 设置fixed定位样式 - 完整宽度的蓝色线条
        indicator.style.position = 'fixed';
        indicator.style.top = `${topPosition}px`;
        indicator.style.left = `${containerRect.left + indentWidth}px`;
        indicator.style.width = `${lineWidth}px`;
        indicator.style.display = 'block';

        // 添加大箭头指示器和文字提示
        indicator.innerHTML = `
          <div style="
            position: absolute;
            left: -16px;
            top: -8px;
            width: 0;
            height: 0;
            border-top: 8px solid transparent;
            border-bottom: 8px solid transparent;
            border-right: 16px solid #1890ff;
            filter: drop-shadow(0 0 6px rgba(24, 144, 255, 0.6));
          "></div>
          <div style="
            position: absolute;
            right: -80px;
            top: -12px;
            background: rgba(24, 144, 255, 0.9);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          ">${
            showLineAbove
              ? `↑ ${t('common.insertItIntoTheTop')}`
              : `↓ ${t('common.insertItIntoTheBottom')}`
          }</div>
        `;
      } catch (error) {
        // 静默处理错误
      }
    },
    [createDropIndicator, highlightParentNode, t],
  );

  const hideDropIndicator = useCallback(() => {
    if (dragStateRef.current.dropIndicatorElement) {
      dragStateRef.current.dropIndicatorElement.style.display = 'none';
    }
    // 清除所有父节点高亮
    document.querySelectorAll('.virtual-tree-parent-highlight').forEach(el => {
      el.classList.remove('virtual-tree-parent-highlight');
    });
  }, []);

  // 子节点插入指示器 - 显示为高亮背景，更明显的视觉区别
  const updateChildDropIndicator = useCallback(
    (target: HTMLElement, childLevel: number, parentKey: string) => {
      if (!target) {
        return;
      }

      const indicator = createDropIndicator();
      if (!indicator) {
        return;
      }

      try {
        // 高亮当前节点作为即将成为的父节点
        highlightParentNode(parentKey);

        // 使用固定定位，显示为更明显的子节点插入区域
        const targetRect = target.getBoundingClientRect();
        const scrollContainer = scrollRef.current;
        const containerRect = scrollContainer?.getBoundingClientRect();

        if (!containerRect) {
          return;
        }

        // 子节点缩进宽度 - 显示子节点会插入的位置
        const childIndentWidth = childLevel * 14 + 22 + 16; // 加上左侧margin

        // 设置为明显的子节点插入样式
        indicator.style.position = 'fixed';
        indicator.style.top = `${targetRect.top + 2}px`;
        indicator.style.left = `${containerRect.left + childIndentWidth}px`;
        indicator.style.width = `${containerRect.width - childIndentWidth - 48}px`; // 为始终显示的滚动条留出空间
        indicator.style.height = `${targetRect.height - 4}px`;
        indicator.style.backgroundColor = 'rgba(24, 144, 255, 0.12)';
        indicator.style.border = '2px dashed #1890ff';
        indicator.style.borderRadius = '6px';
        indicator.style.display = 'block';
        indicator.style.boxShadow = '0 0 8px rgba(24, 144, 255, 0.3)';

        // 添加大箭头指向内部和更明显的文本提示
        indicator.innerHTML = `
          <div style="
            position: absolute;
            left: -20px;
            top: 50%;
            transform: translateY(-50%);
            width: 0;
            height: 0;
            border-top: 10px solid transparent;
            border-bottom: 10px solid transparent;
            border-left: 16px solid #1890ff;
            filter: drop-shadow(0 0 6px rgba(24, 144, 255, 0.6));
          "></div>
          <div style="
            position: absolute; 
            right: 8px; 
            top: 50%; 
            transform: translateY(-50%); 
            font-size: 12px; 
            color: #1890ff; 
            font-weight: 600;
            display: flex;
            align-items: center;
            background: rgba(255, 255, 255, 0.95);
            padding: 4px 8px;
            border-radius: 4px;
            border: 2px solid #1890ff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          ">
            <span style="margin-right: 4px; font-size: 14px;">📁</span>
            <span>→ ${t('common.asChildNode')}</span>
          </div>
          <div style="
            position: absolute;
            left: 50%;
            top: -18px;
            transform: translateX(-50%);
            background: rgba(24, 144, 255, 0.9);
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
          ">${t('common.insertNodeInner')}</div>
        `;
      } catch (error) {
        // 静默处理错误
      }
    },
    [createDropIndicator, highlightParentNode, t],
  );

  // 重新设计的插入位置计算 - 更精确的区域划分
  const showVerifiedDropIndicator = useCallback(
    (
      nodeWithPos: { node: TreeNode; pos: string; level: number },
      mousePos: { x: number; y: number },
    ) => {
      const target = document.querySelector(
        `[data-row-key="${nodeWithPos.node.key}"]`,
      ) as HTMLElement;
      if (!target) {
        return;
      }

      // 精确的插入位置计算
      const rect = target.getBoundingClientRect();
      const offsetY = mousePos.y - rect.top;
      const nodeHeight = rect.height;

      // 优化的区域划分，带稳定区域避免频繁切换：
      const topZone = nodeHeight * 0.25; // 顶部25% - 插入到前面
      const bottomZone = nodeHeight * 0.75; // 底部25% - 插入到后面
      const stableThreshold = dragStateRef.current.stableZoneThreshold;

      // 中间50% - 插入为子节点（所有节点都支持）
      let dropType: 'before' | 'after' | 'inside';
      let showAsChild = false;

      // 初步确定区域类型
      let candidateType: 'before' | 'after' | 'inside';
      if (offsetY <= topZone) {
        candidateType = 'before';
      } else if (offsetY >= bottomZone) {
        candidateType = 'after';
      } else {
        candidateType = 'inside';
      }

      // 稳定区域逻辑：如果在边界附近且上次类型不同，需要更大的移动才切换
      const lastType = dragStateRef.current.lastDropType;
      const isNearTopBoundary = Math.abs(offsetY - topZone) <= stableThreshold;
      const isNearBottomBoundary = Math.abs(offsetY - bottomZone) <= stableThreshold;

      if (lastType && (isNearTopBoundary || isNearBottomBoundary)) {
        // 在边界附近，保持上一次的类型，避免频繁切换
        if (lastType === 'before' && offsetY <= topZone + stableThreshold) {
          dropType = 'before';
        } else if (lastType === 'after' && offsetY >= bottomZone - stableThreshold) {
          dropType = 'after';
        } else if (
          lastType === 'inside' &&
          offsetY > topZone - stableThreshold &&
          offsetY < bottomZone + stableThreshold
        ) {
          dropType = 'inside';
        } else {
          dropType = candidateType;
        }
      } else {
        dropType = candidateType;
      }

      // 记录当前类型
      dragStateRef.current.lastDropType = dropType;

      if (dropType === 'before') {
        dragStateRef.current.dropPosition = 0;
        dragStateRef.current.dropToGap = true;
      } else if (dropType === 'after') {
        dragStateRef.current.dropPosition = 1;
        dragStateRef.current.dropToGap = true;
      } else {
        // inside
        dragStateRef.current.dropPosition = 0;
        dragStateRef.current.dropToGap = false;
        showAsChild = true;
      }

      dragStateRef.current.lastDragOverTarget = target;

      // 清除样式
      document.querySelectorAll('.ant-tree-treenode-dragover').forEach(el => {
        el.classList.remove('ant-tree-treenode-dragover');
      });

      // 显示不同类型的指示器
      if (showAsChild) {
        // 作为子节点插入，高亮当前节点作为父节点
        updateChildDropIndicator(target, nodeWithPos.level + 1, nodeWithPos.node.key);
      } else {
        // 作为同级插入，高亮当前节点的父节点
        updateDropIndicator(
          target,
          dropType === 'before',
          nodeWithPos.level,
          nodeWithPos.node.parentKey,
        );
      }
    },
    [updateDropIndicator, updateChildDropIndicator],
  );

  // 自定义拖拽 - 鼠标按下开始拖拽
  const handleMouseDown = useCallback(
    (nodeWithPos: { node: TreeNode; pos: string; level: number }, e: React.MouseEvent) => {
      if (!draggable || !onDrop) {
        return;
      }

      // 只有左键按下才开始拖拽
      if (e.button !== 0) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      // 设置拖拽状态
      dragStateRef.current.dragging = true;
      dragStateRef.current.dragNode = { ...nodeWithPos.node, pos: nodeWithPos.pos };
      dragStateRef.current.startMousePosition = { x: e.clientX, y: e.clientY };
      dragStateRef.current.mousePosition = { x: e.clientX, y: e.clientY };

      // 创建拖拽预览元素 - 自定义简洁版本
      const createDragPreview = () => {
        // 创建简洁的预览元素，而不是克隆
        const preview = document.createElement('div');

        // 获取节点名称
        const nodeName = nodeWithPos.node.name || nodeWithPos.node.title || '未知节点';

        // 设置预览内容和样式
        preview.innerHTML = `
          <div style="
            display: flex;
            align-items: center;
            padding: 8px 12px;
            font-size: 14px;
            color: #333;
            white-space: nowrap;
            line-height: 1.4;
          ">
            <span style="
              width: 16px;
              height: 16px;
              margin-right: 8px;
              background: #FFB74D;
              border-radius: 2px;
              flex-shrink: 0;
            "></span>
            <span style="overflow: hidden; text-overflow: ellipsis;">${nodeName}</span>
          </div>
        `;

        // 设置预览容器样式 - 与 Table.tsx 保持一致
        preview.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          z-index: 9999;
          pointer-events: none;
          background: white;
          border-radius: 6px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          border: 1px solid #d9d9d9;
          max-width: 250px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          opacity: 0.9;
        `;

        // 初始位置 - 使用 transform
        preview.style.transform = `translate(${e.clientX + 15}px, ${e.clientY - 8}px)`;
        preview.style.willChange = 'transform';

        document.body.appendChild(preview);
        dragStateRef.current.dragPreviewElement = preview;
      };

      createDragPreview();

      // 添加拖拽样式类，禁用hover效果
      if (scrollRef.current) {
        scrollRef.current.classList.add('dragging');
      }

      // 全局鼠标移动处理
      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!dragStateRef.current.dragging) {
          return;
        }

        // 节流控制
        const now = performance.now();
        if (now - dragStateRef.current.lastMoveTime < dragStateRef.current.moveThrottle) {
          return;
        }
        dragStateRef.current.lastMoveTime = now;

        // 更新鼠标位置
        dragStateRef.current.mousePosition = { x: moveEvent.clientX, y: moveEvent.clientY };

        // 更新拖拽预览位置
        if (dragStateRef.current.dragPreviewElement) {
          const newTransform = `translate(${moveEvent.clientX + 15}px, ${moveEvent.clientY - 8}px)`;
          dragStateRef.current.dragPreviewElement.style.transform = newTransform;
        }

        // 找到鼠标下的节点元素（忽略预览元素）
        // 临时隐藏预览元素以获取真实的元素
        if (dragStateRef.current.dragPreviewElement) {
          dragStateRef.current.dragPreviewElement.style.pointerEvents = 'none';
        }

        const elementUnderMouse = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
        const nodeElement = elementUnderMouse?.closest('[data-row-key]') as HTMLElement;

        if (nodeElement) {
          const nodeKey = nodeElement.getAttribute('data-row-key');
          const flattenedNode = allExpandedNodes.find(
            (item: { node: TreeNode; pos: string; level: number }) => item.node.key === nodeKey,
          );

          if (flattenedNode) {
            // 更新当前悬停节点
            dragStateRef.current.currentHoverNode = flattenedNode;

            // 显示插入线
            showVerifiedDropIndicator(flattenedNode, {
              x: moveEvent.clientX,
              y: moveEvent.clientY,
            });
          }
        }
      };

      // 全局鼠标释放处理
      const handleMouseUp = () => {
        if (!dragStateRef.current.dragging || !onDrop || !dragStateRef.current.dragNode) {
          return;
        }

        const currentHoverNode = dragStateRef.current.currentHoverNode;

        if (currentHoverNode && dragStateRef.current.dragNode.key !== currentHoverNode.node.key) {
          // 调用父组件的 onDrop 处理
          const dropInfo = {
            node: { ...currentHoverNode.node, pos: currentHoverNode.pos },
            dragNode: dragStateRef.current.dragNode,
            dropPosition: dragStateRef.current.dropPosition,
            dropToGap: dragStateRef.current.dropToGap, // 使用实际的dropToGap值
          };

          onDrop(dropInfo);
        }

        // 清理拖拽状态
        dragStateRef.current.dragging = false;
        dragStateRef.current.dragNode = null;
        dragStateRef.current.currentHoverNode = null;
        dragStateRef.current.mousePosition = { x: 0, y: 0 };
        dragStateRef.current.startMousePosition = { x: 0, y: 0 };
        dragStateRef.current.lastDropType = null;

        // 清理拖拽预览元素
        if (dragStateRef.current.dragPreviewElement) {
          document.body.removeChild(dragStateRef.current.dragPreviewElement);
          dragStateRef.current.dragPreviewElement = null;
        }

        // 隐藏插入线
        hideDropIndicator();

        // 清除样式
        document.querySelectorAll('.ant-tree-treenode-dragover').forEach(el => {
          el.classList.remove('ant-tree-treenode-dragover');
        });

        // 移除拖拽样式类
        if (scrollRef.current) {
          scrollRef.current.classList.remove('dragging');
        }

        // 移除全局事件监听器
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('selectstart', preventDefault);
      };

      // 防止文本选择
      const preventDefault = (preventEvent: Event) => {
        preventEvent.preventDefault();
      };

      // 添加全局事件监听器
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('selectstart', preventDefault);
    },
    [draggable, onDrop, allExpandedNodes, showVerifiedDropIndicator, hideDropIndicator],
  );

  // 外部拖拽处理 - 监听从Table.tsx拖拽过来的用例
  useEffect(() => {
    if (!onExternalDrop) return;

    let isProcessingExternalDrag = false;
    let externalDragData: any = null;
    let moveThrottleTimer: any = null;

    // 全局鼠标移动处理
    const handleGlobalMouseMove = (e: MouseEvent) => {
      // 检查是否有外部拖拽数据
      const dragData = (global as any).dragNode || (window as any).dragNode;
      if (!dragData) return;

      // 检查鼠标是否在树容器内
      const container = scrollRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const isInContainer =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (isInContainer && !isProcessingExternalDrag) {
        isProcessingExternalDrag = true;
        externalDragData = dragData;
      } else if (!isInContainer && isProcessingExternalDrag) {
        // 鼠标离开容器，停止处理外部拖拽
        isProcessingExternalDrag = false;
        externalDragData = null;
        hideDropIndicator();
        return;
      }

      if (!isProcessingExternalDrag) return;

      // 节流处理移动事件
      if (moveThrottleTimer) {
        clearTimeout(moveThrottleTimer);
      }

      moveThrottleTimer = setTimeout(() => {
        // 找到鼠标下的节点
        const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
        const nodeElement = elementUnderMouse?.closest('[data-row-key]') as HTMLElement;

        if (nodeElement) {
          const nodeKey = nodeElement.getAttribute('data-row-key');
          const targetNode = allExpandedNodes.find(item => item.node.key === nodeKey);

          if (targetNode) {
            // 外部拖拽（用例）只能作为子节点插入，显示子节点插入指示器
            updateChildDropIndicator(nodeElement, targetNode.level + 1, targetNode.node.key);
          }
        } else {
          hideDropIndicator();
        }
      }, 16);
    };

    // 全局鼠标释放处理
    const handleGlobalMouseUp = (e: MouseEvent) => {
      console.info('[外部拖拽] mouseup事件触发', {
        isProcessing: isProcessingExternalDrag,
        hasData: !!externalDragData,
        timestamp: Date.now(),
      });

      // 立即清理样式，无论后续操作如何
      const immediateCleanup = () => {
        console.info('[外部拖拽] 执行立即清理', { timestamp: Date.now() });
        hideDropIndicator();

        // 强制清理所有可能的样式
        document.querySelectorAll('.virtual-tree-parent-highlight').forEach(el => {
          el.classList.remove('virtual-tree-parent-highlight');
        });

        // 清理状态
        isProcessingExternalDrag = false;
        externalDragData = null;

        // 清理全局拖拽状态
        delete (global as any).dragNode;
        delete (window as any).dragNode;
      };

      if (!isProcessingExternalDrag || !externalDragData) {
        immediateCleanup();
        return;
      }

      const container = scrollRef.current;
      if (!container) {
        immediateCleanup();
        return;
      }

      // 检查鼠标是否在树容器内释放
      const rect = container.getBoundingClientRect();
      const isInContainer =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (isInContainer) {
        // 找到释放位置的目标节点
        const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
        const nodeElement = elementUnderMouse?.closest('[data-row-key]') as HTMLElement;

        if (nodeElement) {
          const nodeKey = nodeElement.getAttribute('data-row-key');
          const targetNode = allExpandedNodes.find(item => item.node.key === nodeKey);

          if (targetNode) {
            console.info('[外部拖拽] 调用onExternalDrop前', { timestamp: Date.now() });

            // 保存数据的副本，因为清理会删除原始数据
            const dragDataCopy = { ...externalDragData };
            const targetNodeCopy = targetNode.node;

            // 先清理样式，再处理业务逻辑
            immediateCleanup();

            // 处理拖拽放置（异步操作不影响样式清理）
            Promise.resolve().then(() => {
              onExternalDrop({
                data: dragDataCopy,
                targetNode: targetNodeCopy,
                dropToGap: false, // 外部拖拽默认作为子节点
              });
            });

            console.info('[外部拖拽] 调用onExternalDrop后', { timestamp: Date.now() });
            return; // 已经清理，直接返回
          }
        }
      }

      // 确保清理
      immediateCleanup();
    };

    // 添加全局事件监听
    document.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
    document.addEventListener('mouseup', handleGlobalMouseUp, { passive: true });

    // 防御性清理：监听鼠标离开文档
    const handleMouseLeave = () => {
      if (isProcessingExternalDrag) {
        console.info('[外部拖拽] 鼠标离开文档，执行防御性清理');
        hideDropIndicator();
        document.querySelectorAll('.virtual-tree-parent-highlight').forEach(el => {
          el.classList.remove('virtual-tree-parent-highlight');
        });
        isProcessingExternalDrag = false;
        externalDragData = null;
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      // 移除事件监听
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);

      // 清理定时器
      if (moveThrottleTimer) {
        clearTimeout(moveThrottleTimer);
      }

      // 组件卸载时强制清理
      hideDropIndicator();
      document.querySelectorAll('.virtual-tree-parent-highlight').forEach(el => {
        el.classList.remove('virtual-tree-parent-highlight');
      });
    };
  }, [onExternalDrop, allExpandedNodes, updateChildDropIndicator, hideDropIndicator]);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      style={{
        height: `${height}px`,
        overflowY: 'scroll', // 强制显示滚动条，与CSS保持一致
        overflowX: 'hidden', // 避免水平滚动条
        position: 'relative',
        display: 'block', // 确保为块级元素，避免flex影响
        // 移除padding，避免与滚动条冲突
      }}
      className={cx('tree', 'folder-tree', className)}
    >
      {/* 占位元素，保持滚动条 - 基于已展开节点的固定高度 */}
      <div
        style={{
          height: `${placeholderHeight}px`,
          minHeight: `${placeholderHeight}px`, // 确保最小高度
          maxHeight: `${placeholderHeight}px`, // 锁定高度
          flexShrink: 0, // 防止被压缩
          flexGrow: 0, // 防止被拉伸
          width: '100%', // 确保宽度
          backgroundColor: 'transparent', // 透明背景
          pointerEvents: 'none', // 不影响交互
        }}
        data-debug-height={placeholderHeight}
      />

      {/* 可见节点 - 使用top定位，避免transform的GPU依赖 */}
      <div
        style={{
          position: 'absolute',
          top: `${visibleRange.start * itemHeight}px`, // 直接使用top定位
          left: '16px',
          right: '16px', // 为始终显示的滚动条留出空间
          pointerEvents: 'auto', // 允许交互
          zIndex: 1, // 确保在占位div之上
        }}
      >
        {visibleNodes.map(({ node, level, pos }) => {
          const hasChildren = node.children && node.children.length > 0;
          const isExpanded = expandedKeys.includes(node.key);
          const isSelected = selectedKeys.includes(node.key);

          const nodeContent = (
            <div
              key={node.key}
              className={cx('ant-tree-treenode', {
                'ant-tree-treenode-selected': isSelected,
                'ant-tree-treenode-draggable': draggable,
              })}
              style={{
                height: `${itemHeight}px`,
                padding: '4px 4px 4px 0',
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
                cursor: draggable ? 'move' : 'pointer',
                // 移除内联样式，让CSS类控制样式
              }}
              onClick={e => handleNodeClick(node, e)}
              onContextMenu={e => handleRightClick(node, e)}
              data-row-key={node.key}
            >
              {/* 缩进 */}
              <div style={{ width: `${level * 14}px`, flexShrink: 0 }} />

              {/* 拖拽手柄 - 放在左侧 */}
              {draggable && (
                <span
                  className="ant-tree-draggable-icon"
                  style={{
                    width: '16px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'grab',
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                    marginRight: '4px',
                  }}
                  onMouseDown={e => {
                    e.currentTarget.style.cursor = 'grabbing';
                    handleMouseDown({ node, pos, level }, e);
                  }}
                  onMouseUp={e => {
                    e.currentTarget.style.cursor = 'grab';
                  }}
                >
                  <svg width="8" height="14" viewBox="0 0 8 14" style={{ fill: '#b8b8b8' }}>
                    <circle cx="2" cy="2" r="1.2" />
                    <circle cx="2" cy="7" r="1.2" />
                    <circle cx="2" cy="12" r="1.2" />
                    <circle cx="6" cy="2" r="1.2" />
                    <circle cx="6" cy="7" r="1.2" />
                    <circle cx="6" cy="12" r="1.2" />
                  </svg>
                </span>
              )}

              {/* 展开/折叠开关 */}
              <span
                className={cx('ant-tree-switcher', {
                  'ant-tree-switcher-open': isExpanded,
                  'ant-tree-switcher-close': !isExpanded && hasChildren,
                  'ant-tree-switcher-noop': !hasChildren,
                })}
                style={{
                  width: '22px',
                  height: '22px',
                  lineHeight: '22px',
                  fontSize: '12px',
                  textAlign: 'center',
                  cursor: hasChildren ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '2px',
                  transition: 'background-color 0.2s ease',
                }}
                onClick={hasChildren ? e => handleExpandClick(node, e) : undefined}
                onMouseEnter={e => {
                  if (hasChildren) {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(0, 0, 0, 0.05)';
                  }
                }}
                onMouseLeave={e => {
                  if (hasChildren) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {hasChildren && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    style={{
                      transition: 'transform 0.2s ease',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    }}
                  >
                    <path
                      d="M4.5 2L8.5 6L4.5 10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>

              {/* 图标 */}
              <span
                className="ant-tree-iconEle"
                style={{
                  width: '22px',
                  lineHeight: '30px',
                  fontSize: '14px',
                  textAlign: 'center',
                }}
              >
                {isExpanded ? (
                  // 展开的文件夹图标（原来的 file-open.svg）
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                      <rect fill="#D8D8D8" opacity="0" x="0" y="0" width="16" height="16"></rect>
                      <rect fill="#FFFFFF" opacity="0" x="0" y="0" width="16" height="16"></rect>
                      <g transform="translate(0.500000, 2.000003)" fillRule="nonzero">
                        <path
                          d="M1.20043159,4.83279028 L0,9.23427418 L0,0.788852385 C0.000489067102,0.353385624 0.353382646,0.000492038724 0.788849407,0 L4.5370674,0 C4.74639867,-0.000572280068 4.94726049,0.0826200937 5.09488253,0.231037235 L6.71084055,1.84699526 C6.74032628,1.87671702 6.780498,1.89337531 6.82236413,1.89324155 L12.4638207,1.89324155 C12.8992875,1.89373063 13.252181,2.24662421 13.2526701,2.68209097 L13.2526701,3.78648014 L2.57026859,3.78648014 C1.93031908,3.78752097 1.36979806,4.21565864 1.20043159,4.83279028 Z"
                          fill="#FFAA0C"
                        ></path>
                        <path
                          d="M14.8376658,4.72757749 C14.689022,4.5314522 14.4568156,4.41662728 14.2107277,4.41755404 L2.57026859,4.41755404 C2.21460863,4.41823414 1.90317524,4.65630838 1.80922613,4.99933611 L0.174138503,10.9945916 C0.109629505,11.2317223 0.159317766,11.4853709 0.308530284,11.6806347 C0.457742803,11.8758986 0.689432441,11.990514 0.935180982,11.990514 L12.5756401,11.990514 C12.9313001,11.9898396 13.2427335,11.7517653 13.3366826,11.4087376 L14.9717702,5.41348205 C15.0371817,5.17645663 14.9874874,4.92247144 14.8375672,4.72757749 L14.8376658,4.72757749 Z"
                          fill="#FFBF36"
                        ></path>
                      </g>
                    </g>
                  </svg>
                ) : (
                  // 收起的文件夹图标（原来的 file-close.svg）
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                      <rect fill="#D8D8D8" opacity="0" x="0" y="0" width="16" height="16"></rect>
                      <g
                        transform="translate(0.900000, 2.090000)"
                        fill="#FFBF36"
                        fillRule="nonzero"
                      >
                        <path d="M13.5228261,1.86522031 L7.34312772,1.86522031 C7.30188123,1.86535209 7.26230409,1.84894035 7.23325476,1.8196585 L5.64121399,0.227617729 C5.49577686,0.0813972612 5.29788792,-0.000563809941 5.09165489,0 L0.777173908,0 C0.348152347,0.000484756222 0.000481828582,0.348155281 0,0.777176843 L0,11.0358725 C0.00048183661,11.4648941 0.348152353,11.8125646 0.777173908,11.8130464 L13.5228261,11.8130464 C13.9518476,11.8125646 14.2995182,11.4648941 14.3,11.0358725 L14.3,2.64239423 C14.2995182,2.21337267 13.9518477,1.86570215 13.5228261,1.86522031 Z"></path>
                      </g>
                    </g>
                  </svg>
                )}
              </span>

              {/* 节点内容 */}
              <span
                className={cx('ant-tree-node-content-wrapper', {
                  'ant-tree-node-selected': isSelected,
                })}
                style={{
                  flex: 1,
                  padding: 0,
                  marginLeft: '-4px',
                  display: 'flex',
                  lineHeight: '32px',
                  fontSize: '14px',
                  color: isSelected ? '#0c62ff' : 'inherit',
                }}
              >
                <span
                  className="ant-tree-title"
                  style={{ flex: 1, display: 'flex', overflow: 'hidden', alignItems: 'center' }}
                >
                  {titleRender ? titleRender(node) : node.name}
                </span>
              </span>
            </div>
          );

          return nodeContent;
        })}
      </div>
    </div>
  );
};

export default React.memo(VirtualTree);
