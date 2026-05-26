import { useState, useRef, useEffect } from 'react';
import { Plus, Minus, RotateCcw } from 'lucide-react';

export default function ASTVisualizer({ ast }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Reset zoom & pan when AST changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [ast]);

  if (!ast) {
    return (
      <div className="ast-empty">
        <span>No AST generated. Write code and check Output/AST tabs.</span>
      </div>
    );
  }

  // Layout algorithm: Calculate positions for each node recursively
  const buildLayout = (node, depth = 0, leftBoundary = 0, rightBoundary = 1000) => {
    if (!node) return null;

    const x = (leftBoundary + rightBoundary) / 2;
    const y = 60 + depth * 100;

    const childrenLayouts = [];
    const children = node.children || [];

    if (children.length > 0) {
      const segmentWidth = (rightBoundary - leftBoundary) / children.length;
      children.forEach((child, idx) => {
        const cLeft = leftBoundary + idx * segmentWidth;
        const cRight = cLeft + segmentWidth;
        const childLayout = buildLayout(child, depth + 1, cLeft, cRight);
        if (childLayout) {
          childrenLayouts.push(childLayout);
        }
      });
    }

    return {
      label: node.label || node.type || '',
      type: node.type || '',
      x,
      y,
      children: childrenLayouts,
    };
  };

  const layout = buildLayout(ast, 0, 50, 950);

  // Zoom & Pan Handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.15, 2.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.15, 0.4));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Flatten layout to lists of lines and nodes for easier SVG rendering
  const lines = [];
  const nodes = [];

  const traverseLayout = (item, parent = null) => {
    if (!item) return;
    if (parent) {
      lines.push({
        x1: parent.x,
        y1: parent.y,
        x2: item.x,
        y2: item.y,
        id: `${parent.x}-${parent.y}-${item.x}-${item.y}`,
      });
    }
    nodes.push(item);
    if (item.children) {
      item.children.forEach((child) => traverseLayout(child, item));
    }
  };

  traverseLayout(layout);

  return (
    <div
      className="ast-viz-container"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Zoom / Pan Toolbar */}
      <div className="ast-toolbar">
        <button className="ast-tool-btn" onClick={handleZoomIn} title="Zoom In">
          <Plus size={14} />
        </button>
        <button className="ast-tool-btn" onClick={handleZoomOut} title="Zoom Out">
          <Minus size={14} />
        </button>
        <button className="ast-tool-btn" onClick={handleReset} title="Reset View">
          <RotateCcw size={14} />
        </button>
        <span className="ast-zoom-label">{Math.round(zoom * 100)}%</span>
      </div>

      {/* Grid Pattern Background */}
      <div className="ast-grid-bg" />

      {/* SVG Canvas */}
      <svg className="ast-svg" width="100%" height="100%" viewBox="0 0 1000 600">
        <defs>
          {/* Glowing Shadow Filter for Nodes */}
          <filter id="glow-node" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Render Connections */}
          {lines.map((line) => (
            <line
              key={line.id}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              className="ast-edge"
            />
          ))}

          {/* Render Nodes */}
          {nodes.map((node, i) => (
            <g key={i} transform={`translate(${node.x}, ${node.y})`} className="ast-node-group">
              <circle
                r="30"
                className={`ast-node-circle ${
                  node.type === 'Program' ? 'node-program' :
                  node.type === 'Assign' ? 'node-assign' :
                  node.type === 'Var' ? 'node-var' :
                  node.type === 'Number' ? 'node-num' : 'node-default'
                }`}
                filter="url(#glow-node)"
              />
              <text
                textAnchor="middle"
                dy=".3em"
                className="ast-node-text"
              >
                {node.label.length > 12 ? node.label.substring(0, 10) + '..' : node.label}
              </text>
              <title>{node.label}</title>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
