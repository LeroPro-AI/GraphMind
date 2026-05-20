import React, { useEffect, useRef, useState } from 'react';
import { renderToString } from 'react-dom/server';
import * as d3 from 'd3';
import { Node, Link, GraphData, NodeType } from '../types';
import { useSettings } from '../context/SettingsContext';
import { Graph3DCanvas } from './Graph3DCanvas';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Grid, 
  Network, 
  Orbit, 
  GitFork,
  Sliders,
  Sparkles,
  Info,
  User, MapPin, Calendar, Key, Lightbulb, HelpCircle, 
  Building, Dna, Gem, Laptop, BookOpen, Settings2, Target, 
  Search, Hourglass, Shield, BarChart, Scale, Flame, Ruler, Crown
} from 'lucide-react';

export const NODE_COLORS: Record<NodeType, string> = {
  person: '#f5c842',
  location: '#4ecdc4',
  event: '#ff6b6b',
  object: '#a78bfa',
  concept: '#fb923c',
  other: '#94a3b8',
  organization: '#3b82f6',
  species: '#10b981',
  artifact: '#ec4899',
  technology: '#06b6d4',
  theme: '#8b5cf6',
  process: '#f97316',
  goal: '#eab308',
  evidence: '#ef4444',
  timeline: '#6366f1',
  faction: '#f43f5e',
  data: '#2dd4bf',
  law: '#475569',
  myth: '#d946ef',
  theory: '#84cc16',
  role: '#a855f7'
};

export const NODE_ICONS: Record<NodeType, React.FC<any>> = {
  person: User,
  location: MapPin,
  event: Calendar,
  object: Key,
  concept: Lightbulb,
  other: HelpCircle,
  organization: Building,
  species: Dna,
  artifact: Gem,
  technology: Laptop,
  theme: BookOpen,
  process: Settings2,
  goal: Target,
  evidence: Search,
  timeline: Hourglass,
  faction: Shield,
  data: BarChart,
  law: Scale,
  myth: Flame,
  theory: Ruler,
  role: Crown
};

// Larger size scales to accommodate emojis clearly inside the node bubbles
const NODE_SIZES = {
  small: { r: 12, labelOffset: 18, degreeScale: 1 },
  medium: { r: 16, labelOffset: 24, degreeScale: 1.5 },
  large: { r: 22, labelOffset: 32, degreeScale: 2 }
};

