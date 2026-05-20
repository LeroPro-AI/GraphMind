import React, { useEffect, useRef, useState } from 'react';
import { Node, Link, GraphData, NodeType } from '../types';
import { Loader2 } from 'lucide-react';

declare global {
  interface Window {
    THREE: any;
    ForceGraph3D?: any;
  }
}

interface Graph3DCanvasProps {
  data: GraphData;
  onNodeClick?: (node: Node) => void;
  theme?: 'dark' | 'light';
  timelineStep?: number | null;
  selectedNodeIds?: string[];
}

const NODE_COLORS: Record<string, string> = {
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

export const Graph3DCanvas: React.FC<Graph3DCanvasProps> = ({
  data,
  onNodeClick,
  theme = 'dark',
  timelineStep = null,
  selectedNodeIds = []
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Dynamic sizing
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Store graphInstance and degrees dictionary inside refs for asynchronous lookup
  const graphInstanceRef = useRef<any>(null);
  const degreesRef = useRef<Record<string, number>>({});

  // Load Three.js and 3d-force-graph dynamically from CDN
  useEffect(() => {
    if (window.ForceGraph3D && window.THREE) {
      setIsScriptLoaded(true);
      return;
    }

    const loadScript = (src: string, id: string, globalName: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if ((window as any)[globalName]) {
          resolve();
          return;
        }

        const existing = document.getElementById(id) as HTMLScriptElement | null;
        if (existing) {
          let attempts = 0;
          const interval = setInterval(() => {
            if ((window as any)[globalName]) {
              clearInterval(interval);
              resolve();
            } else if (attempts > 120) { // 6 seconds timeout
              clearInterval(interval);
              reject(new Error(`Timeout waiting for library ${id} to load`));
            }
            attempts++;
          }, 50);
          return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.id = id;
        script.async = true;
        script.crossOrigin = 'anonymous'; // Enable proper cross-origin error metrics
        
        const handleLoad = () => {
          cleanup();
          let attempts = 0;
          const interval = setInterval(() => {
            if ((window as any)[globalName]) {
              clearInterval(interval);
              resolve();
            } else if (attempts > 30) { // Wait up to 1.5 seconds post-load for global registration
              clearInterval(interval);
              resolve();
            }
            attempts++;
          }, 50);
        };
        const handleError = () => {
          cleanup();
          reject(new Error(`Failed to load ${id}`));
        };
        const cleanup = () => {
          script.removeEventListener('load', handleLoad);
          script.removeEventListener('error', handleError);
        };
        
        script.addEventListener('load', handleLoad);
        script.addEventListener('error', handleError);
        document.body.appendChild(script);
      });
    };

    const loadSequential = async () => {
      try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'three-core-cdn', 'THREE');
        await loadScript('https://unpkg.com/3d-force-graph@1.73.0/dist/3d-force-graph.min.js', '3d-force-graph-cdn', 'ForceGraph3D');
        setIsScriptLoaded(true);
      } catch (err: any) {
        setLoadError(err.message || 'Error loading 3D rendering libraries.');
      }
    };

    loadSequential();
  }, []);

  // Monitor element sizing of the parent viewport and update graph dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
        if (graphInstanceRef.current) {
          graphInstanceRef.current.width(width).height(height);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 3d-force-graph Core Instance Initialization
  useEffect(() => {
    if (!isScriptLoaded || !mountRef.current || dimensions.width === 0 || dimensions.height === 0 || !window.ForceGraph3D) return;

    // Create container element for the 3D Graph instance
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    mountRef.current.appendChild(container);

    const ForceGraph3D = window.ForceGraph3D;
    
    // Initialize 3D Force Graph of CDN library
    const Graph = ForceGraph3D()(container)
      .width(dimensions.width)
      .height(dimensions.height)
      .backgroundColor('#0a0a0f') // Dark theme background
      .showNavInfo(false) // Disable built-in navigation text clutter
      // Links Configuration
      .linkColor(() => 'rgba(255, 255, 255, 0.25)')
      .linkDirectionalParticles(2)
      .linkDirectionalParticleSpeed(0.005)
      .linkDirectionalParticleColor(() => '#ffffff')
      .linkDirectionalParticleWidth(1.5)
      // Custom HTML Tooltip matching 2D interface design
      .nodeLabel((node: any) => {
        const nodeType = (node.type || '').toLowerCase();
        const typeColor = NODE_COLORS[nodeType] || NODE_COLORS.other;
        return `
          <div style="background: rgba(9, 9, 15, 0.95); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 10px; max-width: 250px; text-align: left; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.5); font-weight: 500;">
            <div style="font-weight: bold; color: #ffffff; font-size: 11px; margin-bottom: 3px;">${node.label || 'Untitled Entity'}</div>
            <div style="font-size: 9px; font-family: monospace; text-transform: uppercase; color: ${typeColor}; margin-bottom: 5px; letter-spacing: 1px;">${node.type || 'other'}</div>
            ${node.description ? `<div style="color: rgba(255,255,255,0.7); font-size: 9.5px; line-height: 1.4; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 5px; margin-top: 5px; font-weight: 300;">${node.description}</div>` : ''}
          </div>
        `;
      })
      // Custom 3D Object containing both Sphere (radius by degree) and visible Text Label
      .nodeThreeObject((node: any) => {
        const THREE = window.THREE;
        const group = new THREE.Group();

        // 1. Sphere Geometry for Node
        const degree = degreesRef.current[node.id] || 0;
        const radius = 4 + Math.min(degree * 1.5, 8);
        
        const nodeType = (node.type || '').toLowerCase();
        const colorHex = NODE_COLORS[nodeType] || NODE_COLORS.other;
        const color = new THREE.Color(colorHex);
        
        const geom = new THREE.SphereGeometry(radius, 16, 16);
        const mat = new THREE.MeshLambertMaterial({ 
          color: color,
          emissive: color,
          emissiveIntensity: 0.4, // Glow aspect
          transparent: true,
          opacity: 0.95
        });
        const sphere = new THREE.Mesh(geom, mat);
        group.add(sphere);
        
        const isSelected = selectedNodeIds && selectedNodeIds.includes(node.id);
        if (isSelected) {
          const outerGeom = new THREE.SphereGeometry(radius + 3, 12, 12);
          const outerMat = new THREE.MeshBasicMaterial({
            color: 0xf59e0b, // Yellow/Amber
            wireframe: true,
            transparent: true,
            opacity: 0.7
          });
          const outerSphere = new THREE.Mesh(outerGeom, outerMat);
          group.add(outerSphere);
        }
        
        // 2. Headings Canvas Label (Billboard text sprite showing name)
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.font = 'bold 20px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          const labelText = node.label || 'Untitled';
          
          // Draw a background pill / capsule
          const textWidth = ctx.measureText(labelText).width;
          const boxWidth = Math.min(230, textWidth + 24);
          const boxHeight = 36;
          const x = 128 - boxWidth / 2;
          const y = 32 - boxHeight / 2;
          const radius_rect = 6;
          
          ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';
          ctx.strokeStyle = colorHex;
          ctx.lineWidth = 1.5;
          
          ctx.beginPath();
          ctx.moveTo(x + radius_rect, y);
          ctx.lineTo(x + boxWidth - radius_rect, y);
          ctx.quadraticCurveTo(x + boxWidth, y, x + boxWidth, y + radius_rect);
          ctx.lineTo(x + boxWidth, y + boxHeight - radius_rect);
          ctx.quadraticCurveTo(x + boxWidth, y + boxHeight, x + boxWidth - radius_rect, y + boxHeight);
          ctx.lineTo(x + radius_rect, y + boxHeight);
          ctx.quadraticCurveTo(x, y + boxHeight, x, y + boxHeight - radius_rect);
          ctx.lineTo(x, y + radius_rect);
          ctx.quadraticCurveTo(x, y, x + radius_rect, y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Fill label text color
          ctx.fillStyle = '#ffffff';
          ctx.fillText(labelText, 128, 32);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ 
          map: texture,
          transparent: true,
          opacity: 0.9,
          depthWrite: false
        });
        const sprite = new THREE.Sprite(spriteMat);
        // Position relative: right on top/above the node's geometry sphere
        sprite.position.set(0, radius + 8, 0); 
        // Adjust scale size of the sprite in 3D coordinate space safely
        sprite.scale.set(radius * 3 + 12, (radius * 3 + 12) / 4, 1);
        group.add(sprite);
        
        return group;
      })
      .onNodeClick((node: any) => {
        // Toggle Pin in multi-dimensional space utilizing fx, fy, fz
        if (node.fx !== undefined && node.fx !== null) {
          node.fx = null;
          node.fy = null;
          node.fz = null;
        } else {
          node.fx = node.x;
          node.fy = node.y;
          node.fz = node.z;
        }
        
        // Trigger select node callback
        if (onNodeClick) {
          onNodeClick(node);
        }
      });

    graphInstanceRef.current = Graph;

    // Orbit speed dynamics
    let isInteracting = false;
    let idleTimer: any = null;
    let angle = 0;
    const orbitRadius = 320;

    const resetIdle = () => {
      isInteracting = true;
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        isInteracting = false;
        // Reset seamless orbital transition
        const camPos = Graph.cameraPosition();
        angle = Math.atan2(camPos.x, camPos.z);
      }, 3000); // Orbit resumes after 3s of total mouse/scroll inactivity
    };

    container.addEventListener('mousedown', resetIdle);
    container.addEventListener('touchstart', resetIdle, { passive: true });
    container.addEventListener('wheel', resetIdle, { passive: true });

    // 3. Add 800 small star points in large sphere of radius 800
    const THREE = window.THREE;
    const scene = Graph.scene();
    
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 800;
    const starPositions = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 800 * Math.cbrt(Math.random());

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1,
      sizeAttenuation: false,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    });

    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);

    let animationFrameId: number;
    const tick = () => {
      // 1. Manage camera orbit motion when idle
      if (!isInteracting) {
        angle += 0.0012; // Extremely sleek and slow horizontal panning of coordinate space
        const camPos = Graph.cameraPosition();
        Graph.cameraPosition({
          x: orbitRadius * Math.sin(angle),
          y: camPos.y,
          z: orbitRadius * Math.cos(angle)
         });
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    // Initial positioning setup
    setTimeout(() => {
      Graph.cameraPosition({ x: 0, y: 0, z: orbitRadius });
    }, 120);

    // Destroy, detach and unbind on canvas toggle
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (idleTimer) clearTimeout(idleTimer);
      container.removeEventListener('mousedown', resetIdle);
      container.removeEventListener('touchstart', resetIdle);
      container.removeEventListener('wheel', resetIdle);

      if (scene && starField) {
        scene.remove(starField);
        starsGeometry.dispose();
        starsMaterial.dispose();
      }

      if (typeof Graph.destroy === 'function') {
        Graph.destroy();
      }
      mountRef.current?.removeChild(container);
      graphInstanceRef.current = null;
    };
  }, [isScriptLoaded]);

  // Dynamic Graph Nodes and Links State Updater
  useEffect(() => {
    const Graph = graphInstanceRef.current;
    if (!Graph || !isScriptLoaded) return;

    // Filter data based on active Story Timeline playback step
    const rawNodes = data.nodes || [];
    const maxStep = rawNodes.length;
    const currentStepCount = timelineStep !== null && timelineStep !== undefined ? Math.min(timelineStep, maxStep) : maxStep;
    
    const visibleRawNodes = rawNodes.slice(0, currentStepCount);
    const visibleIds = new Set(visibleRawNodes.map(n => n.id));
    
    // Calculate degrees from the full dataset so node sizes are stable
    const degrees: Record<string, number> = {};
    rawNodes.forEach(n => { degrees[n.id] = 0; });
    (data.links || []).forEach(l => {
      const sourceId = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const targetId = typeof l.target === 'object' ? (l.target as any).id : l.target;
      if (degrees[sourceId] !== undefined) degrees[sourceId]++;
      if (degrees[targetId] !== undefined) degrees[targetId]++;
    });
    
    // Save degrees to ref for nodeThreeObject lookup
    degreesRef.current = degrees;

    const clonedNodes = visibleRawNodes.map(node => ({ ...node }));
    const clonedLinks = (data.links || [])
      .filter(l => {
        const sourceId = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const targetId = typeof l.target === 'object' ? (l.target as any).id : l.target;
        return visibleIds.has(sourceId) && visibleIds.has(targetId);
      })
      .map(link => ({
        ...link,
        source: typeof link.source === 'object' ? (link.source as any).id : link.source,
        target: typeof link.target === 'object' ? (link.target as any).id : link.target
      }));

    Graph.graphData({ nodes: clonedNodes, links: clonedLinks });
    Graph.refresh();
  }, [isScriptLoaded, data, timelineStep, selectedNodeIds]);

  if (loadError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0f] text-red-400 p-8 text-center rounded">
        <p className="text-xs font-mono uppercase tracking-widest mb-2 font-bold">Signal Disrupted</p>
        <p className="text-xs opacity-60 max-w-sm">{loadError}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full select-none bg-[#0a0a0f] relative overflow-hidden flex items-center justify-center">
      {!isScriptLoaded && (
        <div className="absolute inset-x-0 z-30 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500 stroke-[1.5]" />
          <p className="text-[10px] tracking-widest text-white/40 font-mono uppercase animate-pulse">
            Configuring 3D Quantum Matrix...
          </p>
        </div>
      )}
      
      {/* 3D Force Graph Target Mounting Area */}
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
};
