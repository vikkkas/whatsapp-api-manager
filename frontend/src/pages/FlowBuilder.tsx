import { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { useParams, useNavigate } from 'react-router-dom';
import { flowAPI } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Sidebar from '@/components/flow/Sidebar';
import PropertiesPanel from '@/components/flow/PropertiesPanel';
import MessageNode from '@/components/flow/nodes/MessageNode';
import StartNode from '@/components/flow/nodes/StartNode';
import { DelayNode } from '@/components/flow/nodes/DelayNode';
import { ConditionNode } from '@/components/flow/nodes/ConditionNode';
import { ActionNode } from '@/components/flow/nodes/ActionNode';

const nodeTypes = {
  message: MessageNode,
  start: StartNode,
  delay: DelayNode,
  condition: ConditionNode,
  action: ActionNode,
};

const FlowBuilderContent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [flowName, setFlowName] = useState('');
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchFlow();
    }
  }, [id]);

  const fetchFlow = async () => {
    try {
      const flow = await flowAPI.get(id!);
      setFlowName(flow.name);
      
      if (flow.nodes && Array.isArray(flow.nodes) && flow.nodes.length > 0) {
        setNodes(flow.nodes);
        setEdges(flow.edges || []);
      } else {
        // Initialize with Start Node if empty
        setNodes([
          {
            id: 'start-node',
            type: 'start',
            position: { x: 100, y: 100 },
            data: { label: 'Start' },
          },
        ]);
      }
    } catch (error) {
      toast.error('Failed to load flow');
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ 
      ...params, 
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed }
    }, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      // check if the dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `node-${Date.now()}`,
        type,
        position,
        data: { label: `${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance],
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onNodesDelete = useCallback((deleted: Node[]) => {
    // Prevent deletion of start node
    const hasStartNode = deleted.some(node => node.type === 'start');
    if (hasStartNode) {
      toast.error('Cannot delete the Start node');
      return;
    }
    
    // If deleted node was selected, clear selection
    if (selectedNode && deleted.some(node => node.id === selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [selectedNode]);

  // Handle keyboard delete
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNode) {
        // Don't delete if typing in an input
        if ((event.target as HTMLElement).tagName === 'INPUT' || 
            (event.target as HTMLElement).tagName === 'TEXTAREA') {
          return;
        }
        
        // Prevent deletion of start node
        if (selectedNode.type === 'start') {
          toast.error('Cannot delete the Start node');
          return;
        }
        
        setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
        setSelectedNode(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, setNodes]);

  const handleNodeChange = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: newData };
        }
        return node;
      })
    );
    // Update selected node reference to keep panel in sync
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode((prev) => prev ? { ...prev, data: newData } : null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await flowAPI.update(id!, {
        nodes,
        edges,
      });
      toast.success('Flow saved successfully');
    } catch (error) {
      toast.error('Failed to save flow');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="h-16 border-b flex items-center justify-between px-6 bg-white z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/flows')} className="hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{flowName || 'Flow Builder'}</h1>
            <p className="text-xs text-gray-500">Auto-saved 2 mins ago</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} className="bg-black text-white hover:bg-gray-800" disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Flow
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Palette */}
        <Sidebar />

        {/* Canvas */}
        <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodesDelete={onNodesDelete}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={{ type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }}
            fitView
            className="bg-gray-50"
          >
            <Background color="#e5e7eb" gap={20} />
            <Controls className="bg-white border-gray-200 shadow-sm" />
          </ReactFlow>
        </div>

        {/* Properties Panel */}
        {selectedNode && (
          <PropertiesPanel
            node={selectedNode}
            onChange={handleNodeChange}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
};

const FlowBuilder = () => (
  <ReactFlowProvider>
    <FlowBuilderContent />
  </ReactFlowProvider>
);

export default FlowBuilder;
