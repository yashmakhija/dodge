import Breadcrumb from '@/components/Breadcrumb'
import ChatPanel from '@/components/ChatPanel'
import GraphPanel from '@/components/GraphPanel'
import NodeDetail from '@/components/NodeDetail'
import { useChat } from '@/hooks/useChat'
import { useGraph } from '@/hooks/useGraph'

export default function App() {
  const graph = useGraph()
  const chat = useChat()

  return (
    <div className="h-screen flex flex-col bg-background">
      <Breadcrumb />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative min-w-0 bg-muted/30">
          <GraphPanel
            nodes={graph.nodes}
            edges={graph.edges}
            loading={graph.loading}
            selectedNode={graph.selectedNode}
            expandedNodes={graph.expandedNodes}
            onNodeClick={graph.selectNode}
            onNodeExpand={graph.expandNode}
          />

          {graph.selectedNode && (
            <NodeDetail
              node={graph.selectedNode}
              onClose={graph.clearSelection}
              onExpand={graph.expandNode}
              isExpanded={graph.expandedNodes.has(graph.selectedNode.id)}
            />
          )}

          {graph.error && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-xs z-30">
              {graph.error}
            </div>
          )}
        </div>

        <ChatPanel
          messages={chat.messages}
          loading={chat.loading}
          onSend={chat.sendMessage}
        />
      </div>
    </div>
  )
}
