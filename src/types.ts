export interface AppSettings {
  appearance: {
    nodeSize: 'small' | 'medium' | 'large';
    linkThickness: number;
    showArrows: boolean;
    labelSize: number;
    theme: 'dark' | 'light';
  };
  physics: {
    linkDistance: number;
    repulsionStrength: number;
    gravity: number;
    autoFreeze: boolean;
    autoFitOnGenerate: boolean;
    lockLayout: boolean;
  };
  ai: {
    maxNodes: number;
    detailLevel: 'quick' | 'deep';
    language: string;
    customNodeTypes: string[];
    mode: 'general' | 'creative' | 'academic' | 'professional' | 'personal' | 'detective';
  };
  api: {
    provider: 'gemini' | 'openai' | 'groq' | 'aki';
    model: string;
    timeout: number;
    keys: {
      gemini?: string;
      openai?: string;
      groq?: string;
    };
  };
}

export type NodeType = 
  | 'person' | 'location' | 'event' | 'object' | 'concept' | 'other' 
  | 'organization' | 'species' | 'artifact' | 'technology' | 'theme' 
  | 'process' | 'goal' | 'evidence' | 'timeline' | 'faction' 
  | 'data' | 'law' | 'myth' | 'theory' | 'role';

export interface Node {
  id: string;
  label: string;
  type: NodeType;
  description?: string;
  customColor?: string; // Manual node customized color
  customIcon?: string;  // Manual custom icon character / emoji
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  diffStatus?: 'added' | 'removed' | 'modified' | 'identical';
}

export interface Link {
  source: string;
  target: string;
  label: string;
  diffStatus?: 'added' | 'removed' | 'modified' | 'identical';
}

export interface GraphVersion {
  id: string;
  name: string;
  createdAt: number;
  graphData: GraphData;
}

export interface GraphData {
  title: string;
  nodes: Node[];
  links: Link[];
  versions?: GraphVersion[];
  isShared?: boolean;
}
