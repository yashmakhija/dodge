import { useEffect, useMemo } from 'react'
import Breadcrumb from '@/components/Breadcrumb'
import ChatPanel from '@/components/ChatPanel'
import GraphPanel from '@/components/GraphPanel'
import NodeDetail from '@/components/NodeDetail'
import { useGraphStore } from '@/store/graphStore'
import { useChatStore } from '@/store/chatStore'
import { useHighlightedNodes } from '@/hooks/useHighlightedNodes'

export default function App() {
  const {
    nodes, edges, loading, error, selectedNode, expandedNodes, traceNodeIds, lastExpandedGroup,
    fetchOverview, selectNode, clearSelection, expandNode,
  } = useGraphStore()

  const { messages, loading: chatLoading, sendMessage, clearHistory } = useChatStore()

  useEffect(() => { fetchOverview() }, [fetchOverview])

  const graphNodeIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes])
  const highlightedNodes = useHighlightedNodes(messages, graphNodeIds)

  return (
    <div className="h-screen flex flex-col">
      <Breadcrumb />
      <div className="flex-1 flex overflow-hidden p-2 gap-2 bg-muted/40">
        <div className="flex-1 relative min-w-0 overflow-hidden rounded-md bg-card border">
          <GraphPanel
            nodes={nodes}
            edges={edges}
            loading={loading}
            selectedNode={selectedNode}
            expandedNodes={expandedNodes}
            highlightedNodes={highlightedNodes}
            traceNodeIds={traceNodeIds}
            lastExpandedGroup={lastExpandedGroup}
            onNodeClick={selectNode}
            onNodeExpand={expandNode}
          />
          {selectedNode && (
            <NodeDetail
              node={selectedNode}
              onClose={clearSelection}
              onExpand={expandNode}
              isExpanded={expandedNodes.has(selectedNode.id)}
            />
          )}
          {error && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-destructive/10 border border-destructive/20 rounded text-destructive text-[11px] z-30">
              {error}
            </div>
          )}
        </div>
        <div className="relative z-10 shrink-0">
          <ChatPanel
            messages={messages}
            loading={chatLoading}
            onSend={sendMessage}
            onClear={clearHistory}
          />
        </div>
      </div>
    </div>
  )
}