interface GraphCanvasProps {
  data: GraphData;
  onNodeClick?: (node: Node) => void;
  isEditing?: boolean;
  onAddLink?: (sourceId: string, targetId: string) => void;
  onDeleteLink?: (sourceId: string, targetId: string) => void;
  layout?: 'force' | 'circular' | 'tree' | 'grid' | '3d';
  setLayout?: (layout: 'force' | 'circular' | 'tree' | 'grid' | '3d') => void;
  timelineStep?: number | null;
  setTimelineStep?: (step: number | null) => void;
  isPlaying?: boolean;
  setIsPlaying?: (playing: boolean) => void;
  isMultiSelectMode?: boolean;
  selectedNodeIds?: string[];
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({ 
  data, 
  onNodeClick, 
  isEditing, 
  onAddLink, 
  onDeleteLink,
  layout: propLayout,
  setLayout: propSetLayout,
  timelineStep: propTimelineStep,
  setTimelineStep: propSetTimelineStep,
  isPlaying: propIsPlaying,
  setIsPlaying: propSetIsPlaying,
  isMultiSelectMode = false,
  selectedNodeIds = []
}) => {
  const { settings } = useSettings();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const linkInitiatorRef = useRef<string | null>(null);
  const fittedDatasetRef = useRef<string | null>(null);

  // Position persistent cache and fingerprint check to lock graph positions
  const nodePositionsRef = useRef<Record<string, { x: number, y: number, fx: number | null, fy: number | null }>>({});
  const lastGraphFingerprintRef = useRef<string | null>(null);

  const currentFingerprint = `${data.title || ''}-${(data.nodes || []).length}-${(data.links || []).length}`;
  if (lastGraphFingerprintRef.current !== currentFingerprint) {
    nodePositionsRef.current = {};
    lastGraphFingerprintRef.current = currentFingerprint;
  }
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // Layout states: 'force' | 'circular' | 'tree' | 'grid' | '3d'
  const [localLayout, setLocalLayout] = useState<'force' | 'circular' | 'tree' | 'grid' | '3d'>('force');
  const layout = propLayout !== undefined ? propLayout : localLayout;
  const setLayout: React.Dispatch<React.SetStateAction<'force' | 'circular' | 'tree' | 'grid' | '3d'>> = propSetLayout !== undefined ? (propSetLayout as any) : setLocalLayout;
  
  // Timeline sequence animation states
  const [localTimelineStep, setLocalTimelineStep] = useState<number | null>(null);
  const timelineStep = propTimelineStep !== undefined ? propTimelineStep : localTimelineStep;
  const setTimelineStep: React.Dispatch<React.SetStateAction<number | null>> = propSetTimelineStep !== undefined ? (propSetTimelineStep as any) : setLocalTimelineStep;

  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const isPlaying = propIsPlaying !== undefined ? propIsPlaying : localIsPlaying;
  const setIsPlaying: React.Dispatch<React.SetStateAction<boolean>> = propSetIsPlaying !== undefined ? (propSetIsPlaying as any) : setLocalIsPlaying;

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Storyboard timeline playback logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && timelineStep !== null) {
      if (timelineStep >= data.nodes.length) {
        setIsPlaying(false);
      } else {
        timer = setInterval(() => {
          setTimelineStep((prev) => {
            if (prev === null) return 1;
            if (prev >= data.nodes.length) {
              setIsPlaying(false);
              return prev;
            }
            return prev + 1;
          });
        }, 1500); // 1.5s per step
      }
    }
    return () => clearInterval(timer);
  }, [isPlaying, timelineStep, data.nodes.length]);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0 || !data || !data.nodes || layout === '3d') return;

    const svg = d3.select(svgRef.current);
    const width = dimensions.width;
    const height = dimensions.height;
    const isLight = settings.appearance.theme === 'light';
    
    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Temp link for dragging links manually
    const tempLink = g.append('line')
      .attr('stroke', 'rgba(255, 215, 0, 0.4)')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('visibility', 'hidden');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        
        // Hide labels below 0.6 zoom scale with clean transitions
        const currentScale = event.transform.k;
        const labelOpacity = currentScale < 0.6 ? 0 : 1;
        g.selectAll('.node text')
          .style('opacity', labelOpacity)
          .style('transition', 'opacity 0.25s ease-in-out');
      })
      .filter((event) => {
         return !linkInitiatorRef.current;
      });

    svg.call(zoom);

    // Arrow marker rules
    if (settings.appearance.showArrows) {
      svg.append('defs').append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 28) // Higher offset for larger circles
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', isLight ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)');

      svg.select('defs').append('marker')
        .attr('id', 'arrow-active')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 28)
        .attr('refY', 0)
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#ef4444');
    }

    // Filter data based on active Story Timeline playback step
    const rawNodes = data.nodes || [];
    const maxStep = rawNodes.length;
    const currentStepCount = timelineStep !== null ? Math.min(timelineStep, maxStep) : maxStep;
    
    const visibleRawNodes = rawNodes.slice(0, currentStepCount);
    const visibleIds = new Set(visibleRawNodes.map(n => n.id));

    const nodes = visibleRawNodes.map(d => {
      const cached = nodePositionsRef.current[d.id];
      if (cached) {
        return {
          ...d,
          x: cached.x,
          y: cached.y,
          fx: settings.physics.lockLayout ? cached.x : cached.fx,
          fy: settings.physics.lockLayout ? cached.y : cached.fy
        };
      }
      return { ...d };
    });
    const links = (data.links || [])
      .filter(l => {
        const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
        return visibleIds.has(s) && visibleIds.has(t);
      })
      .map(d => ({ ...d }));

    const degreeMap = new Map();
    links.forEach(l => {
      const sId = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const tId = typeof l.target === 'object' ? (l.target as any).id : l.target;
      degreeMap.set(sId, (degreeMap.get(sId) || 0) + 1);
      degreeMap.set(tId, (degreeMap.get(tId) || 0) + 1);
    });

    // Node count and sizing scaling
    const totalNodeCount = rawNodes.length;
    let activeSizeSetting = settings.appearance.nodeSize;
    if (totalNodeCount > 20) {
      activeSizeSetting = 'small';
    }
    const nodeConf = NODE_SIZES[activeSizeSetting];
    const isHighlyDense = totalNodeCount > 35;
    const sizeMultiplier = isHighlyDense ? 0.6 : 1.0;

    const getNodeRadius = (d: any) => {
      const baseR = nodeConf.r + Math.min((degreeMap.get(d.id) || 0) * nodeConf.degreeScale, 12);
      return baseR * sizeMultiplier;
    };

    // Compute static layout positions if not dynamic force layout
    if (layout === 'circular') {
      const radius = Math.min(width, height) * 0.35;
      nodes.forEach((node: any, i) => {
        const angle = (i / nodes.length) * 2 * Math.PI;
        node.x = width / 2 + radius * Math.cos(angle);
        node.y = height / 2 + radius * Math.sin(angle);
        node.fx = node.x;
        node.fy = node.y;
      });
    } else if (layout === 'grid') {
      const cols = Math.ceil(Math.sqrt(nodes.length));
      const rows = Math.ceil(nodes.length / cols);
      const cellWidth = width / (cols + 1);
      const cellHeight = height / (rows + 1);
      nodes.forEach((node: any, i) => {
        const colidx = i % cols;
        const rowidx = Math.floor(i / cols);
        node.x = cellWidth * (colidx + 1);
        node.y = cellHeight * (rowidx + 1);
        node.fx = node.x;
        node.fy = node.y;
      });
    } else if (layout === 'tree') {
      const levels: Record<string, number> = {};
      const visited = new Set<string>();
      const queue: string[] = [];
      
      if (nodes.length > 0) {
        const startId = nodes[0].id;
        queue.push(startId);
        levels[startId] = 0;
        visited.add(startId);
        
        while (queue.length > 0) {
          const current = queue.shift()!;
          const currentLevel = levels[current];
          links.forEach((l: any) => {
            const s = typeof l.source === 'object' ? l.source.id : l.source;
            const t = typeof l.target === 'object' ? l.target.id : l.target;
            if (s === current && !visited.has(t)) {
              visited.add(t);
              levels[t] = currentLevel + 1;
              queue.push(t);
            } else if (t === current && !visited.has(s)) {
              visited.add(s);
              levels[s] = currentLevel + 1;
              queue.push(s);
            }
          });
        }
      }
      
      nodes.forEach((n: any) => {
        if (levels[n.id] === undefined) {
          levels[n.id] = 0;
        }
      });

      const nodesByLevel: Record<number, any[]> = {};
      nodes.forEach((n: any) => {
        const lvl = levels[n.id];
        if (!nodesByLevel[lvl]) nodesByLevel[lvl] = [];
        nodesByLevel[lvl].push(n);
      });

      const levelKeys = Object.keys(nodesByLevel).map(Number).sort((a, b) => a - b);
      const numLevels = levelKeys.length;
      const levelHeight = height / (numLevels + 1);

      levelKeys.forEach((lvl, rowIdx) => {
        const rowNodes = nodesByLevel[lvl];
        const rowWidth = width / (rowNodes.length + 1);
        rowNodes.forEach((n: any, colIdx) => {
          n.x = rowWidth * (colIdx + 1);
          n.y = levelHeight * (rowIdx + 1);
          n.fx = n.x;
          n.fy = n.y;
        });
      });
    }

    // Force simulation configurations with robust density solutions
    let repulsion = settings.physics.repulsionStrength > -400 ? -400 : settings.physics.repulsionStrength;
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      repulsion = repulsion * 1.2;
    }

    const linkDist = Math.max(settings.physics.linkDistance, 120);

    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(linkDist).strength(0.5))
      .force('charge', d3.forceManyBody().strength(repulsion))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => {
        const nodeRad = getNodeRadius(d);
        const labelLength = d.label ? d.label.length : 0;
        return nodeRad + labelLength * 4;
      }));

    if (settings.physics.autoFreeze || layout !== 'force') {
      simulation.alphaDecay(0.06); // Faster settle for static/frozen layouts
    }

    const linkLayer = g.append('g').selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d: any) => {
        if (d.diffStatus === 'added') return '#22c55e';
        if (d.diffStatus === 'removed') return '#ef4444';
        if (d.diffStatus === 'modified') return '#3b82f6';
        return isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255, 255, 255, 0.08)';
      })
      .attr('stroke-width', (d: any) => {
        if (d.diffStatus === 'added' || d.diffStatus === 'modified') return 4;
        if (d.diffStatus === 'removed') return 2;
        return isEditing ? 8 : settings.appearance.linkThickness;
      })
      .attr('stroke-dasharray', (d: any) => {
        if (d.diffStatus === 'removed') return '4,4';
        return null;
      })
      .attr('stroke-opacity', (d: any) => {
        if (d.diffStatus === 'removed') return 0.6;
        if (d.diffStatus === 'added' || d.diffStatus === 'modified') return 1;
        return isEditing ? 0.01 : 1;
      })
      .attr('class', 'graph-link')
      .attr('marker-end', settings.appearance.showArrows ? 'url(#arrow)' : null)
      .style('cursor', isEditing ? 'pointer' : 'move')
      .on('mouseover', function() {
        if (isEditing) {
          d3.select(this).attr('stroke', '#ef4444').attr('stroke-opacity', 0.5).attr('marker-end', 'url(#arrow-active)');
        }
      })
      .on('mouseout', function(event, d: any) {
        if (isEditing) {
          const origStroke = d.diffStatus === 'added' ? '#22c55e' :
                             d.diffStatus === 'removed' ? '#ef4444' :
                             d.diffStatus === 'modified' ? '#3b82f6' :
                             (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255, 255, 255, 0.08)');
          const origOpacity = d.diffStatus === 'removed' ? 0.6 :
                              (d.diffStatus === 'added' || d.diffStatus === 'modified') ? 1 : 0.01;
          d3.select(this).attr('stroke', origStroke).attr('stroke-opacity', origOpacity).attr('marker-end', settings.appearance.showArrows ? 'url(#arrow)' : null);
        }
      })
      .on('click', (event, d: any) => {
        if (isEditing && onDeleteLink) {
          event.stopPropagation();
          onDeleteLink(d.source.id, d.target.id);
        }
      });

    const linkVisibleLayer = isEditing ? g.append('g').selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d: any) => {
        if (d.diffStatus === 'added') return '#22c55e';
        if (d.diffStatus === 'removed') return '#ef4444';
        if (d.diffStatus === 'modified') return '#3b82f6';
        return isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255, 255, 255, 0.08)';
      })
      .attr('stroke-width', (d: any) => {
        if (d.diffStatus === 'added' || d.diffStatus === 'modified') return 3;
        if (d.diffStatus === 'removed') return 2;
        return settings.appearance.linkThickness;
      })
      .attr('stroke-dasharray', (d: any) => {
        if (d.diffStatus === 'removed') return '4,4';
        return null;
      })
      .attr('pointer-events', 'none')
      : null;

    const linkLabelLayer = g.append('g').selectAll('text')
      .data(links)
      .join('text')
      .attr('fill', isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255, 255, 255, 0.23)')
      .attr('font-size', '8px')
      .attr('letter-spacing', '1.5px')
      .attr('text-anchor', 'middle')
      .attr('font-family', '"Space Mono", monospace')
      .attr('pointer-events', 'none')
      .text((d: any) => (d.label || '').toUpperCase());

    const nodeLayer = g.append('g').selectAll('.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .call(d3.drag<any, any>()
        .on('start', (event, d) => {
          if (event.sourceEvent.shiftKey && isEditing) {
            linkInitiatorRef.current = d.id;
            tempLink.attr('visibility', 'visible')
              .attr('x1', d.x)
              .attr('y1', d.y)
              .attr('x2', d.x)
              .attr('y2', d.y);
          } else {
            dragStarted(event, d);
          }
        })
        .on('drag', (event, d) => {
          if (linkInitiatorRef.current) {
            const transform = d3.zoomTransform(svg.node() as any);
            const mouseX = (event.sourceEvent.offsetX - transform.x) / transform.k;
            const mouseY = (event.sourceEvent.offsetY - transform.y) / transform.k;
            tempLink.attr('x2', mouseX).attr('y2', mouseY);
          } else {
            dragged(event, d);
          }
        })
        .on('end', (event, d) => {
          if (linkInitiatorRef.current) {
            tempLink.attr('visibility', 'hidden');
            const targetElement = (event.sourceEvent.target as HTMLElement)?.closest('.node');
            const target = targetElement ? d3.select(targetElement).datum() as any : null;
            if (target && target.id !== d.id && onAddLink) {
              onAddLink(d.id, target.id);
            }
            linkInitiatorRef.current = null;
          } else {
            dragEnded(event, d);
          }
        })
      )
      .on('click', (event, d) => {
        if (onNodeClick) onNodeClick(d as Node);
      });

    // Background Bubble Frame using custom sizing
    nodeLayer.append('circle')
      .attr('r', (d: any) => getNodeRadius(d))
      .attr('fill', (d: any) => {
        if (d.diffStatus === 'added') return isLight ? '#dcfce7' : '#14532d'; // green-100 / green-900
        if (d.diffStatus === 'removed') return isLight ? '#fee2e2' : '#7f1d1d'; // red-100 / red-900
        if (d.diffStatus === 'modified') return isLight ? '#e0f2fe' : '#0c4a6e'; // sky-100 / sky-950
        return d.customColor || NODE_COLORS[d.type] || NODE_COLORS.other;
      })
      .attr('fill-opacity', (d: any) => {
        if (d.diffStatus === 'removed') return 0.4;
        return 0.85;
      })
      .attr('stroke', (d: any) => {
        if (d.diffStatus === 'added') return '#22c55e';
        if (d.diffStatus === 'removed') return '#ef4444';
        if (d.diffStatus === 'modified') return '#3b82f6';
        return d.customColor || NODE_COLORS[d.type] || NODE_COLORS.other;
      })
      .attr('stroke-opacity', (d: any) => {
        if (d.diffStatus === 'removed') return 0.5;
        return 0.85;
      })
      .attr('stroke-width', (d: any) => {
        if (d.diffStatus && d.diffStatus !== 'identical') return 5;
        return 3;
      })
      .attr('stroke-dasharray', (d: any) => {
        if (d.diffStatus === 'removed') return '3,3';
        return null;
      });

    // Beautiful Selection Outer Ring Frame
    nodeLayer.append('circle')
      .attr('r', (d: any) => getNodeRadius(d) + 6)
      .attr('fill', 'none')
      .attr('stroke', '#f59e0b') // Amber/Yellow selection stroke
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-opacity', (d: any) => (selectedNodeIds && selectedNodeIds.includes(d.id)) ? 1 : 0)
      .attr('class', 'selection-ring');

    // ICON INSIDE BUBBLE
    nodeLayer.append('foreignObject')
      .attr('x', (d: any) => {
         const nodeRad = getNodeRadius(d);
         const size = nodeRad * 1.6;
         return -size / 2;
      })
      .attr('y', (d: any) => {
         const nodeRad = getNodeRadius(d);
         const size = nodeRad * 1.6;
         return -size / 2;
      })
      .attr('width', (d: any) => getNodeRadius(d) * 1.6)
      .attr('height', (d: any) => getNodeRadius(d) * 1.6)
      .style('pointer-events', 'none')
      .append('xhtml:div')
      .style('width', '100%')
      .style('height', '100%')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('justify-content', 'center')
      .style('color', isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)')
      .html((d: any) => {
        const nodeRad = getNodeRadius(d);
        if (d.customIcon) {
          const fontSize = nodeRad * 0.95;
          return `<span style="font-size: ${fontSize}px; line-height: 1;">${d.customIcon}</span>`;
        }
        const Icon = NODE_ICONS[d.type] || NODE_ICONS.other;
        return renderToString(<Icon size="75%" strokeWidth={2.5} color="currentColor" />);
      });

    // Label under or over the node bubble with zoom-based visibility fade on initialization
    const initialScale = d3.zoomTransform(svg.node() as any).k;

    nodeLayer.append('text')
      .attr('dy', (d: any) => {
        const nodeRad = getNodeRadius(d);
        return -(nodeRad + 10);
      })
      .attr('text-anchor', 'middle')
      .attr('fill', isLight ? '#0f0f13' : 'rgba(255, 255, 255, 0.85)')
      .attr('font-weight', '500')
      .attr('font-size', `${settings.appearance.labelSize}px`)
      .attr('letter-spacing', '0.4px')
      .attr('font-family', '"Inter", sans-serif')
      .style('pointer-events', 'none')
      .style('opacity', initialScale < 0.6 ? 0 : 1)
      .style('transition', 'opacity 0.25s ease-in-out')
      .text((d: any) => d.label);

    simulation.on('tick', () => {
      // Save current coordinates in the persistent ref cache
      nodes.forEach((d: any) => {
        nodePositionsRef.current[d.id] = {
          x: d.x,
          y: d.y,
          fx: d.fx !== undefined ? d.fx : null,
          fy: d.fy !== undefined ? d.fy : null
        };
      });

      linkLayer
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      if (linkVisibleLayer) {
        linkVisibleLayer
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);
      }

      linkLabelLayer
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

      nodeLayer.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Auto-fit function inside useEffect hook
    const fitToViewport = (smooth = true) => {
      if (nodes.length === 0) return;

      const minX = d3.min(nodes, (d: any) => d.x) ?? 0;
      const maxX = d3.max(nodes, (d: any) => d.x) ?? width;
      const minY = d3.min(nodes, (d: any) => d.y) ?? 0;
      const maxY = d3.max(nodes, (d: any) => d.y) ?? height;

      const padding = 40;
      const graphWidth = (maxX - minX) || 1;
      const graphHeight = (maxY - minY) || 1;

      let scale = Math.min(
        (width - padding * 2) / graphWidth,
        (height - padding * 2) / graphHeight
      );

      scale = Math.max(0.15, Math.min(2.0, scale));

      const isMobileDevice = window.innerWidth < 768;
      if (isMobileDevice) {
        scale = scale * 0.9;
      }

      const graphCenterX = (minX + maxX) / 2;
      const graphCenterY = (minY + maxY) / 2;

      const tx = width / 2 - scale * graphCenterX;
      const ty = height / 2 - scale * graphCenterY;

      const transform = d3.zoomIdentity.translate(tx, ty).scale(scale);

      // Trigger standard zoom scale opacity check so that labels toggle immediately
      const labelOpacity = scale < 0.6 ? 0 : 1;
      g.selectAll('.node text')
        .style('opacity', labelOpacity)
        .style('transition', 'opacity 0.25s ease-in-out');

      if (smooth) {
        svg.transition()
          .duration(750)
          .ease(d3.easeCubicOut)
          .call(zoom.transform, transform);
      } else {
        svg.call(zoom.transform, transform);
      }
    };

    simulation.on('end', () => {
      const datasetFingerprint = `${data.nodes.length}-${data.links.length}-${data.title}-${layout}`;
      if (settings.physics.autoFitOnGenerate !== false && fittedDatasetRef.current !== datasetFingerprint) {
        fittedDatasetRef.current = datasetFingerprint;
        fitToViewport(true);
      }

      // Automatically lock all node positions if Lock Layout is ON
      if (settings.physics.lockLayout) {
        nodes.forEach((d: any) => {
          d.fx = d.x;
          d.fy = d.y;
          nodePositionsRef.current[d.id] = {
            x: d.x,
            y: d.y,
            fx: d.x,
            fy: d.y
          };
        });
      }
    });

    function dragStarted(event: any, d: any) {
      if (layout !== 'force') return; // Cannot drag to reposition logic on non-force layouts
      if (!settings.physics.lockLayout) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
      }
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      if (layout !== 'force') return;
      d.fx = event.x;
      d.fy = event.y;

      // Keep positions ref cache updated in real-time
      nodePositionsRef.current[d.id] = {
        x: event.x,
        y: event.y,
        fx: settings.physics.lockLayout ? event.x : null,
        fy: settings.physics.lockLayout ? event.y : null
      };
    }

    function dragEnded(event: any, d: any) {
      if (layout !== 'force') return;
      if (!settings.physics.lockLayout) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      } else {
        d.fx = d.x;
        d.fy = d.y;
        nodePositionsRef.current[d.id] = {
          x: d.x,
          y: d.y,
          fx: d.x,
          fy: d.y
        };
      }
    }

    return () => {
      simulation.stop();
    };
  }, [data, layout, timelineStep, isEditing, onAddLink, onDeleteLink, dimensions.width, dimensions.height, settings, selectedNodeIds]);

  const handleTimelineReset = () => {
    setTimelineStep(null);
    setIsPlaying(false);
  };

  const handleTimelineStart = () => {
    setTimelineStep(1);
    setIsPlaying(true);
  };

  return (
    <div ref={containerRef} className={`w-full h-full relative overflow-hidden flex flex-col ${settings.appearance.theme === 'light' ? 'bg-gray-50' : 'bg-[#0a0a0f]'}`} id="graph-viewport">
      
      {/* SVG Canvas Area */}
      <div 
        className="absolute inset-0 transition-opacity duration-500 ease-in-out"
        style={{ opacity: layout === '3d' ? 0 : 1, pointerEvents: layout === '3d' ? 'none' : 'auto' }}
      >
        <svg ref={svgRef} className="w-full h-full cursor-move" />
      </div>

      {/* Three.js 3D Canvas Area */}
      {layout === '3d' && (
        <div 
          className="absolute inset-0 transition-opacity duration-500 ease-in-out"
          style={{ opacity: layout === '3d' ? 1 : 0, pointerEvents: layout === '3d' ? 'auto' : 'none' }}
        >
          <Graph3DCanvas 
            data={data}
            onNodeClick={onNodeClick}
            theme={settings.appearance.theme}
            timelineStep={timelineStep}
            selectedNodeIds={selectedNodeIds}
          />
        </div>
      )}

      {/* Manual Status Indicator */}
      <div className={`absolute bottom-4 right-4 text-[9px] uppercase tracking-[0.2em] pointer-events-none text-right z-10 ${settings.appearance.theme === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>
        {layout === '3d' ? (
          <div>
            3D Quantum Mode Active<br />
            Drag to Rotate · Scroll to Zoom
          </div>
        ) : isEditing ? (
          <div>
            Shift + Drag Node to Link<br />
            Click link to delete
          </div>
        ) : (
          "Drag to pan · Scroll to zoom"
        )}
      </div>
    </div>
  );
};
