import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { 
  Network, 
  Send, 
  Loader2, 
  Info, 
  X, 
  Zap, 
  Menu, 
  LayoutDashboard, 
  History, 
  LogOut, 
  LogIn, 
  ChevronRight, 
  Trash2, 
  Settings as SettingsIcon,
  Sparkles,
  Undo2,
  Redo2,
  Trash,
  GitBranch,
  Share2,
  Copy,
  Plus,
  Check,
  CheckSquare,
  Download,
  Users,
  Sliders,
  Grid,
  Orbit,
  GitFork,
  MoreHorizontal,
  Pause,
  Play,
  SlidersHorizontal,
  Eye,
  EyeOff
} from 'lucide-react';
import { GraphCanvas, NODE_COLORS } from './components/GraphCanvas';
import { SettingsPanel } from './components/SettingsPanel';
import { HelpAndGuide } from './components/HelpAndGuide';
import { Node, Link, GraphData, NodeType, GraphVersion } from './types';
import { useSettings } from './context/SettingsContext';
import { auth, db, loginWithGoogle, logout, handleFirestoreError, OperationType } from './lib/firebase';
import { useGraphMutations } from './hooks/useGraphMutations';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [currentExtractionId, setCurrentExtractionId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [view, setView] = useState<'canvas' | 'dashboard' | 'guide' | 'quantum_3d'>('canvas');
  const [extractions, setExtractions] = useState<any[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { settings, updateSettings } = useSettings();
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [isUiHidden, setIsUiHidden] = useState(false);

  // Keyboard listener to toggle UI hide/show on H key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || activeEl.hasAttribute('contenteditable')) {
          return;
        }
      }
      if (e.key === 'h' || e.key === 'H') {
        setIsUiHidden(prev => {
          const newVal = !prev;
          if (newVal) {
            setIsSidebarOpen(false);
          }
          return newVal;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mobile UI custom view states
  const [mobileDrawer, setMobileDrawer] = useState<'generate' | 'layout' | 'timeline' | 'menu' | null>(null);
  const [layout, setLayout] = useState<'force' | 'circular' | 'tree' | 'grid' | '3d'>('force');
  const [timelineStep, setTimelineStep] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Fallback helper for layout resize safety
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        if (layout === '3d') {
          setLayout('force');
        }
        if (view === 'quantum_3d') {
          setView('canvas');
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [layout, view]);

  // Shared Collaboration states
  const [collabActive, setCollabActive] = useState(false);
  const [isGraphShared, setIsGraphShared] = useState(false);
  const [currentExtractionOwnerId, setCurrentExtractionOwnerId] = useState<string | null>(null);
  const [isShareOverlayOpen, setIsShareOverlayOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Versions Control states
  const [localVersions, setLocalVersions] = useState<GraphVersion[]>([]);
  const [versionLabel, setVersionLabel] = useState('');
  const [compareSourceId, setCompareSourceId] = useState<string>('current');
  const [compareTargetId, setCompareTargetId] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [isVersionsDrawerOpen, setIsVersionsDrawerOpen] = useState(false);

  // Undo / Redo history state stacks
  const [history, setHistory] = useState<GraphData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);

  // Subgraph state (contains focused node id, if active)
  const [subgraphFocusNodeId, setSubgraphFocusNodeId] = useState<string | null>(null);

  // AI Narrative Helpers states
  const [aiReportView, setAiReportView] = useState<'none' | 'summary' | 'whatif' | 'inconsistency'>('none');
  const [aiReportContent, setAiReportContent] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Dynamic current versions list resolver
  const currentExtraction = extractions.find(ex => ex.id === currentExtractionId);
  const currentVersions: GraphVersion[] = currentExtraction?.versions || graphData?.versions || localVersions || [];

  const computeDiffGraph = (vA: GraphData, vB: GraphData): GraphData => {
    const nodesMap = new Map<string, Node>();
    
    // Copy nodes from vA as "removed" initially
    vA.nodes.forEach(n => {
      nodesMap.set(n.id, {
        ...n,
        diffStatus: 'removed'
      });
    });

    // Handle vB nodes (identifying identical, modified, or added ones)
    vB.nodes.forEach(n => {
      if (nodesMap.has(n.id)) {
        const prevNode = nodesMap.get(n.id)!;
        const isModified = prevNode.label !== n.label || prevNode.type !== n.type || prevNode.description !== n.description;
        nodesMap.set(n.id, {
          ...n,
          diffStatus: isModified ? 'modified' : 'identical'
        });
      } else {
        nodesMap.set(n.id, {
          ...n,
          diffStatus: 'added'
        });
      }
    });

    const mergedNodes = Array.from(nodesMap.values());
    const linksList: Link[] = [];

    const getLinkKey = (l: Link) => {
      const sId = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const tId = typeof l.target === 'object' ? (l.target as any).id : l.target;
      return `${sId}-->${tId}::${l.label || ''}`;
    };

    const mapA = new Set<string>();
    vA.links.forEach(l => mapA.add(getLinkKey(l)));

    const mapB = new Set<string>();
    vB.links.forEach(l => mapB.add(getLinkKey(l)));

    // Links present in A but missing in B are marked as "removed"
    vA.links.forEach(l => {
      const key = getLinkKey(l);
      if (!mapB.has(key)) {
        const sId = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const tId = typeof l.target === 'object' ? (l.target as any).id : l.target;
        linksList.push({
          source: sId,
          target: tId,
          label: l.label,
          diffStatus: 'removed'
        });
      }
    });

    // Links present in B can be either identical or "added"
    vB.links.forEach(l => {
      const key = getLinkKey(l);
      const sId = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const tId = typeof l.target === 'object' ? (l.target as any).id : l.target;
      if (mapA.has(key)) {
        linksList.push({
          source: sId,
          target: tId,
          label: l.label,
          diffStatus: 'identical'
        });
      } else {
        linksList.push({
          source: sId,
          target: tId,
          label: l.label,
          diffStatus: 'added'
        });
      }
    });

    return {
      title: `${vA.title || 'Branch A'} vs ${vB.title || 'Branch B'}`,
      nodes: mergedNodes,
      links: linksList
    };
  };

  const handleSaveVersion = async (customName: string) => {
    const vName = customName.trim() || `v${(currentVersions.length + 1)}`;
    
    if (!graphData) {
      setError('Cannot branch off an empty workspace.');
      return;
    }

    const newVersion: GraphVersion = {
      id: `v_${Date.now()}`,
      name: vName,
      createdAt: Date.now(),
      graphData: JSON.parse(JSON.stringify(graphData))
    };

    if (currentExtractionId) {
      try {
        setSaveStatus('saving');
        const updatedVersions = [...currentVersions, newVersion];
        const docRef = doc(db, 'extractions', currentExtractionId);
        await updateDoc(docRef, {
          versions: updatedVersions,
          updatedAt: serverTimestamp()
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err: any) {
        console.error('Failed to update Cloud Versions array:', err);
        setError(`Failed to commit version: ${err.message || 'permission constraints or offline'}`);
      }
    } else {
      // Local fallback
      setLocalVersions([...localVersions, newVersion]);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleToggleShare = async () => {
    if (!currentExtractionId) return;
    try {
      const nextShared = !isGraphShared;
      setIsGraphShared(nextShared);
      setSaveStatus('saving');
      
      const docRef = doc(db, 'extractions', currentExtractionId);
      await updateDoc(docRef, {
        isShared: nextShared,
        updatedAt: serverTimestamp()
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err: any) {
      console.error('Failed to toggle share state:', err);
      setError(`Sharing toggle failed: ${err.message}`);
    }
  };

  const handleLogin = async () => {
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Login action failure:', err);
      if (err.code === 'auth/popup-blocked' || (err.message && err.message.toLowerCase().includes('popup-blocked'))) {
        setLoginError(
          'Login popup was blocked. If running inside the AI Studio iframe, please allow popups, or click the "Open in a new tab" button at the top-right of the screen to run the app directly.'
        );
      } else if (err.code === 'auth/cancelled-popup-request' || (err.message && err.message.toLowerCase().includes('cancelled-popup-request'))) {
        setLoginError(
          'Single sign-on popup was cancelled or is still pending. Please try again in a few seconds.'
        );
      } else {
        setLoginError(`Handshake error: ${err.message || 'Verification interrupted.'}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // State update wrapper with Undo/Redo capability
  const updateGraphStateAndHistory = (nextAction: GraphData | null | ((prev: GraphData | null) => GraphData | null)) => {
    let resolvedNext: GraphData | null = null;
    if (typeof nextAction === 'function') {
      resolvedNext = nextAction(graphData);
    } else {
      resolvedNext = nextAction;
    }

    if (!resolvedNext) {
      setGraphData(null);
      setHistory([]);
      setHistoryIndex(-1);
      return;
    }

    const cloned = JSON.parse(JSON.stringify(resolvedNext));
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(cloned);

    // Limit stack depth to 50
    if (nextHistory.length > 50) {
      nextHistory.shift();
    }

    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setGraphData(cloned);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setGraphData(JSON.parse(JSON.stringify(history[prevIdx])));
      setSelectedNode(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setGraphData(JSON.parse(JSON.stringify(history[nextIdx])));
      setSelectedNode(null);
    }
  };

  // Node Merging logic
  const handleMergeNodes = (targetNodeId: string) => {
    if (!graphData || !selectedNode || selectedNode.id === targetNodeId) return;
    
    const targetNode = graphData.nodes.find(n => n.id === targetNodeId);
    if (!targetNode) return;

    const mergedDesc = `${selectedNode.description || ''}\n[Merged with ${targetNode.label}]: ${targetNode.description || ''}`.trim();
    
    const updatedNode = {
      ...selectedNode,
      description: mergedDesc
    };

    const nextNodes = graphData.nodes
      .map(n => n.id === selectedNode.id ? updatedNode : n)
      .filter(n => n.id !== targetNodeId);

    const nextLinks = graphData.links.map(l => {
      const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
      
      const newSource = s === targetNodeId ? selectedNode.id : s;
      const newTarget = t === targetNodeId ? selectedNode.id : t;

      return {
        ...l,
        source: newSource,
        target: newTarget
      };
    }).filter(l => {
      const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
      return s !== t; // Remove self looping links
    });

    updateGraphStateAndHistory({
      ...graphData,
      nodes: nextNodes,
      links: nextLinks
    });

    setSelectedNode(updatedNode);
  };

  // Determine actual display graph depending on Version Comparison and Subgraph Focus State
  const getDisplayGraphData = (): GraphData | null => {
    if (!graphData) return null;

    // 1. Resolve base vs target comparison diff if active
    let resolvedGraph = graphData;
    if (isComparing && compareTargetId) {
      let baseData: GraphData | null = null;
      if (compareSourceId === 'current') {
        baseData = graphData;
      } else {
        const ver = currentVersions.find(v => v.id === compareSourceId);
        if (ver) baseData = ver.graphData;
      }

      const verB = currentVersions.find(v => v.id === compareTargetId);
      const targetData = verB ? verB.graphData : null;

      if (baseData && targetData) {
        resolvedGraph = computeDiffGraph(baseData, targetData);
      }
    }

    // 2. Resolve subgraph focus neighbors filter if active
    if (!subgraphFocusNodeId) return resolvedGraph;

    const focusNodeIds = new Set<string>();
    focusNodeIds.add(subgraphFocusNodeId);

    resolvedGraph.links.forEach(l => {
      const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
      if (s === subgraphFocusNodeId) focusNodeIds.add(t);
      if (t === subgraphFocusNodeId) focusNodeIds.add(s);
    });

    return {
      title: `${resolvedGraph.title} (Subgraph Focus)`,
      nodes: resolvedGraph.nodes.filter(n => focusNodeIds.has(n.id)),
      links: resolvedGraph.links.filter(l => {
        const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
        return focusNodeIds.has(s) && focusNodeIds.has(t);
      })
    };
  };
  
  // Graph mutation logic modularized with history tracking
  const { 
    handleUpdateNode, 
    handleDeleteNode, 
    handleAddNode, 
    handleAddLink, 
    handleDeleteLink 
  } = useGraphMutations(graphData, updateGraphStateAndHistory, setSelectedNode);

  // Auth & Handshake Listener
  useEffect(() => {
    fetch('/api/handshake').catch(err => console.debug('Handshake status error:', err));

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setExtractions([]);
        if (view === 'dashboard') setView('canvas');
      }
    });

    return () => unsubscribe();
  }, []);

  // Extractions Listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'extractions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      setExtractions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'extractions');
    });
  }, [user]);

  // Load and Listen to Shared/Collaborative Graph from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedId = params.get('share') || params.get('collab');
    if (!sharedId) return;

    console.log('Detected shared/collaborative graph ID:', sharedId);
    setCollabActive(true);
    setCurrentExtractionId(sharedId);

    // Subscribe to shared document updates
    const docRef = doc(db, 'extractions', sharedId);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('Real-time sync update from Firestore for shared graph:', sharedId);
        
        // Preserve fine local drag states by only updating if contents actually shifted
        if (data.graphData) {
          setGraphData(prev => {
            const currentString = JSON.stringify(prev);
            const incomingString = JSON.stringify(data.graphData);
            if (currentString !== incomingString) {
              return data.graphData;
            }
            return prev;
          });
        }
        if (data.inputText) setInputText(data.inputText);
        if (data.userId) setCurrentExtractionOwnerId(data.userId);
        if (data.isShared !== undefined) setIsGraphShared(data.isShared);
      } else {
        console.warn('Shared extraction has been deleted:', sharedId);
        setError('Collab repository not found or has been purged.');
      }
    }, (err) => {
      console.error('Co-authoring live sync failed:', err);
      setError('Access forbidden. The repository may be private or auth constraints failed.');
    });

    return () => unsub();
  }, []);

  // AI Helpers Call handlers
  const handleAiSummarize = async () => {
    if (!graphData || !user) return;
    setIsAiLoading(true);
    setAiReportContent('');
    setAiReportView('summary');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/gemini-summarize', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ graphData, settings })
      });
      if (!res.ok) throw new Error('Could not synchronize neural report summary.');
      const responseBody = await res.json();
      setAiReportContent(responseBody.text);
    } catch (err: any) {
      setAiReportContent(`Neural summarize failed: ${err.message || 'Interrupted connection'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiWhatIf = async () => {
    if (!graphData || !selectedNode || !user) return;
    setIsAiLoading(true);
    setAiReportContent('');
    setAiReportView('whatif');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/gemini-what-if', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ graphData, nodeId: selectedNode.id, settings })
      });
      if (!res.ok) throw new Error('Ripple analysis rejected.');
      const responseBody = await res.json();
      setAiReportContent(responseBody.text);
    } catch (err: any) {
      setAiReportContent(`Narrative ripple evaluation failed: ${err.message || 'Interrupted connection'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiDetectInconsistencies = async () => {
    if (!graphData || !user) return;
    setIsAiLoading(true);
    setAiReportContent('');
    setAiReportView('inconsistency');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/gemini-detect-inconsistency', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ graphData, settings })
      });
      if (!res.ok) throw new Error('Logic scan evaluation failed.');
      const responseBody = await res.json();
      setAiReportContent(responseBody.text);
    } catch (err: any) {
      setAiReportContent(`Logical integrity diagnostics failed: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiAutoComplete = async () => {
    if (!graphData || !user) return;
    setIsAiLoading(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/gemini-auto-complete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ graphData, settings })
      });
      if (!res.ok) throw new Error('Sequence extrapolation failed.');
      const suggestions = await res.json();

      const currentIds = new Set(graphData.nodes.map(n => n.id));
      const newlyAddedNodes = (suggestions.nodes || []).filter((n: any) => !currentIds.has(n.id));

      const mergedNodes = [...graphData.nodes, ...newlyAddedNodes];
      const mergedLinks = [...graphData.links, ...(suggestions.links || [])];

      updateGraphStateAndHistory({
        ...graphData,
        nodes: mergedNodes,
        links: mergedLinks
      });
    } catch (err: any) {
      setError(`Sequence extrapolation error: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleExtract = async () => {
    if (!inputText.trim()) return;
    if (!user) {
      setError('Please sign in to access extraction protocols.');
      return;
    }

    setIsLoading(true);
    setError(null);
    console.log('Initiating extraction protocol...');
    
    try {
      const idToken = await user.getIdToken(true); 
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); 

      const response = await fetch('/api/extract-graph', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        signal: controller.signal,
        body: JSON.stringify({ 
          text: inputText,
          settings: {
            maxNodes: settings.ai.maxNodes,
            detailLevel: settings.ai.detailLevel,
            language: settings.ai.language,
            provider: settings.api.provider,
            keys: settings.api.keys,
            mode: settings.ai.mode
          }
        }),
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Neutral link unstable' }));
        console.error('Extraction Failed:', response.status, errorData);
        throw new Error(errorData.error || `Server pulse failed: ${response.status} ${errorData.reason || ''}`);
      }
      
      const data = await response.json();
      console.log('Extraction sequence successful:', data.title);
      
      if (!data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0) {
        throw new Error('AI could not identify any significant entities in this text.');
      }
      
      if (!data.links || !Array.isArray(data.links)) {
        data.links = [];
      }
      
      setGraphData(data);
      setHistory([data]);
      setHistoryIndex(0);

      setCurrentExtractionId(null);
      setView('canvas');

      // Persistence
      if (user) {
        try {
          await addDoc(collection(db, 'extractions'), {
            userId: user.uid,
            title: data.title || 'Untitled Extraction',
            inputText,
            graphData: data,
            createdAt: serverTimestamp(),
          });
        } catch (saveErr) {
          console.warn('Failed to save to cloud, proceeding locally:', saveErr);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const loadExample = () => {
    setInputText("In the quiet town of Eldoria, a mysterious traveler named Silas arrived at the Silver Dragon Inn. He carried a silver locket that allegedly belonged to Queen Altea. The town's blacksmith, Garrick, recognized the crest on the locket. Legend says the locket is the key to the Whispering Woods, where the Star Crystal is hidden. Silas was seen talking to Elara, the town's herbalist, who knows the secret paths of the woods.");
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this extraction?')) return;
    try {
      await deleteDoc(doc(db, 'extractions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `extractions/${id}`);
    }
  };

  const handleDeleteSelection = () => {
    if (!graphData || selectedNodeIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete all ${selectedNodeIds.length} selected entities? This will also remove any connections they have.`)) return;

    const newNodes = (graphData.nodes || []).filter(n => !selectedNodeIds.includes(n.id));
    const newLinks = (graphData.links || []).filter(l => {
      const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
      return !selectedNodeIds.includes(s) && !selectedNodeIds.includes(t);
    });

    updateGraphStateAndHistory({
      ...graphData,
      nodes: newNodes,
      links: newLinks
    });

    setSelectedNodeIds([]);
    setSelectedNode(null);
  };

  const handleExportSelection = async () => {
    if (!graphData || selectedNodeIds.length === 0) return;

    const selectedNodes = (graphData.nodes || []).filter(n => selectedNodeIds.includes(n.id));
    const selectedNodeIdsSet = new Set(selectedNodeIds);
    const selectedLinks = (graphData.links || []).filter(l => {
      const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
      return selectedNodeIdsSet.has(s) && selectedNodeIdsSet.has(t);
    });

    if (selectedNodes.length === 1) {
      // Single node JSON download
      const node = selectedNodes[0];
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(node, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${node.label.replace(/\s+/g, '_')}_entity.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      // 2 or more nodes -> ZIP it up!
      const zip = new JSZip();

      // 1. Add complete subset JSON file
      const selectionData = {
        exportedAt: new Date().toISOString(),
        mapTitle: graphData.title,
        nodes: selectedNodes,
        links: selectedLinks
      };
      zip.file("selection_manifest.json", JSON.stringify(selectionData, null, 2));

      // 2. Add individual entity detailed JSON files
      selectedNodes.forEach(node => {
        const fileName = `${node.label.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        zip.file(`entities/${fileName}`, JSON.stringify(node, null, 2));
      });

      // 3. Add a beautiful Markdown summary README
      let readmeText = `# Exported Narrative Entities\n\n`;
      readmeText += `**Map Title:** ${graphData.title}\n`;
      readmeText += `**Date:** ${new Date().toLocaleString()}\n`;
      readmeText += `**Selected Entities Count:** ${selectedNodes.length}\n`;
      readmeText += `**Interconnections Count:** ${selectedLinks.length}\n\n`;
      readmeText += `## Entities Overview\n\n`;
      selectedNodes.forEach(n => {
        readmeText += `### ✦ ${n.label} (${n.type.toUpperCase()})\n`;
        if (n.description) readmeText += `${n.description}\n\n`;
      });
      zip.file("README.md", readmeText);

      // Generate the blob and trigger download
      try {
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", url);
        downloadAnchor.setAttribute("download", `narrative_selection_${Date.now()}.zip`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("ZIP Generation error:", err);
        alert("Failed to build ZIP archive.");
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || activeEl.hasAttribute('contenteditable')) {
          return;
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.length > 0) {
          handleDeleteSelection();
        } else if (selectedNode) {
          if (confirm(`Are you sure you want to delete "${selectedNode.label}"? This will also remove all connected links.`)) {
            handleDeleteNode(selectedNode.id);
            if (subgraphFocusNodeId === selectedNode.id) {
              setSubgraphFocusNodeId(null);
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, selectedNodeIds, graphData, handleDeleteNode, subgraphFocusNodeId]);

  const handleSaveProtocol = async () => {
    if (!graphData) return;
    if (!user && !collabActive) {
      setError('Please authenticate to commit changes to cloud.');
      return;
    }
    setSaveStatus('saving');
    setError(null);
    try {
      const payload: any = {
        userId: user ? user.uid : (currentExtractionOwnerId || 'shared-guest'),
        title: graphData.title,
        inputText: inputText || 'Manual Entry',
        graphData: graphData,
        isShared: isGraphShared,
        updatedAt: serverTimestamp(),
      };

      if (currentExtractionId) {
        const docRef = doc(db, 'extractions', currentExtractionId);
        await updateDoc(docRef, payload);
      } else {
        if (user) {
          const docRef = await addDoc(collection(db, 'extractions'), {
            ...payload,
            createdAt: serverTimestamp(),
          });
          setCurrentExtractionId(docRef.id);
        } else {
          throw new Error('Please authenticate to create a new shared cloud visualization.');
        }
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (saveErr: any) {
      console.error('Save failed:', saveErr);
      setSaveStatus('error');
      
      let message = 'Neural storage failed to synchronize.';
      
      if (saveErr.code === 'permission-denied' || (saveErr.message && saveErr.message.toLowerCase().includes('permission-denied'))) {
        message = 'Access denied: Security rules blocked the storage attempt.';
      } else if (saveErr.code === 'unavailable' || (saveErr.message && saveErr.message.toLowerCase().includes('unavailable'))) {
        message = 'Storage offline. Connection to relay lost.';
      } else if (saveErr.message) {
        try {
          const parsed = JSON.parse(saveErr.message);
          message = `Protocol Error: ${parsed.error || 'Transmissions rejected'}`;
        } catch (e) {
          message = `Transmission failed: ${saveErr.message.substring(0, 100)}`;
        }
      }
      
      setError(message);
      setTimeout(() => setSaveStatus('idle'), 5000);
    }
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full justify-between overflow-y-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-[#09090f] text-white">
      <div className="p-5 space-y-6 flex-1">
        {/* Logo */}
        <header className="flex justify-between items-center pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/5 rounded">
              <Network size={16} className="text-amber-500 animate-pulse" />
            </div>
            <div>
              <h1 className="font-serif italic text-lg tracking-wide leading-none">GraphMind</h1>
              <span className="text-[8px] uppercase tracking-[0.35em] text-white/30 block mt-0.5">AI Neural Maps</span>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 text-white/40 hover:text-white"
          >
            <X size={16} />
          </button>
        </header>

        {/* Identity Auth State */}
        <section className="space-y-3">
          {user ? (
            <div className="p-3 bg-white/[0.01] border border-white/10 rounded group flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-white overflow-hidden shrink-0">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} referrerPolicy="no-referrer" />
                ) : (
                  user.email?.substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-white truncate">{user.displayName || 'Authorized User'}</p>
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-green-500" />
                  <span className="text-[8px] font-mono text-white/40 uppercase tracking-wider">Cloud Connected</span>
                </div>
              </div>
              <button 
                onClick={logout}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-white/30 hover:text-white transition-all ml-auto"
                title="Terminate Link"
              >
                <LogOut size={12} />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full py-2 bg-white/5 border border-dashed border-white/15 text-white/60 text-[9px] uppercase tracking-widest hover:border-white/30 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <Loader2 size={12} className="animate-spin text-white/45" />
              ) : (
                <LogIn size={12} className="text-white/40" />
              )}
              {isLoggingIn ? 'Connecting...' : 'Enable Cloud Sync'}
            </button>
          )}
        </section>

        {/* Navigation Tabs */}
        <nav className="space-y-1.5 pt-2 border-t border-white/5">
          <NavBtn 
            active={view === 'canvas'} 
            onClick={() => { setView('canvas'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
            icon={<Network size={14} />} 
            label="Protocol View" 
          />
          {user && (
            <NavBtn 
              active={view === 'dashboard'} 
              onClick={() => { setView('dashboard'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<LayoutDashboard size={14} />} 
              label="Neural Archives" 
              count={extractions.length}
            />
          )}
          <div className="hidden lg:block">
            <NavBtn 
              active={view === 'quantum_3d'} 
              onClick={() => { 
                setView('quantum_3d'); 
                setLayout('3d'); 
                if(window.innerWidth < 1024) setIsSidebarOpen(false); 
              }} 
              icon={<Orbit size={14} className="text-amber-500 animate-pulse" />} 
              label="Quantum 3D Space" 
            />
          </div>
          <NavBtn 
            active={view === 'guide'} 
            onClick={() => { setView('guide'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
            icon={<Info size={14} />} 
            label="System Guide" 
          />
          <NavBtn 
            active={isSettingsOpen} 
            onClick={() => setIsSettingsOpen(true)} 
            icon={<SettingsIcon size={14} />} 
            label="System Configuration" 
          />
        </nav>

        {/* AI Model & Keys Config */}
        <section className="space-y-3 pt-3 border-t border-white/5">
          <label className="text-[9px] tracking-[0.2em] uppercase font-bold text-white/40 block">AI Provider & Core</label>
          <div className="space-y-2">
            <div>
              <label className="text-[8px] uppercase tracking-wider text-white/30 block mb-1">Provider</label>
              <select 
                value={settings.api.provider}
                onChange={(e) => updateSettings({ api: { ...settings.api, provider: e.target.value as any } })}
                className="w-full bg-[#12121e] border border-white/10 text-[10px] px-2 py-1.5 outline-none text-white rounded cursor-pointer hover:border-white/20"
              >
                <option value="gemini">Gemini Neural (Default)</option>
                <option value="openai">OpenAI Synapse</option>
                <option value="groq">Groq Engine</option>
                <option value="aki">Aki.io Repository</option>
              </select>
            </div>

            {/* Private API key input field */}
            {settings.api.provider !== 'aki' && (
              <div>
                <label className="text-[8px] uppercase tracking-wider text-white/30 flex justify-between items-center mb-1">
                  <span>API Key override</span>
                  {!settings.api.keys?.[settings.api.provider as 'gemini' | 'openai' | 'groq'] && (
                    <span className="text-[7px] text-green-400 uppercase tracking-widest font-mono font-bold animate-pulse">System Protected</span>
                  )}
                </label>
                <input 
                  type="password"
                  value={settings.api.keys?.[settings.api.provider as 'gemini' | 'openai' | 'groq'] || ''}
                  onChange={(e) => updateSettings({ 
                    api: { 
                      ...settings.api, 
                      keys: { ...settings.api.keys, [settings.api.provider]: e.target.value } 
                    } 
                  })}
                  placeholder={`Enter private ${settings.api.provider} token`}
                  className="w-full bg-[#12121e] border border-white/10 text-xs px-2 py-1.5 outline-none text-white focus:border-white/20 transition-all font-mono rounded"
                />
              </div>
            )}

            {/* Model & Blueprint Selection */}
            <div>
              <label className="text-[8px] uppercase tracking-wider text-white/30 block mb-1">Context Blueprint</label>
              <select 
                value={settings.ai.mode}
                onChange={(e) => updateSettings({ ai: { ...settings.ai, mode: e.target.value as any } })}
                className="w-full bg-[#12121e] border border-white/10 text-[10px] px-2 py-1.5 outline-none text-white rounded cursor-pointer hover:border-white/20"
              >
                <option value="general">Standard Knowledge Map</option>
                <option value="creative">Creative Bible (Manga/Game/World)</option>
                <option value="academic">Academic Synthesis</option>
                <option value="professional">Professional / Org Structure</option>
                <option value="personal">Personal Archive / Travel</option>
                <option value="detective">Detective Wall / Investigation</option>
              </select>
            </div>
          </div>
        </section>

        {/* Input Text Area section */}
        <section className="space-y-2.5 pt-3 border-t border-white/5">
          <div className="flex justify-between items-center">
            <label className="text-[9px] tracking-[0.2em] uppercase font-bold text-white/40">
              Input Text Stream
            </label>
            <button 
              onClick={loadExample}
              className="text-[8px] tracking-wider uppercase text-amber-500/70 hover:text-amber-500 font-bold"
            >
              Load Example
            </button>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste raw narrative outlines, character bio notes, logical streams or articles..."
            className="w-full h-28 bg-[#12121e] border border-white/10 p-3 text-xs leading-relaxed text-white/80 focus:border-white/20 outline-none transition-all resize-none rounded"
          />
          <button
            onClick={handleExtract}
            disabled={isLoading || !inputText.trim()}
            className={`w-full py-2.5 bg-amber-500 text-black text-[9px] uppercase tracking-[0.25em] font-bold hover:bg-amber-400 transition-all flex items-center justify-center gap-2 rounded ${
              isLoading ? 'opacity-50 cursor-wait' : 
              !inputText.trim() ? 'opacity-20 cursor-not-allowed' : 
              'opacity-100'
            }`}
          >
            {isLoading ? <Loader2 className="animate-spin text-black" size={12} /> : <Zap size={11} />}
            {isLoading ? 'Tracing Neural Matrix...' : 'Generate Neural Map'}
          </button>
        </section>

        {/* AI Assistants Trigger panel */}
        {graphData && user && (
          <section className="space-y-2 pt-3 border-t border-white/5">
            <div className="text-[9px] tracking-[0.2em] uppercase font-bold text-white/40 flex items-center gap-1">
              <Sparkles size={11} className="text-amber-500" /> Cognitive Assistants
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={handleAiSummarize}
                disabled={isAiLoading || !graphData}
                className="p-1.5 bg-white/5 border border-white/5 rounded text-[8px] uppercase tracking-wider font-bold hover:bg-white/10 text-white leading-none text-center"
              >
                Summarize
              </button>
              <button
                onClick={handleAiDetectInconsistencies}
                disabled={isAiLoading || !graphData}
                className="p-1.5 bg-white/5 border border-white/5 rounded text-[8px] uppercase tracking-wider font-bold hover:bg-white/10 text-white leading-none text-center"
              >
                Audit Logic
              </button>
              <button
                onClick={handleAiAutoComplete}
                disabled={isAiLoading || !graphData}
                className="col-span-2 p-2 bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded text-[8px] uppercase tracking-wider font-bold hover:bg-amber-500/20 text-white text-center flex items-center justify-center gap-1"
              >
                <Sparkles size={10} className="text-amber-500 animate-pulse" /> Auto-Extend Story
              </button>
            </div>
          </section>
        )}

        {/* Graph Physical / Appearance Controls at bottom */}
        <section className="space-y-3 pt-3 border-t border-white/5">
          <label className="text-[9px] tracking-[0.2em] uppercase font-bold text-white/40 block">Graph Calibration</label>
          <div className="space-y-2 bg-[#12121e]/50 p-2 border border-white/5 rounded">
            {/* Theme & Auto-Freeze sliders simplified for speed */}
            <div className="flex justify-between items-center text-[9px] text-white/70">
              <span className="uppercase tracking-wider">Aesthetic Theme</span>
              <button 
                onClick={() => updateSettings({ appearance: { ...settings.appearance, theme: settings.appearance.theme === 'dark' ? 'light' : 'dark' } })}
                className="px-2 py-0.5 border border-white/10 rounded uppercase text-[8px] font-mono hover:bg-white/5"
              >
                {settings.appearance.theme} Mode
              </button>
            </div>

            <div className="flex justify-between items-center text-[9px] text-white/70">
              <span className="uppercase tracking-wider">Physics Auto-Freeze</span>
              <button 
                onClick={() => updateSettings({ physics: { ...settings.physics, autoFreeze: !settings.physics.autoFreeze } })}
                className={`px-2 py-0.5 border border-white/10 rounded uppercase text-[8px] font-mono hover:bg-white/5 ${settings.physics.autoFreeze ? 'text-amber-500 border-amber-500/30' : ''}`}
              >
                {settings.physics.autoFreeze ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[8px] text-white/40 uppercase font-mono">
                <span>Cluster Spacing</span>
                <span>{settings.physics.linkDistance}px</span>
              </div>
              <input 
                type="range" min="50" max="400" step="10"
                value={settings.physics.linkDistance}
                onChange={(e) => updateSettings({ physics: { ...settings.physics, linkDistance: parseInt(e.target.value) } })}
                className="w-full h-1 accent-white cursor-pointer"
              />
            </div>
          </div>
        </section>
      </div>

      <footer className="p-4 border-t border-white/5 bg-[#07070d] flex justify-between items-center text-[8px] uppercase tracking-widest text-white/25">
        <span>GM-SYSTEM-V2</span>
        <div className="flex items-center gap-1 font-mono">
          <div className={`w-1 h-1 rounded-full ${isLoading ? 'bg-amber-500 animate-ping' : 'bg-green-500'}`} />
          ONLINE
        </div>
      </footer>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-bg text-[#E0E0E0] font-sans overflow-hidden relative">
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.01] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,1)_2px,rgba(255,255,255,1)_4px)]" />

      {/* Mobile Top Bar */}
      <header className={`lg:hidden absolute left-0 right-0 border-b bg-bg z-40 flex items-center justify-between px-6 transition-all duration-300 ease-in-out overflow-hidden ${isUiHidden ? 'h-0 opacity-0 border-b-0 py-0 pointer-events-none' : 'h-16 border-white/10 top-0'}`}>
        <div className="flex items-center gap-3">
          <Network size={20} className="text-white/40" />
          <span className="font-serif italic text-xl">GM</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 border border-white/10 rounded-sm text-white/80 hover:text-white"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Sidebar Navigation */}
      {/* Mobile sidebar (drawer style) */}
      <AnimatePresence>
        {isSidebarOpen && !isUiHidden && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-black"
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-80 h-full max-w-[85vw] bg-bg flex flex-col z-10"
            >
              {renderSidebarContent()}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex h-full bg-[#09090f] flex-col shrink-0 relative transition-all duration-300 ease-in-out overflow-hidden ${isUiHidden ? 'w-0 border-r-0' : 'w-80 border-r border-white/5'}`}>
        <div className="w-80 h-full flex flex-col shrink-0">
          {renderSidebarContent()}
        </div>
      </aside>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md bg-slate-900 border border-red-500/30 text-white p-6 shadow-2xl flex items-start gap-4"
          >
            <div className="p-2 bg-white/10 rounded-sm">
              <Info size={20} className="text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-1 col-span-2 text-white/40">Neural Protocol Error</p>
              <p className="text-xs text-white/95 mb-4">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="text-[9px] uppercase tracking-widest font-bold py-1 px-3 border border-white/10 hover:bg-white hover:text-black transition-all"
              >
                Dismiss Error
              </button>
            </div>
            <button onClick={() => setError(null)} className="text-white/40 hover:text-white">
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className={`flex-1 overflow-hidden flex flex-col transition-colors duration-500 ${settings.appearance.theme === 'light' ? 'bg-gray-50' : 'bg-bg'}`}>
        {view === 'canvas' ? (
          <div className="flex-1 flex flex-col relative overflow-hidden">
            {/* Hide UI floating toggler button */}
            <button
              id="hide-ui-toggle-btn"
              onClick={() => {
                setIsUiHidden(prev => {
                  const newVal = !prev;
                  if (newVal) {
                    setIsSidebarOpen(false);
                  }
                  return newVal;
                });
              }}
              className={`absolute z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all duration-300 shadow-lg border backdrop-blur-md ${
                isUiHidden 
                  ? 'top-4 right-4 bg-black/60 hover:bg-black/80 text-white border-white/20' 
                  : 'top-20 lg:top-16 right-4 bg-[#0c0c14]/85 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
              title="Toggle full screen view (Hotkey: H)"
            >
              {isUiHidden ? <Eye size={12} className="text-amber-500 animate-pulse" /> : <EyeOff size={12} className="text-white/45" />}
              <span>{isUiHidden ? '⊞ SHOW UI' : '⊟ HIDE UI'}</span>
            </button>
            {/* Slim 48px Topbar */}
            <header className={`border-b px-6 flex items-center justify-between shrink-0 bg-[#09090f]/70 backdrop-blur-md z-20 transition-all duration-300 ease-in-out overflow-hidden ${isUiHidden ? 'h-0 opacity-0 border-b-0 py-0 pointer-events-none' : 'h-12 border-white/5'}`}>
              {/* Left: Layout Switcher */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-sm">
                {(['force', 'circular', 'tree', 'grid', '3d'] as const).map((l) => (
                  <button 
                    key={l}
                    onClick={() => {
                      if (l === '3d' && window.innerWidth < 1024) return;
                      setLayout(l);
                    }} 
                    className={`px-2 py-0.5 rounded-sm text-[9px] uppercase tracking-wider font-mono transition-all ${
                      l === '3d' ? 'hidden lg:inline-block' : ''
                    } ${layout === l ? 'bg-white text-black font-semibold' : 'text-white/50 hover:text-white'}`}
                  >
                    {l === 'force' ? 'Force' : l === 'circular' ? 'Circle' : l === 'tree' ? 'Tree' : l === 'grid' ? 'Grid' : '3D'}
                  </button>
                ))}
              </div>

              {/* Center: Graph Title */}
              <div className="flex-1 max-w-[30%] text-center px-4">
                <input 
                  type="text" 
                  value={graphData?.title || 'No Neural Signal Loaded'} 
                  onChange={(e) => graphData && setGraphData({...graphData, title: e.target.value})}
                  disabled={!isEditing}
                  className="bg-transparent text-center font-serif text-sm italic outline-none focus:text-amber-500 transition-colors w-full truncate text-white"
                  placeholder="Untitled Map"
                />
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono opacity-50 uppercase tracking-widest hidden sm:inline">
                  {graphData?.nodes?.length || 0} Nodes
                </span>

                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className={`text-[9px] uppercase tracking-wider font-bold px-2 py-1 border rounded transition-all ${
                    isEditing 
                      ? 'border-amber-500 text-amber-500 bg-amber-500/10' 
                      : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {isEditing ? 'Edit: ON' : 'Edit: OFF'}
                </button>

                <button 
                  onClick={() => {
                    setIsMultiSelectMode(!isMultiSelectMode);
                    if (!isMultiSelectMode) {
                      setSelectedNodeIds([]);
                      setSelectedNode(null);
                    }
                  }}
                  className={`text-[9px] uppercase tracking-wider font-bold px-2 py-1 border rounded transition-all flex items-center gap-1.5 ${
                    isMultiSelectMode 
                      ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' 
                      : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white'
                  }`}
                  title="Enable multi-selection of entities on the canvas"
                >
                  <CheckSquare size={10} className={isMultiSelectMode ? 'text-yellow-500 animate-pulse' : 'text-white/40'} />
                  {isMultiSelectMode ? 'Select: ON' : 'Multi-Select'}
                </button>

                <button 
                  onClick={() => setIsVersionsDrawerOpen(!isVersionsDrawerOpen)}
                  className={`text-[9px] uppercase tracking-wider font-bold px-2 py-1 border rounded transition-all ${
                    isVersionsDrawerOpen ? 'border-amber-500 text-amber-500 bg-amber-500/10' : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white'
                  }`}
                >
                  Branches
                </button>

                <button 
                  onClick={() => setIsShareOverlayOpen(!isShareOverlayOpen)}
                  className={`text-[9px] uppercase tracking-wider font-bold px-2 py-1 border rounded transition-all ${
                    isShareOverlayOpen ? 'border-green-500 text-green-500 bg-green-500/10' : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white'
                  }`}
                >
                  Share
                </button>

                <div className="relative">
                  <button
                    onClick={() => setIsOverflowOpen(!isOverflowOpen)}
                    className={`p-1 border rounded transition-all flex items-center justify-center ${
                      isOverflowOpen 
                        ? 'border-amber-500 text-amber-500 bg-amber-500/10' 
                        : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white'
                    }`}
                    title="More options"
                  >
                    <MoreHorizontal size={13} />
                  </button>

                  {isOverflowOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-30" 
                        onClick={() => setIsOverflowOpen(false)} 
                      />
                      <div className="absolute right-0 mt-1 w-36 bg-[#0c0c14] border border-white/10 rounded shadow-2xl py-1 z-40">
                        <button
                          onClick={() => {
                            handleUndo();
                            setIsOverflowOpen(false);
                          }}
                          disabled={historyIndex <= 0}
                          className="w-full px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider flex items-center gap-2 hover:bg-white/5 text-white/70 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-white/70 transition-colors"
                        >
                          <Undo2 size={11} />
                          <span className="flex-1 text-left">Undo</span>
                        </button>
                        <button
                          onClick={() => {
                            handleRedo();
                            setIsOverflowOpen(false);
                          }}
                          disabled={historyIndex >= history.length - 1}
                          className="w-full px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider flex items-center gap-2 hover:bg-white/5 text-white/70 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-white/70 transition-colors"
                        >
                          <Redo2 size={11} />
                          <span className="flex-1 text-left">Redo</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </header>


            {/* Mobile floating pill indicator */}
            {graphData && !isUiHidden && (
              <div className="lg:hidden absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-2 bg-[#09090e]/70 backdrop-blur-md border border-white/5 px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
                <span className="text-[10px] font-medium text-white/95 font-serif italic truncate max-w-[150px]">
                  {graphData.title || 'Untitled Map'}
                </span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-[9px] font-bold text-white/50 tracking-[0.1em] uppercase font-mono">
                  {graphData.nodes?.length || 0} Nodes
                </span>
              </div>
            )}

            {/* Subgraph notification banner */}
            <AnimatePresence>
              {subgraphFocusNodeId && (
                <div className="absolute top-48 lg:top-32 left-4 lg:left-24 z-20 flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-sm text-xs">
                  <span className="text-amber-500 font-bold uppercase tracking-widest text-[9px]">Subgraph Focus Active</span>
                  <span className="text-white/70">Showing neighbors of: {graphData?.nodes.find(n => n.id === subgraphFocusNodeId)?.label}</span>
                  <button 
                    onClick={() => setSubgraphFocusNodeId(null)} 
                    className="text-amber-500 font-bold hover:underline uppercase text-[9px] ml-4 cursor-pointer"
                  >
                    Reset Full View
                  </button>
                </div>
              )}
            </AnimatePresence>

            {/* Minimal Mobile Floating Toolbar */}
            <div className={`lg:hidden fixed left-1/2 -translate-x-1/2 z-35 flex items-center justify-around bg-black/[0.72] backdrop-blur-lg border border-white/10 px-5 rounded-full shadow-2xl w-[90%] max-w-sm transition-all duration-300 ${isUiHidden ? 'bottom-[-100px] opacity-0 pointer-events-none py-0' : 'bottom-6 py-2.5'}`}>
              <button 
                onClick={() => setMobileDrawer(mobileDrawer === 'generate' ? null : 'generate')}
                className={`p-2.5 rounded-full transition-all focus:outline-none ${mobileDrawer === 'generate' ? 'text-amber-500 bg-white/5 scale-110' : 'text-white/60 hover:text-white'}`}
                title="Generate"
              >
                <Sparkles size={18} />
              </button>
              <button 
                onClick={() => setMobileDrawer(mobileDrawer === 'layout' ? null : 'layout')}
                className={`p-2.5 rounded-full transition-all focus:outline-none ${mobileDrawer === 'layout' ? 'text-amber-500 bg-white/5 scale-110' : 'text-white/60 hover:text-white'}`}
                title="Topology Layout"
              >
                <Network size={18} />
              </button>
              <button 
                onClick={() => setMobileDrawer(mobileDrawer === 'timeline' ? null : 'timeline')}
                className={`p-2.5 rounded-full transition-all focus:outline-none ${mobileDrawer === 'timeline' ? 'text-amber-500 bg-white/5 scale-110' : 'text-white/60 hover:text-white'}`}
                title="Timeline Sequence"
              >
                <Sliders size={18} />
              </button>
              <button 
                onClick={() => setMobileDrawer(mobileDrawer === 'menu' ? null : 'menu')}
                className={`p-2.5 rounded-full transition-all focus:outline-none ${mobileDrawer === 'menu' ? 'text-amber-500 bg-white/5 scale-110' : 'text-white/60 hover:text-white'}`}
                title="Menu Drawer"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>

            {/* Mobile Bottom Sheets */}
            <AnimatePresence>
              {mobileDrawer && (
                <>
                  {/* Background overlay with blur when drawer is open */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setMobileDrawer(null)}
                    className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-md z-38 pointer-events-auto"
                  />
                  
                  {/* Smooth spring slide-up bottom drawer container */}
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                    className="lg:hidden fixed bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-[#0a0a0f] border-t border-white/10 rounded-t-2xl z-40 p-6 pb-24 text-white shadow-2xl pointer-events-auto flex flex-col"
                  >
                    {/* Minimal decorative handle drag drawer indicator */}
                    <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 shrink-0" />
                    
                    {/* DRAWER: GENERATE */}
                    {mobileDrawer === 'generate' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center bg-white/[0.01] p-3 border border-white/5 rounded">
                          <h3 className="font-serif italic text-base flex items-center gap-2">
                            <Sparkles className="text-amber-500 animate-pulse" size={16} />
                            Generate Neural Map
                          </h3>
                          <button 
                            onClick={loadExample}
                            className="text-[9px] tracking-widest uppercase border border-white/10 rounded px-2.5 py-1 text-white/60 hover:text-white"
                          >
                            Load Pulse
                          </button>
                        </div>
                        <p className="text-[10px] text-white/50 leading-relaxed font-sans font-light">
                          Provide context or narrative script details. The NLP tracing module will transcribe characters, factions, and landmarks into custom connected structures.
                        </p>
                        <textarea
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder="Paste dialog, background lore, or entity definitions here..."
                          className="w-full h-32 bg-white/[0.02] border border-white/15 p-3 text-xs leading-relaxed text-white/80 focus:border-white/30 outline-none transition-all resize-none rounded"
                        />
                        <button
                          onClick={async () => {
                            await handleExtract();
                            setMobileDrawer(null);
                          }}
                          disabled={isLoading || !inputText.trim()}
                          className={`w-full py-3.5 border border-white text-white text-[10px] uppercase tracking-[0.4em] font-medium hover:bg-white hover:text-black transition-all flex items-center justify-center gap-3 rounded ${
                            isLoading ? 'opacity-50 cursor-wait' : 
                            !inputText.trim() ? 'opacity-20 cursor-not-allowed' : 
                            'opacity-100'
                          }`}
                        >
                          {isLoading ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />}
                          {isLoading ? 'Processing Signal' : 'Execute Trace'}
                        </button>
                      </div>
                    )}
                    
                    {/* DRAWER: TOPOLOGY LAYOUTS */}
                    {mobileDrawer === 'layout' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Network className="text-amber-500" size={16} />
                          <h3 className="font-serif italic text-base">Topology Layout Options</h3>
                        </div>
                        <p className="text-[10px] text-white/50 leading-relaxed font-sans font-light">
                          Select a physics arrangement algorithm to re-orient layout positions for optimal entity tracking.
                        </p>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <button 
                            onClick={() => { setLayout('force'); setMobileDrawer(null); }}
                            className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${layout === 'force' ? 'border-amber-500 bg-amber-500/10 text-white' : 'border-white/5 bg-white/[0.01] text-white/60 hover:text-white'}`}
                          >
                            <Network size={20} className="text-amber-500" />
                            <span className="text-[10px] uppercase font-bold tracking-wider">Force-Directed</span>
                          </button>
                          
                          <button 
                            onClick={() => { setLayout('circular'); setMobileDrawer(null); }}
                            className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${layout === 'circular' ? 'border-amber-500 bg-amber-500/10 text-white' : 'border-white/5 bg-white/[0.01] text-white/60 hover:text-white'}`}
                          >
                            <Orbit size={20} className="text-emerald-500" />
                            <span className="text-[10px] uppercase font-bold tracking-wider">Circular Ring</span>
                          </button>
                          
                          <button 
                            onClick={() => { setLayout('tree'); setMobileDrawer(null); }}
                            className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${layout === 'tree' ? 'border-amber-500 bg-amber-500/10 text-white' : 'border-white/5 bg-white/[0.01] text-white/60 hover:text-white'}`}
                          >
                            <GitFork size={20} className="text-purple-400 rotate-180" />
                            <span className="text-[10px] uppercase font-bold tracking-wider">Sequential Tree</span>
                          </button>
                          
                          <button 
                            onClick={() => { setLayout('grid'); setMobileDrawer(null); }}
                            className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${layout === 'grid' ? 'border-amber-500 bg-amber-500/10 text-white' : 'border-white/5 bg-white/[0.01] text-white/60 hover:text-white'}`}
                          >
                            <Grid size={20} className="text-amber-400" />
                            <span className="text-[10px] uppercase font-bold tracking-wider">Matrix Grid</span>
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* DRAWER: TIMELINE ANIMATOR */}
                    {mobileDrawer === 'timeline' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sliders className="text-amber-500" size={16} />
                            <h3 className="font-serif italic text-base">Story Timeline Animation</h3>
                          </div>
                          {timelineStep !== null && (
                            <button 
                              onClick={() => {
                                setTimelineStep(null);
                                setIsPlaying(false);
                              }}
                              className="text-[9px] uppercase tracking-widest text-amber-500 font-bold border border-amber-500/20 px-2.5 py-1 rounded"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-white/50 leading-relaxed font-sans font-light">
                          Stagger the rendering of nodes to replay the sequence of event milestones and chronological layout introductions step-by-step.
                        </p>
                        
                        <div className="p-4 bg-white/[0.01] border border-white/5 rounded-lg flex flex-col gap-4">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-white/40 uppercase tracking-widest text-[9px] font-mono">Status Tracker</span>
                            <span className="font-serif italic text-amber-500 font-semibold">
                              {timelineStep === null ? "Full Map Visible" : `Sequence: ${timelineStep} of ${graphData?.nodes?.length || 0}`}
                            </span>
                          </div>
                          
                          {timelineStep === null ? (
                            <button
                              onClick={() => {
                                setTimelineStep(1);
                                setIsPlaying(true);
                              }}
                              className="w-full py-3 bg-white/10 hover:bg-white/15 transition-all text-[10px] font-bold uppercase tracking-wider rounded border border-white/10 text-white flex items-center justify-center gap-2"
                            >
                              <Play size={12} fill="currentColor" /> Play Timeline Sequence
                            </button>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between bg-black/40 p-2 rounded border border-white/5 w-full">
                                <button 
                                  onClick={() => setIsPlaying(!isPlaying)}
                                  className="p-2 text-white hover:bg-white/10 rounded transition-all shrink-0"
                                >
                                  {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                                </button>
                                
                                <input 
                                  type="range" 
                                  min="1" 
                                  max={graphData?.nodes?.length || 1} 
                                  value={timelineStep} 
                                  onChange={(e) => {
                                    setIsPlaying(false);
                                    setTimelineStep(parseInt(e.target.value));
                                  }}
                                  className="flex-1 mx-4 h-1.5 rounded bg-white/15 accent-amber-500" 
                                />
                                
                                <button
                                  onClick={() => {
                                    setTimelineStep(null);
                                    setIsPlaying(false);
                                    setMobileDrawer(null);
                                  }}
                                  className="text-[9px] px-2 py-1 uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 border border-white/10 rounded transition-all"
                                >
                                  Close
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* DRAWER: SECONDARY CORE MENU */}
                    {mobileDrawer === 'menu' && (
                      <div className="space-y-5">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                          <SlidersHorizontal className="text-amber-500" size={16} />
                          <h3 className="font-serif italic text-base">Neural Control Panel</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => { setIsEditing(!isEditing); setMobileDrawer(null); }}
                            className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${isEditing ? 'border-amber-500/50 bg-amber-500/10 text-white' : 'border-white/5 bg-white/[0.01] text-white/50'}`}
                          >
                            <Zap size={20} className={isEditing ? 'text-amber-500' : 'text-white/40'} />
                            <span className="text-[10px] uppercase font-bold tracking-wider">
                              Edit Mode {isEditing ? "ON" : "OFF"}
                            </span>
                          </button>
                          
                          <button 
                            onClick={() => { setIsVersionsDrawerOpen(true); setMobileDrawer(null); }}
                            className="p-4 border rounded-lg flex flex-col items-center gap-2 transition-all border-white/5 bg-white/[0.01] text-white/60 hover:text-white"
                          >
                            <GitBranch size={20} className="text-amber-500" />
                            <span className="text-[10px] uppercase font-bold tracking-wider font-mono">
                              Branches {currentVersions.length > 0 && `(${currentVersions.length})`}
                            </span>
                          </button>
                          
                          <button 
                            onClick={() => { setIsShareOverlayOpen(true); setMobileDrawer(null); }}
                            className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all border-white/5 bg-white/[0.01] text-white/60 hover:text-white`}
                          >
                            <Share2 size={20} className="text-emerald-500" />
                            <span className="text-[10px] uppercase font-bold tracking-[0.1em] font-mono">
                              Share Node
                            </span>
                          </button>
                          
                          <button 
                            onClick={() => { handleAddNode(); setMobileDrawer(null); }}
                            className="p-4 border rounded-lg flex flex-col items-center gap-2 transition-all border-white/10 bg-white/[0.02] text-white/70 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                            disabled={!isEditing}
                          >
                            <Plus size={20} className="text-amber-500" />
                            <span className="text-[10px] uppercase font-bold tracking-wider">
                              Incubate Entity
                            </span>
                          </button>
                        </div>
                        
                        <div className="border-t border-white/5 pt-4 flex justify-between items-center bg-white/[0.01] p-3 rounded-md">
                          <span className="text-[10px] tracking-widest uppercase font-bold text-white/45">Layout Undo/Redo</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { handleUndo(); }}
                              disabled={historyIndex <= 0}
                              className="p-2 border border-white/10 rounded bg-white/[0.01] disabled:opacity-20 hover:bg-white/10 transition-all text-white"
                              title="Undo layout edit"
                            >
                              <Undo2 size={14} />
                            </button>
                            <button
                              onClick={() => { handleRedo(); }}
                              disabled={historyIndex >= history.length - 1}
                              className="p-2 border border-white/10 rounded bg-white/[0.01] disabled:opacity-20 hover:bg-white/10 transition-all text-white"
                              title="Redo layout edit"
                            >
                              <Redo2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* ✨ Floating AI analysis overlay reports */}
            <AnimatePresence>
              {aiReportView !== 'none' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="absolute bottom-28 left-6 z-20 w-80 md:w-96 p-6 border rounded shadow-2xl backdrop-blur-md bg-[#09090e]/95 border-white/10 text-white"
                >
                  <header className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-[10px] tracking-[0.3em] uppercase font-bold text-amber-500 flex items-center gap-1.5">
                        <Sparkles size={11} className="text-amber-500" /> AI Narrative Intelligence
                      </h4>
                      <h3 className="text-sm font-serif italic mt-1 text-white/90">
                        {aiReportView === 'summary' && 'Narrative Core Summary'}
                        {aiReportView === 'whatif' && 'Temporal "What-If" Analysis'}
                        {aiReportView === 'inconsistency' && 'Logical Integrity Audit'}
                      </h3>
                    </div>
                    <button 
                      onClick={() => {
                        setAiReportView('none');
                        setAiReportContent('');
                      }}
                      className="text-white/45 hover:text-white transition-all p-1"
                    >
                      <X size={15} />
                    </button>
                  </header>

                  <main className="space-y-4 max-h-64 overflow-y-auto w-full pr-1 text-xs leading-relaxed font-sans font-light">
                    {isAiLoading ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <Loader2 size={24} className="animate-spin text-amber-500" />
                        <span className="text-[9px] tracking-wider uppercase text-white/40 animate-pulse">Scanning context...</span>
                      </div>
                    ) : (
                      <p className="whitespace-pre-line text-white/80 select-text">
                        {aiReportContent || 'Analysis failed. Please run verification trace.'}
                      </p>
                    )}
                  </main>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Collaboration & Sharing Link Overlay Dropdown */}
            <AnimatePresence>
              {isShareOverlayOpen && (
                <div className={`p-5 border w-72 rounded-sm shadow-2xl absolute top-36 right-10 pointer-events-auto z-40 transition-colors ${settings.appearance.theme === 'light' ? 'bg-white border-black/10 text-black' : 'bg-bg border-white/10 text-white bg-slate-900/95 border-white/5'}`}>
                  <header className="flex justify-between items-center mb-4 border-b pb-2 border-white/5">
                    <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.25em] font-bold">
                      <Share2 size={12} className="text-amber-500 animate-pulse" /> Collaboration
                    </div>
                    <button onClick={() => setIsShareOverlayOpen(false)} className="opacity-50 hover:opacity-100">
                      <X size={12} />
                    </button>
                  </header>

                  <div className="space-y-4 text-xs">
                    {/* Active connection metrics */}
                    {collabActive && (
                      <div className="flex items-center gap-2 p-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xs text-[9px] font-mono">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                        <span>CO-AUTHORING LIVE MODE</span>
                      </div>
                    )}

                    {/* Toggle Share Auth State */}
                    {currentExtractionId ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Authorize Share</span>
                          <button 
                            onClick={handleToggleShare}
                            className={`px-3 py-1 border text-[8px] uppercase tracking-widest rounded-full transition-all ${
                              isGraphShared 
                                ? 'border-green-500 text-green-500 bg-green-500/5' 
                                : 'border-white/10 text-white/40 hover:border-white/30'
                            }`}
                          >
                            {isGraphShared ? 'PUBLIC COLLAB' : 'PRIVATE'}
                          </button>
                        </div>
                        
                        <p className="text-[9px] leading-relaxed opacity-50">
                          {isGraphShared 
                            ? 'Anyone with the link can view and write collaborative changes directly to this graph!' 
                            : 'Only you can view or modify this graph. Toggle public collab to allow co-authoring.'}
                        </p>

                        {isGraphShared && (
                          <div className="space-y-2 pt-2 border-t border-white/5">
                            <span className="text-[8px] font-mono opacity-50 block">Co-Authoring Invite Link:</span>
                            <div className="flex gap-1.5">
                              <input 
                                type="text" 
                                readOnly 
                                value={`${window.location.origin}${window.location.pathname}?collab=${currentExtractionId}`} 
                                className="w-full bg-black/40 border border-white/10 p-1.5 text-[9px] font-mono outline-none rounded-xs select-all text-white"
                              />
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?collab=${currentExtractionId}`);
                                  setIsCopied(true);
                                  setTimeout(() => setIsCopied(false), 2000);
                                }}
                                className={`p-1.5 border hover:bg-white hover:text-black transition-all rounded-xs text-white/70 ${isCopied ? 'border-green-500 text-green-500' : 'border-white/10'}`}
                                title="Copy invite URL"
                              >
                                {isCopied ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5 text-center py-2">
                        <p className="text-[10px] opacity-45">Please commit your draft to active storage before starting a share session.</p>
                        <button 
                          onClick={handleSaveProtocol}
                          className="text-[9px] uppercase tracking-widest text-amber-500 hover:underline"
                        >
                          Commit to Storage
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </AnimatePresence>

            {/* Versions & Branching Control Drawer */}
            <AnimatePresence>
              {isVersionsDrawerOpen && (
                <motion.div 
                  initial={{ x: 350, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 350, opacity: 0 }}
                  className={`fixed top-0 right-0 bottom-0 z-50 w-80 border-l p-6 flex flex-col justify-between shadow-2xl backdrop-blur-md ${settings.appearance.theme === 'light' ? 'bg-white/95 border-black/10 text-black' : 'bg-[#0a0a0a]/95 border-white/5 text-white bg-slate-900/95 border-slate-700'}`}
                >
                  <div className="space-y-6">
                    <header className="flex justify-between items-center border-b pb-4 border-white/5">
                      <div className="flex items-center gap-2">
                        <GitBranch size={16} className="text-amber-500 animate-pulse" />
                        <h3 className="font-serif italic text-lg font-bold">Version Branches</h3>
                      </div>
                      <button onClick={() => setIsVersionsDrawerOpen(false)} className="opacity-60 hover:opacity-100">
                        <X size={16} />
                      </button>
                    </header>

                    {/* Create Version Branch Form */}
                    <section className="space-y-3 bg-white/5 p-4 border border-white/10 rounded-sm">
                      <p className="text-[9px] uppercase tracking-[0.2em] font-bold opacity-50">Commit Current State</p>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="e.g. v1, v2 - added links, v3" 
                          value={versionLabel}
                          onChange={(e) => setVersionLabel(e.target.value)}
                          className="flex-1 min-w-0 bg-black/20 border border-white/10 px-2 py-1.5 text-xs outline-none focus:border-amber-500/50 rounded-xs text-white"
                        />
                        <button 
                          onClick={() => {
                            handleSaveVersion(versionLabel);
                            setVersionLabel('');
                          }}
                          title="Save snapshot branch"
                          className="p-1.5 border border-amber-500 hover:bg-amber-500 hover:text-black transition-all text-amber-500 flex items-center justify-center rounded-xs"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </section>

                    {/* Current Versions List */}
                    <section className="space-y-3">
                      <p className="text-[9px] uppercase tracking-[0.2em] font-bold opacity-50 border-b pb-1 border-white/5">Branch History (v1, v2, v3)</p>
                      <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                        {currentVersions.length === 0 ? (
                          <p className="text-[10px] italic opacity-40 py-2">No snapshot branches committed yet.</p>
                        ) : (
                          currentVersions.map((v) => (
                            <div 
                              key={v.id} 
                              className={`p-3 border rounded-xs transition-all flex flex-col gap-1.5 relative ${
                                compareTargetId === v.id || compareSourceId === v.id
                                  ? 'border-amber-500/50 bg-amber-500/5' 
                                  : 'border-white/5 bg-white/[0.01]'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-xs font-bold block text-white/90">{v.name}</span>
                                  <span className="text-[8px] font-mono opacity-40">{new Date(v.createdAt).toLocaleString()}</span>
                                </div>
                                <button 
                                  onClick={() => {
                                    if (confirm(`Do you want to restore the canvas to snapshot: "${v.name}"?`)) {
                                      setGraphData(JSON.parse(JSON.stringify(v.graphData)));
                                      setHistory([JSON.parse(JSON.stringify(v.graphData))]);
                                      setHistoryIndex(0);
                                    }
                                  }}
                                  title="Checkout as workspace"
                                  className="text-[8px] font-mono tracking-widest text-amber-500 hover:underline"
                                >
                                  RESTORE
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    {/* Compare Side-by-Side Panel */}
                    {currentVersions.length > 0 && (
                      <section className="space-y-3 pt-4 border-t border-white/5">
                        <div className="flex justify-between items-center">
                          <p className="text-[9px] uppercase tracking-[0.2em] font-bold opacity-50">Visual Diff Comparison</p>
                          <button 
                            onClick={() => setIsComparing(!isComparing)}
                            className={`text-[8px] font-mono tracking-wider px-2 py-0.5 border rounded-full transition-all ${
                              isComparing ? 'border-amber-500 text-amber-500 bg-amber-500/10 font-bold animate-pulse' : 'border-white/20 text-white/50 hover:border-white/40'
                            }`}
                          >
                            {isComparing ? 'DIFF ACTIVE' : 'DIFF OFF'}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <label className="block text-[8px] font-mono uppercase opacity-45 mb-1">Base Source (A)</label>
                            <select 
                              value={compareSourceId} 
                              onChange={(e) => setCompareSourceId(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 p-1 rounded-sm text-xs text-white"
                            >
                              <option value="current">Current Canvas</option>
                              {currentVersions.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[8px] font-mono uppercase opacity-45 mb-1">Compare Target (B)</label>
                            <select 
                              value={compareTargetId || ''} 
                              onChange={(e) => setCompareTargetId(e.target.value || null)}
                              className="w-full bg-black/40 border border-white/10 p-1 rounded-sm text-xs text-white"
                            >
                              <option value="">Select Target...</option>
                              {currentVersions.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {isComparing && compareTargetId && (
                          <div className="p-2.5 bg-black/20 border border-white/5 rounded-xs space-y-1.5 text-[9px] font-mono text-white/60">
                            <span className="uppercase tracking-widest font-bold block mb-1">Color Code Index</span>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                              <span>Added Elements (+ in B)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                              <span>Removed Elements (- in B)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              <span>Modified Fields (Value Diff)</span>
                            </div>
                          </div>
                        )}
                      </section>
                    )}
                  </div>

                  <footer className="text-[8px] font-mono opacity-25 text-center mt-4">
                    GM-VERSION-CONTROL-ENGINE
                  </footer>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`absolute inset-0 ${settings.appearance.theme === 'light' ? 'bg-gray-50' : 'bg-[#080808]'}`}>
              {graphData ? (
                <>
                  <GraphCanvas 
                    data={getDisplayGraphData() || graphData} 
                    onNodeClick={(node) => {
                      if (isMultiSelectMode) {
                        setSelectedNodeIds(prev => 
                          prev.includes(node.id) 
                            ? prev.filter(id => id !== node.id) 
                            : [...prev, node.id]
                        );
                      } else {
                        setSelectedNode(node);
                      }
                    }} 
                    isEditing={isEditing}
                    onAddLink={handleAddLink}
                    onDeleteLink={handleDeleteLink}
                    layout={layout}
                    setLayout={setLayout}
                    timelineStep={timelineStep}
                    setTimelineStep={setTimelineStep}
                    isPlaying={isPlaying}
                    setIsPlaying={setIsPlaying}
                    isMultiSelectMode={isMultiSelectMode}
                    selectedNodeIds={selectedNodeIds}
                  />

                  {/* Accordion Collapsible Story Timeline at very bottom of right panel */}
                  <div className={`absolute bottom-0 left-0 right-0 z-20 border-t bg-[#09090f]/95 backdrop-blur-md transition-all duration-300 overflow-hidden ${isUiHidden ? 'h-0 border-t-0 pointer-events-none' : isTimelineExpanded ? 'h-36 border-white/5' : 'h-10 border-white/5'}`}>
                    <div 
                      onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                      className="h-10 px-4 flex items-center justify-between cursor-pointer select-none hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Sliders size={13} className="text-amber-500 animate-pulse" />
                        <span className="text-[10px] tracking-widest uppercase font-bold text-white/70">Story Timeline System</span>
                        {timelineStep !== null && (
                          <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded ml-2">
                            Stage {timelineStep} of {graphData.nodes?.length || 0}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (timelineStep === null) {
                              setTimelineStep(1);
                            }
                            setIsPlaying(!isPlaying);
                          }}
                          className="p-1 text-white hover:text-amber-500 transition-colors"
                        >
                          {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                        </button>
                        <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest text-[8px]">
                          {isTimelineExpanded ? 'Collapse' : 'Expand Timeline'}
                        </span>
                      </div>
                    </div>

                    {isTimelineExpanded && (
                      <div className="px-4 pb-4 space-y-3">
                        <p className="text-[10px] text-white/50 leading-relaxed font-sans font-light">
                          Stagger the rendering of nodes to replay the sequence of event milestones and chronological layout introductions step-by-step.
                        </p>

                        <div className="flex items-center gap-4 bg-black/40 p-2.5 rounded border border-white/5">
                          <button 
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="p-1.5 text-white hover:bg-white/10 rounded transition-all shrink-0"
                          >
                            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                          </button>
                          
                          <input 
                            type="range" 
                            min="1" 
                            max={graphData.nodes?.length || 1} 
                            value={timelineStep || 1} 
                            onChange={(e) => {
                              setIsPlaying(false);
                              setTimelineStep(parseInt(e.target.value));
                            }}
                            className="flex-1 h-1 bg-white/15 accent-amber-500 rounded-lg cursor-pointer" 
                          />

                          <span className="text-[10px] font-mono text-white/60 w-16 text-right">
                            {timelineStep || 1} / {graphData.nodes?.length || 1}
                          </span>

                          <button
                            onClick={() => {
                              setTimelineStep(null);
                              setIsPlaying(false);
                            }}
                            className="text-[9px] px-2 py-0.5 uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 border border-white/10 rounded transition-all"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center pt-20 lg:pt-0">
                  <div className="relative">
                    <div className={`text-[120px] lg:text-[200px] leading-none font-serif font-light absolute -top-16 lg:-top-24 -left-8 lg:-left-12 select-none ${settings.appearance.theme === 'light' ? 'text-black/[0.03]' : 'text-white/[0.03]'}`}>00</div>
                    <motion.div
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 5, repeat: Infinity }}
                      className="relative z-10 text-center"
                    >
                      <p className={`text-[9px] lg:text-[10px] tracking-[0.5em] uppercase font-bold ${settings.appearance.theme === 'light' ? 'text-black/20' : 'text-white/20'}`}>
                        Awaiting Signal Protocol
                      </p>
                    </motion.div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : view === 'dashboard' ? (
          <div className={`flex-1 overflow-y-auto p-12 lg:p-24 transition-colors duration-500 ${settings.appearance.theme === 'light' ? 'bg-gray-50' : 'bg-[#080808]'}`}>
            <header className={`mb-16 border-b pb-8 flex justify-between items-end ${settings.appearance.theme === 'light' ? 'border-black/5' : 'border-white/10'}`}>
              <div>
                <h2 className={`text-xs tracking-[0.4em] uppercase font-bold mb-2 ${settings.appearance.theme === 'light' ? 'text-black/40' : 'text-white/40'}`}>Workspace Archives</h2>
                <div className={`font-serif italic text-5xl ${settings.appearance.theme === 'light' ? 'text-black' : 'text-white'}`}>Neural Repository</div>
              </div>
              <div className={`text-[10px] tracking-widest uppercase font-bold ${settings.appearance.theme === 'light' ? 'text-black/20' : 'text-white/20'}`}>
                Logged Extractions: {extractions.length}
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {extractions.map((ex) => (
                <motion.div
                  key={ex.id}
                  whileHover={{ y: -4 }}
                  onClick={() => { 
                    setGraphData(ex.graphData); 
                    setHistory([ex.graphData]);
                    setHistoryIndex(0);
                    setInputText(ex.inputText); 
                    setCurrentExtractionId(ex.id);
                    setIsGraphShared(ex.isShared || false);
                    setCollabActive(false);
                    setCurrentExtractionOwnerId(ex.userId || null);
                    setView('canvas'); 
                  }}
                  className={`group border p-8 rounded-sm cursor-pointer transition-all flex flex-col h-64 justify-between ${
                    settings.appearance.theme === 'light' 
                      ? 'bg-white border-black/5 hover:border-black/20 text-black' 
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/20 text-white'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className={`text-[9px] uppercase tracking-[0.2em] font-bold ${settings.appearance.theme === 'light' ? 'text-black/30' : 'text-white/30'}`}>
                        Extraction Trace
                      </span>
                      <button 
                        onClick={(e) => handleDelete(e, ex.id)}
                        className={`opacity-0 group-hover:opacity-100 transition-all ${settings.appearance.theme === 'light' ? 'text-black/20 hover:text-red-500' : 'text-white/20 hover:text-red-500'}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <h3 className={`text-2xl font-serif italic leading-tight mb-2 truncate ${settings.appearance.theme === 'light' ? 'text-black' : 'text-white'}`}>
                      {ex.title}
                    </h3>
                    <p className={`text-[10px] line-clamp-3 leading-relaxed tracking-wider ${settings.appearance.theme === 'light' ? 'text-black/50' : 'text-white/40'}`}>
                      {ex.inputText}
                    </p>
                  </div>
                  <div className={`flex justify-between items-center pt-6 border-t text-[9px] uppercase tracking-widest font-bold ${
                    settings.appearance.theme === 'light' ? 'border-black/5 text-black/20' : 'border-white/5 text-white/20'
                  }`}>
                    <span>{ex.graphData?.nodes?.length || 0} Entities</span>
                    <span>{new Date(ex.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}</span>
                  </div>
                </motion.div>
              ))}

              {extractions.length === 0 && (
                <div className="col-span-full py-20 border border-dashed border-white/5 flex flex-col items-center justify-center text-white/20">
                  <History size={48} strokeWidth={0.5} className="mb-4" />
                  <p className="text-xs uppercase tracking-widest">No neural traces archived</p>
                </div>
              )}
            </div>
          </div>
        ) : view === 'quantum_3d' ? (
          <div className="flex-1 flex flex-col relative overflow-hidden bg-[#07070c]">
             {/* Beautiful Header for Quantum 3D View */}
             <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between shrink-0 bg-[#09090f]/75 backdrop-blur-md z-20">
               <div className="flex items-center gap-3">
                 <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                 <div>
                   <h2 className="text-[10px] tracking-[0.3em] uppercase font-bold text-amber-500/90 font-mono">DEDICATED EXPLORER MODULE</h2>
                   <h1 className="text-sm font-serif italic text-white/90">Quantum 3D Narrative Universe Mapping</h1>
                 </div>
               </div>

               <div className="flex items-center gap-3">
                 <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
                   {graphData?.nodes?.length || 0} Neural Coordinates
                 </span>
                 <button 
                   onClick={() => setView('canvas')} 
                   className="text-[9px] uppercase tracking-wider font-bold px-3 py-1.5 border border-white/10 hover:border-white/30 hover:bg-white/5 rounded-sm text-white/80 transition-all flex items-center gap-1.5"
                 >
                   <Network size={12} />
                   Switch to 2D Layer
                 </button>
               </div>
             </header>

             {/* Dedicated Full Visual Area */}
             <div className="flex-1 relative overflow-auto">
               {graphData ? (
                 <GraphCanvas 
                   data={getDisplayGraphData() || graphData} 
                   onNodeClick={(node) => {
                      if (isMultiSelectMode) {
                        setSelectedNodeIds(prev => 
                          prev.includes(node.id) 
                            ? prev.filter(id => id !== node.id) 
                            : [...prev, node.id]
                        );
                      } else {
                        setSelectedNode(node);
                      }
                    }} 
                    isMultiSelectMode={isMultiSelectMode}
                    selectedNodeIds={selectedNodeIds}
                    isEditing={false}
                   onAddLink={handleAddLink}
                   onDeleteLink={handleDeleteLink}
                   layout="3d"
                   setLayout={() => {}}
                 />
               ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center text-white/20">
                   <Orbit size={48} strokeWidth={0.5} className="mb-4 text-amber-500 animate-[spin_8s_linear_infinite]" />
                   <p className="text-xs uppercase tracking-widest">No Narrative Signal Processed</p>
                 </div>
               )}
             </div>

             {/* Dynamic controls and helper badge */}
             <div className="absolute bottom-6 left-6 z-20 bg-[#09090f]/90 border border-white/10 backdrop-blur-md px-4 py-3 max-w-[280px] pointer-events-auto rounded">
               <p className="text-[9px] uppercase tracking-widest font-bold text-amber-400 mb-1 font-mono">Quantum Navigation Matrix</p>
               <p className="text-[10px] text-white/60 leading-relaxed font-sans">
                 Interact with entities in multi-dimensional space. Select nodes to inspect coordinates or toggle pin structures.
               </p>
               <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5 text-[9px] font-mono text-white/40">
                 <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Rotate (Left Click)</span>
                 <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Inspect (Click Node)</span>
               </div>
             </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto bg-bg">
            <HelpAndGuide />
          </div>
        )}

        {/* 📋 Selected Node detail information panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className={`absolute top-0 right-0 bottom-0 w-full sm:w-96 border-l p-10 z-50 flex flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.5)] backdrop-blur-md ${
                settings.appearance.theme === 'light' 
                  ? 'bg-white/95 border-black/10' 
                  : 'bg-[#0c0c0c]/98 border-white/10'
              }`}
            >
              <div className="flex justify-between items-start mb-8">
                 <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedNode.customColor || (NODE_COLORS as any)[selectedNode.type] || NODE_COLORS.other }} />
                           <select 
                             value={selectedNode.type}
                             onChange={(e) => handleUpdateNode({ ...selectedNode, type: e.target.value as any })}
                             className={`text-[9px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 border outline-none cursor-pointer transition-colors ${
                               settings.appearance.theme === 'light' 
                                 ? 'bg-white border-black/10 text-black hover:border-amber-500' 
                                 : 'bg-black border-white/10 text-white hover:border-amber-500'
                             }`}
                           >
                             {[
                               'person', 'location', 'event', 'object', 'concept', 'other', 
                               'organization', 'species', 'artifact', 'technology', 'theme', 
                               'process', 'goal', 'evidence', 'timeline', 'faction', 
                               'data', 'law', 'myth', 'theory', 'role'
                             ].sort().map(t => (
                               <option key={t} value={t}>{t}</option>
                             ))}
                           </select>
                        </div>
                      ) : (
                        <span 
                           className={`text-[9px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 flex items-center gap-2 ${settings.appearance.theme === 'light' ? 'bg-black text-white' : 'bg-white text-black'}`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedNode.customColor || (NODE_COLORS as any)[selectedNode.type] || NODE_COLORS.other }} />
                          {selectedNode.type}
                        </span>
                      )}
                      
                      <button 
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${selectedNode.label}"? This will also remove all connected links.`)) {
                            handleDeleteNode(selectedNode.id);
                            if (subgraphFocusNodeId === selectedNode.id) {
                              setSubgraphFocusNodeId(null);
                            }
                          }
                        }}
                        className="text-[9px] text-red-500 hover:text-red-400 font-bold uppercase tracking-widest ml-auto bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded transition-colors"
                        title="Purge this entity and all connected links"
                      >
                        Purge Entity
                      </button>
                    </div>
                    {isEditing ? (
                      <input 
                        type="text"
                        value={selectedNode.label}
                        onChange={(e) => handleUpdateNode({ ...selectedNode, label: e.target.value })}
                        className={`text-3xl font-serif italic bg-transparent border-b outline-none focus:border-amber-500 transition-colors w-full ${settings.appearance.theme === 'light' ? 'text-black border-black/10' : 'text-white border-white/10'}`}
                      />
                    ) : (
                      <h3 className={`text-4xl font-serif italic leading-tight ${settings.appearance.theme === 'light' ? 'text-black' : 'text-white'}`}>
                        {selectedNode.label}
                      </h3>
                    )}
                 </div>
                 <button 
                  onClick={() => setSelectedNode(null)}
                  className={`transition-colors ml-4 ${settings.appearance.theme === 'light' ? 'text-black/20 hover:text-black' : 'text-white/20 hover:text-white'}`}
                >
                  <X size={24} strokeWidth={1} />
                </button>
              </div>

              {/* ✨ "What-If" Analysis & "Subgraph Focus" controls */}
              {user && (
                <div className="grid grid-cols-2 gap-2 pt-2 pb-4 border-b border-white/5">
                  <button
                    onClick={handleAiWhatIf}
                    disabled={isAiLoading}
                    className="py-2.5 rounded text-[9px] uppercase font-bold tracking-widest border border-white/10 text-white/75 hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-1.5"
                  >
                    {isAiLoading ? <Loader2 size={10} className="animate-spin text-white/40" /> : <Sparkles size={11} className="text-amber-500 animate-pulse" />}
                    "What If ?"
                  </button>
                  
                  <button
                    onClick={() => {
                      if (subgraphFocusNodeId === selectedNode.id) {
                        setSubgraphFocusNodeId(null);
                      } else {
                        setSubgraphFocusNodeId(selectedNode.id);
                      }
                    }}
                    className={`py-2.5 rounded text-[9px] uppercase font-bold tracking-widest border transition-all flex items-center justify-center gap-1.5 ${
                      subgraphFocusNodeId === selectedNode.id 
                        ? 'bg-amber-500 border-amber-500 text-black hover:bg-amber-600' 
                        : 'border-white/10 text-white/75 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {subgraphFocusNodeId === selectedNode.id ? 'Exit Focus' : 'Focus Subgraph'}
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-8 scrollbar-hide py-4 pr-1">
                <section>
                  <h4 className={`text-[10px] tracking-[0.3em] uppercase font-bold mb-3 ${settings.appearance.theme === 'light' ? 'text-black/30' : 'text-white/30'}`}>Neural Profile</h4>
                  {isEditing ? (
                    <textarea 
                      value={selectedNode.description || ''}
                      onChange={(e) => handleUpdateNode({ ...selectedNode, description: e.target.value })}
                      className={`w-full h-24 bg-transparent border p-3 text-xs leading-relaxed outline-none transition-all resize-none rounded-sm ${settings.appearance.theme === 'light' ? 'border-black/10 text-black/80 focus:border-amber-500/30' : 'border-white/10 text-white/80 focus:border-amber-500/30'}`}
                      placeholder="Add entity context..."
                    />
                  ) : (
                    <p className={`text-sm leading-relaxed font-sans font-light ${settings.appearance.theme === 'light' ? 'text-black/70' : 'text-white/70'}`}>
                      {selectedNode.description || 'No detailed analysis found in the provided context signal.'}
                    </p>
                  )}
                </section>

                {/* Manual Visual Customizer & Merge tools during editing */}
                <section className={`pt-6 border-t ${settings.appearance.theme === 'light' ? 'border-black/5' : 'border-white/5'}`}>
                  <h4 className={`text-[10px] tracking-[0.3em] uppercase font-bold mb-3 ${settings.appearance.theme === 'light' ? 'text-black/30' : 'text-white/30'}`}>Customize Entity</h4>
                  {isEditing ? (
                    <div className="space-y-4">
                      {/* Color bubbles */}
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-white/40 block mb-1">Node Bubble Palette</span>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {['#f5c842', '#4ecdc4', '#ff6b6b', '#a78bfa', '#fb923c', '#3b82f6', '#10b981', '#ec4899'].map(color => (
                            <button
                              key={color}
                              onClick={() => handleUpdateNode({ ...selectedNode, customColor: color })}
                              className={`w-5 h-5 rounded-full border transition-all ${selectedNode.customColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                          <input 
                            type="text" 
                            placeholder="or #HEX"
                            value={selectedNode.customColor || ''}
                            onChange={(e) => handleUpdateNode({ ...selectedNode, customColor: e.target.value })}
                            className="bg-black/30 border border-white/10 rounded px-1.5 py-0.5 text-[9px] font-mono text-white outline-none w-16"
                          />
                        </div>
                      </div>

                      {/* Icon Emojis */}
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-white/40 block mb-1">Node Emoji Symbol</span>
                        <div className="flex flex-wrap gap-1.5 items-center mb-1.5">
                          {['👤', '📍', '📅', '🔑', '💡', '❓', '🏢', '🧬', '🏺', '💻', '🎭', '🎯', '👑', '🛡️'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleUpdateNode({ ...selectedNode, customIcon: emoji })}
                              className={`w-6 h-6 flex items-center justify-center rounded text-xs hover:bg-white/10 ${selectedNode.customIcon === emoji ? 'bg-white/15 border border-white/20' : ''}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        <input 
                          type="text" 
                          placeholder="Paste custom emoji symbol..."
                          value={selectedNode.customIcon || ''}
                          onChange={(e) => handleUpdateNode({ ...selectedNode, customIcon: e.target.value.substring(0, 2) })}
                          className="w-full bg-black/40 border border-white/10 px-2 py-1 rounded text-[10px] text-white outline-none"
                        />
                      </div>

                      {/* Merge option */}
                      <div className="pt-2 border-t border-white/5">
                        <span className="text-[9px] uppercase tracking-wider text-white/40 block mb-1">Merge into this Entity</span>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleMergeNodes(e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="w-full bg-black/40 border border-white/10 text-[9px] px-2 py-1.5 rounded text-white outline-none"
                        >
                          <option value="">-- Choose node to merge into this --</option>
                          {graphData?.nodes
                            .filter(n => n.id !== selectedNode.id)
                            .map(n => (
                              <option key={n.id} value={n.id}>Merge with: {n.label}</option>
                            ))
                          }
                        </select>
                        <p className="text-[8px] text-white/30 leading-normal mt-1">
                          Consolidation merges narrative profiles, updates references, and deletes the secondary node.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-white/30 uppercase tracking-widest">Aesthetic Hash:</span>
                        <div 
                          className="w-2.5 h-2.5 rounded-full border border-white/5" 
                          style={{ backgroundColor: selectedNode.customColor || (NODE_COLORS as any)[selectedNode.type] || NODE_COLORS.other }} 
                        />
                        <span className="text-[9px] text-white/50 font-mono">{selectedNode.customColor || 'Inherited Default'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-white/30 uppercase tracking-widest">Icon Overlay:</span>
                        <span className="text-xs">{selectedNode.customIcon || 'Standard Default'}</span>
                      </div>
                    </div>
                  )}
                </section>

                <section className={`pt-6 border-t ${settings.appearance.theme === 'light' ? 'border-black/5' : 'border-white/5'}`}>
                  <h4 className={`text-[10px] tracking-[0.3em] uppercase font-bold mb-4 ${settings.appearance.theme === 'light' ? 'text-black/30' : 'text-white/30'}`}>Metric Trace</h4>
                  <div className="space-y-4">
                    <MetricLine theme={settings.appearance.theme} label="Identifier" value={selectedNode.id.toUpperCase()} />
                    <MetricLine 
                      theme={settings.appearance.theme} 
                      label="Entity Class" 
                      value={selectedNode.type.toUpperCase()} 
                      color={(NODE_COLORS as any)[selectedNode.type]}
                    />
                    <MetricLine theme={settings.appearance.theme} label="Signal Depth" value="TRACE-CORE" />
                  </div>
                </section>
              </div>

              <footer className={`mt-auto pt-4 border-t ${settings.appearance.theme === 'light' ? 'border-black/5' : 'border-white/5'}`}>
                <div className={`text-[10px] tracking-[0.2em] uppercase ${settings.appearance.theme === 'light' ? 'text-black/20' : 'text-white/20'}`}>End of Sequence Trace</div>
              </footer>
            </motion.div>
          )}
        </AnimatePresence>

        <SettingsPanel 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          graphData={graphData || { title: 'New Map', nodes: [], links: [] }}
          onLoadGraph={(data) => {
            setGraphData(data);
            setHistory([data]);
            setHistoryIndex(0);
            setInputText(data.title || '');
            setCurrentExtractionId(null);
          }}
        />
      </main>
    </div>
  );
};

const NavBtn = ({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-sm transition-all group ${active ? 'bg-white/5 text-white' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.02]'}`}
  >
    <div className="flex items-center gap-3">
      <span className={active ? 'text-white' : 'text-white/20 group-hover:text-white/40'}>{icon}</span>
      <span className="text-[10px] uppercase tracking-[0.2em] font-bold">{label}</span>
    </div>
    {count !== undefined && count > 0 && (
      <span className="text-[9px] bg-white text-black px-1.5 py-0.5 font-bold tabular-nums">{count}</span>
    )}
  </button>
);

const MetricLine = ({ label, value, theme, color }: { label: string; value: string, theme?: string, color?: string }) => (
  <div className="flex justify-between items-center text-[10px] tracking-widest">
    <span className={`${theme === 'light' ? 'text-black/20' : 'text-white/20'} uppercase`}>{label}</span>
    <div className="flex items-center gap-2">
      {color && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />}
      <span className={`${theme === 'light' ? 'text-black' : 'text-white'} font-mono italic`}>{value}</span>
    </div>
  </div>
);

const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-2">
    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 5px ${color}80` }} />
    <span className="truncate">{label}</span>
  </div>
);

const getNodeColor = (type: string) => {
  return (NODE_COLORS as any)[type] || NODE_COLORS.other;
};

export default App;
