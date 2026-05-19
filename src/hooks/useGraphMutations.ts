import React, { useState, useCallback } from 'react';
import { Node, Link, GraphData } from '../types';

export function useGraphMutations(
  graphData: GraphData | null, 
  setGraphData: React.Dispatch<React.SetStateAction<GraphData | null>>,
  setSelectedNode: (node: Node | null) => void
) {
  const handleUpdateNode = useCallback((updatedNode: Node) => {
    if (!graphData) return;
    const currentNodes = graphData.nodes || [];
    const newNodes = currentNodes.map(n => n.id === updatedNode.id ? updatedNode : n);
    setGraphData({
      ...graphData,
      nodes: newNodes
    });
    setSelectedNode(updatedNode);
  }, [graphData, setGraphData, setSelectedNode]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (!graphData) return;
    const currentNodes = graphData.nodes || [];
    const currentLinks = graphData.links || [];

    setGraphData({
      ...graphData,
      nodes: currentNodes.filter(n => n.id !== nodeId),
      links: currentLinks.filter(l => {
        const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
        return s !== nodeId && t !== nodeId;
      })
    });
    setSelectedNode(null);
  }, [graphData, setGraphData, setSelectedNode]);

  const handleAddNode = useCallback(() => {
    if (!graphData) {
      const initialNode = { id: 'core', label: 'Core Signal', type: 'concept' as const, description: 'Starting point of analysis.' };
      setGraphData({
        title: 'New Protocol',
        nodes: [initialNode],
        links: []
      });
      setSelectedNode(initialNode);
      return;
    }
    const currentNodes = graphData.nodes || [];
    const newNode: Node = {
      id: `node_${Math.random().toString(36).substr(2, 9)}`,
      label: 'New Entity',
      type: 'other',
      description: 'Modified neural trace.'
    };
    setGraphData({
      ...graphData,
      nodes: [...currentNodes, newNode]
    });
    setSelectedNode(newNode);
  }, [graphData, setGraphData, setSelectedNode]);

  const handleAddLink = useCallback((source: string, target: string) => {
    if (!graphData) return;
    const currentLinks = graphData.links || [];
    const exists = currentLinks.some(l => {
        const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
        return s === source && t === target;
    });
    if (exists) return;

    setGraphData({
      ...graphData,
      links: [...currentLinks, { source, target, label: 'linked' }]
    });
  }, [graphData, setGraphData]);

  const handleDeleteLink = useCallback((sourceId: string, targetId: string) => {
    if (!graphData) return;
    const currentLinks = graphData.links || [];
    setGraphData({
      ...graphData,
      links: currentLinks.filter(l => {
        const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
        return !(s === sourceId && t === targetId);
      })
    });
  }, [graphData, setGraphData]);

  return {
    handleUpdateNode,
    handleDeleteNode,
    handleAddNode,
    handleAddLink,
    handleDeleteLink
  };
}
