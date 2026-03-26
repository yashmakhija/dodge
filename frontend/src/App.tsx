import { useEffect, useMemo, useState } from 'react'
import Breadcrumb from '@/components/Breadcrumb'
import ChatPanel from '@/components/ChatPanel'
import GraphPanel from '@/components/GraphPanel'
import NodeDetail from '@/components/NodeDetail'
import { useGraphStore } from '@/store/graphStore'
import { useChatStore } from '@/store/chatStore'
import { useHighlightedNodes } from '@/hooks/useHighlightedNodes'
import { Network, MessageSquare } from 'lucide-react'

export default function App() {
  const {
    nodes, edges, loading, error, selectedNode, expandedNodes, traceNodeIds, lastExpandedGroup,
    fetchOverview, selectNode, clearSelection, expandNode,
  } = useGraphStore()

  const { messages, loading: chatLoading, sendMessage, clearHistory } = useChatStore()

  useEffect(() => { fetchOverview() }, [fetchOverview])

  const graphNodeIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes])
  const highlightedNodes = useHighlightedNodes(messages, graphNodeIds)

  const [mobileTab, setMobileTab] = useState<'graph' | 'chat'>('graph')

  return (
    <div className="h-screen flex flex-col">
      <Breadcrumb />

      <div className="flex-1 flex overflow-hidden p-2 gap-2 bg-muted/40 max-md:flex-col max-md:p-0 max-md:gap-0">
        <div className={`flex-1 relative min-w-0 overflow-hidden rounded-md bg-card border max-md:rounded-none max-md:border-0 ${mobileTab !== 'graph' ? 'max-md:hidden' : ''}`}>
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

        <div className={`relative z-10 shrink-0 max-md:flex-1 max-md:min-h-0 ${mobileTab !== 'chat' ? 'max-md:hidden' : ''}`}>
          <ChatPanel
            messages={messages}
            loading={chatLoading}
            onSend={sendMessage}
            onClear={clearHistory}
          />
        </div>
      </div>

      <div className="hidden max-md:flex border-t bg-card shrink-0">
        <button
          onClick={() => setMobileTab('graph')}
          className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors cursor-pointer ${mobileTab === 'graph' ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          <Network className="h-4 w-4" />
          Graph
        </button>
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors cursor-pointer relative ${mobileTab === 'chat' ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          <MessageSquare className="h-4 w-4" />
          Chat
          {messages.length > 1 && mobileTab !== 'chat' && (
            <span className="absolute top-1.5 right-[calc(50%-2px)] w-2 h-2 bg-blue-500 rounded-full" />
          )}
        </button>
      </div>
    </div>
  )
}
