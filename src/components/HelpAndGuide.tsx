import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Key, 
  HelpCircle, 
  Sliders, 
  Square, 
  Undo, 
  Redo, 
  GitBranch, 
  Share2, 
  Network, 
  Orbit, 
  GitFork, 
  Grid, 
  Plus, 
  X, 
  ArrowRight, 
  ExternalLink, 
  Info, 
  Search, 
  ChevronRight, 
  BookOpen, 
  Shield, 
  Laptop, 
  Cpu, 
  Download, 
  Eye, 
  Maximize2, 
  RotateCcw, 
  AlertCircle,
  Clock,
  Code,
  Lock,
  MessageSquare
} from 'lucide-react';

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  keywords: string[];
}

export const HelpAndGuide: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('getting-started');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  
  const sectionRefs = {
    'getting-started': useRef<HTMLDivElement>(null),
    'api-setup': useRef<HTMLDivElement>(null),
    'understanding-graph': useRef<HTMLDivElement>(null),
    'controls-guide': useRef<HTMLDivElement>(null),
    'settings-explained': useRef<HTMLDivElement>(null),
    'layouts': useRef<HTMLDivElement>(null),
    'tips-tricks': useRef<HTMLDivElement>(null),
    'faq': useRef<HTMLDivElement>(null),
  };

  const sections: HelpSection[] = [
    { id: 'getting-started', title: 'Getting Started', icon: <BookOpen size={16} />, keywords: ['quickstart', 'graphmind', 'introduction', 'welcome', 'steps'] },
    { id: 'api-setup', title: 'API Configuration', icon: <Key size={16} />, keywords: ['api', 'key', 'token', 'deepseek', 'openai', 'gemini', 'claude', 'groq', 'console'] },
    { id: 'understanding-graph', title: 'Understanding the Graph', icon: <Cpu size={16} />, keywords: ['legend', 'node', 'link', 'color', 'person', 'place', 'event', 'faction'] },
    { id: 'controls-guide', title: 'Controls Guide', icon: <Sliders size={16} />, keywords: ['buttons', 'interface', 'zoom', 'labels', 'freeze', 'clear', 'undo', 'redo'] },
    { id: 'settings-explained', title: 'Settings Explained', icon: <Laptop size={16} />, keywords: ['appearance', 'physics', 'ai', 'export', 'category', 'variables'] },
    { id: 'layouts', title: 'Layout Topology', icon: <Network size={16} />, keywords: ['force', 'circular', 'tree', 'grid', 'diagram', 'algorithms'] },
    { id: 'tips-tricks', title: 'Tips & Tricks', icon: <Sparkles size={16} />, keywords: ['power', 'user', 'best', 'models', 'incremental', 'pin', 'drag'] },
    { id: 'faq', title: 'Frequently Asked Questions', icon: <HelpCircle size={16} />, keywords: ['safety', 'offline', 'accuracy', 'edit', 'cost', 'privacy', 'limit'] },
  ];

  // Intersection Observer to update active navigation item during scrolling
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0,
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);
    
    Object.values(sectionRefs).forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, []);

  const handleScrollTo = (id: keyof typeof sectionRefs) => {
    const targetRef = sectionRefs[id];
    if (targetRef && targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  // Real-time search filter matching
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const lowerQuery = searchQuery.toLowerCase();
    return sections.filter((sec) => {
      return (
        sec.title.toLowerCase().includes(lowerQuery) ||
        sec.keywords.some((k) => k.includes(lowerQuery))
      );
    });
  }, [searchQuery]);

  // Providers list for API Setup
  const apiProviders = [
    {
      name: 'Gemini (Google AI)',
      tier: 'Generative Models',
      freeInfo: 'Generous tier with millions of input tokens free per month via Google AI Studio.',
      consoleUrl: 'https://aistudio.google.com/',
      color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/20'
    },
    {
      name: 'Claude (Anthropic)',
      tier: 'Executive Reasoning',
      freeInfo: 'Initial free evaluation credits. Excellent structured JSON generation capabilities.',
      consoleUrl: 'https://console.anthropic.com/',
      color: 'from-amber-500/10 to-orange-500/10 border-amber-500/20'
    },
    {
      name: 'DeepSeek',
      tier: 'Efficient & Affordable',
      freeInfo: 'Extremely economic rates with massive complimentary starter token credits.',
      consoleUrl: 'https://platform.deepseek.com/',
      color: 'from-cyan-500/10 to-blue-600/10 border-cyan-500/20'
    },
    {
      name: 'OpenAI',
      tier: 'Industry Standard',
      freeInfo: 'Consistent structured outputs. Includes $5-18 initial developer grants on account creation.',
      consoleUrl: 'https://platform.openai.com/',
      color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20'
    },
    {
      name: 'Groq Cloud',
      tier: 'Ultra-High Speed',
      freeInfo: 'Extremely fast throughput with highly generous free daily rate limits for Llama 3 models.',
      consoleUrl: 'https://console.groq.com/',
      color: 'from-pink-500/10 to-rose-500/10 border-pink-500/20'
    }
  ];

  // Node Legend details
  const nodeLegend = [
    { type: 'Person', color: '#f5c842', desc: 'Primary characters, narrative entities, historic figures, or core actors.' },
    { type: 'Place', color: '#10b981', desc: 'Physical setting landmarks, dimensions, territories, or structural nodes.' },
    { type: 'Factions', color: '#6366f1', desc: 'Factions, guilds, corporate entities, national alliances, or military forces.' },
    { type: 'Event', color: '#3b82f6', desc: 'Situational incidents, battles, councils, timeline milestones, or historical actions.' },
    { type: 'Object', color: '#a855f7', desc: 'Key artifacts, technological items, weapons, crucial evidence, or objects.' },
    { type: 'Concept', color: '#8b5cf6', desc: 'Esoteric theories, laws of nature, political philosophies, or cosmic factors.' },
    { type: 'Ability', color: '#f43f5e', desc: 'Signatures techniques, psychic potentials, technological protocols, or custom skills.' }
  ];

  // FAQs list
  const faqs = [
    {
      q: "Is my imported data safe and confidential?",
      a: "Yes. GraphMind executes strictly local processing in the client viewport. Standard extractions proxy model operations without retaining historical corpora unless manually saved to your secure Firebase Neural Repository. No model utilizes your content streams to compute derivative public algorithms."
    },
    {
      q: "Why did the NLP parser miss some characters or settings in my lore?",
      a: "The extraction model relies on explicit narrative associations. For complex texts, try organizing your input using structured definitions, or use a model with a larger reasoning footprint like Claude 3.5 Sonnet. You can also manually add missing elements via Edit Mode."
    },
    {
      q: "Can I manually add, link, or edit nodes in the canvas?",
      a: "Absolutely. Toggle 'Edit Mode' (via System Core, the visual pencil flag, or our floating mobile menu) to unlock advanced canvas modifications. Drag links outward, double-click entities to alter names on the fly, or delete elements manually."
    },
    {
      q: "Does GraphMind function offline?",
      a: "The central canvas, layout modifiers, and local visualization structure continue to spin and render without active network capabilities. Real-time extraction engines and cloud persistence modules require an continuous synchronization connection."
    },
    {
      q: "How do I clear the cached canvas graph completely?",
      a: "Enter Edit Mode, or trigger 'Clear Protocol' in our controls console. This frees the local buffer so that your mapping dashboard and narrative graphs start with a fresh slate."
    },
    {
      q: "What settings are best for a highly complex network of nodes?",
      a: "Increase 'Charge Distance' and decrease 'Link Strength' in the system core physics panel. This ensures spacious layout breathing, minimizing overlap across complex connections."
    },
    {
      q: "Can I coordinate multiple sequential versions of a storyboard?",
      a: "Yes. Use our Branches feature. By branching a neural map, you create separate sandbox variations. This is perfect for simulating 'What If' plots or comparing alternate timeline sequence structures."
    },
    {
      q: "How can I export the interactive networks that I've designed?",
      a: "Open System Core settings, navigate to the 'Export' section, and download your graph in JSON or copy the graph parameters as a pristine, shareable network state string."
    }
  ];

  return (
    <div className="w-full h-full min-h-screen bg-bg text-[#E0E0E0] font-sans flex flex-col relative select-text" id="help-system-root">
      
      {/* 🔍 TOP BAR & REAL-TIME SEARCH */}
      <div className="sticky top-0 z-30 bg-bg/85 backdrop-blur-md border-b border-white/5 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 max-w-7xl mx-auto w-full">
        <div>
          <span className="text-[9px] tracking-[0.4em] uppercase font-bold text-accent/80 font-mono">Documentation Core</span>
          <h1 className="font-serif italic text-2xl lg:text-3xl text-white mt-1">System Help & Guides</h1>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45" />
          <input 
            type="text"
            placeholder="Search keywords, FAQs, or setup steps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.07] border border-white/10 focus:border-accent/40 rounded transition-all outline-none font-sans text-xs text-white"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* 📱 MOBILE HORIZONTAL SCROLLABLE TABS */}
      <div className="lg:hidden sticky top-[81px] z-25 bg-[#0a0a0f] border-b border-white/5 py-3.5 px-4 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-1.5 shadow-md">
        {filteredSections.map((sec) => (
          <button
            key={sec.id}
            onClick={() => handleScrollTo(sec.id as any)}
            className={`px-3.5 py-2 rounded text-[10px] font-bold tracking-wider uppercase transition-all inline-flex items-center gap-2 ${
              activeSection === sec.id 
                ? 'bg-accent/15 text-accent border border-accent/25' 
                : 'text-white/50 border border-transparent hover:text-white/80'
            }`}
          >
            {sec.icon}
            {sec.title}
          </button>
        ))}
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 lg:py-12 flex flex-col lg:flex-row gap-8 relative">
        
        {/* 📑 DESKTOP FIXED/STICKY LEFT SIDEBAR */}
        <aside className="w-[280px] shrink-0 sticky top-28 self-start hidden lg:flex flex-col gap-6" id="help-desktop-sidebar">
          <div className="bg-[#0c0c14]/40 border border-white/5 rounded-lg p-5">
            <h3 className="text-[10px] tracking-[0.25em] uppercase font-bold text-white/40 mb-3.5 font-mono">System Index</h3>
            <nav className="flex flex-col gap-1.5">
              {filteredSections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => handleScrollTo(sec.id as any)}
                  className={`px-3.5 py-2.5 rounded text-left text-xs font-semibold tracking-wide transition-all flex items-center gap-3 w-full border ${
                    activeSection === sec.id 
                      ? 'bg-white/5 text-accent border-white/10 shadow-sm' 
                      : 'text-white/50 border-transparent hover:text-white/85 hover:bg-white/[0.01]'
                  }`}
                >
                  <span className={activeSection === sec.id ? 'text-accent' : 'text-white/35'}>{sec.icon}</span>
                  {sec.title}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-4 bg-accent/5 border border-accent/15 rounded-lg">
            <h4 className="text-[9px] font-mono uppercase tracking-widest text-accent font-bold mb-1">Developer Portal</h4>
            <p className="text-[10px] text-white/50 leading-relaxed font-sans font-light">
              Deep dive into full pipeline orchestration. Synchronize state matrices across remote instances.
            </p>
          </div>
        </aside>

        {/* 📖 CONTENT VIEWPORT AREA */}
        <div className="flex-1 space-y-20 lg:pb-36" id="help-content-viewport">
          {filteredSections.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-lg">
              <AlertCircle className="mx-auto text-white/20 mb-3" size={32} />
              <p className="text-sm text-white/70 font-serif italic mb-1">Null matches to keyword index</p>
              <p className="text-xs text-white/40 font-mono">Revise queries and retry lookup</p>
            </div>
          ) : null}

          {/* SECTION 1: GETTING STARTED */}
          {filteredSections.some(s => s.id === 'getting-started') && (
            <section 
              id="getting-started" 
              ref={sectionRefs['getting-started']} 
              className="scroll-mt-28 transition-all duration-700 animate-fade-in"
            >
              <div className="border-t border-accent pt-6">
                <span className="text-[9px] font-mono tracking-[0.3em] text-accent uppercase font-bold">Protocol 01</span>
                <h2 className="text-2xl lg:text-3xl font-serif italic text-white mb-4">Getting Started with GraphMind</h2>
                
                <p className="text-xs lg:text-sm text-[#A0A0A5] leading-relaxed max-w-3xl mb-8 font-sans font-light">
                  GraphMind is a premium neural tracing workspace designed to map text narrative pipelines, lore documentation, dialog streams, and entity matrices visually in real time. It is tailored for <span className="font-mono text-[11px] bg-white/5 text-white/95 px-1 rounded">fictional world-builders</span>, <span className="font-mono text-[11px] bg-white/5 text-white/95 px-1 rounded">screenplay screeners</span>, and <span className="font-mono text-[11px] bg-white/5 text-white/95 px-1 rounded">story archivists</span> looking for non-linear, semantic intelligence over structural relationships.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Step 1 */}
                  <div className="bg-[#111118]/80 border border-white/5 hover:border-white/10 rounded-lg p-5 flex flex-col justify-between transition-all">
                    <div>
                      <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-mono text-xs font-bold mb-4">
                        01
                      </div>
                      <h3 className="text-sm font-bold text-white mb-2 font-serif italic">Supply Key Secret</h3>
                      <p className="text-[11px] text-[#A0A0A5] leading-relaxed font-sans font-light">
                        Procure a free API credentials token key from deepseek, gemini, or anthropic engines, and input it in our Settings core.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[10px] tracking-widest uppercase font-mono text-accent">
                      <span>Prerequisite</span>
                      <ArrowRight size={10} />
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-[#111118]/80 border border-white/5 hover:border-white/10 rounded-lg p-5 flex flex-col justify-between transition-all">
                    <div>
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono text-xs font-bold mb-4">
                        02
                      </div>
                      <h3 className="text-sm font-bold text-white mb-2 font-serif italic">Feed Local Context</h3>
                      <p className="text-[11px] text-[#A0A0A5] leading-relaxed font-sans font-light">
                        Paste screenplay dialogues, descriptive back-story essays, or raw entity data into the Input Signal container.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[10px] tracking-widest uppercase font-mono text-emerald-400">
                      <span>Ingress Stream</span>
                      <ArrowRight size={10} />
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-[#111118]/80 border border-white/5 hover:border-white/10 rounded-lg p-5 flex flex-col justify-between transition-all">
                    <div>
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-mono text-xs font-bold mb-4">
                        03
                      </div>
                      <h3 className="text-sm font-bold text-white mb-2 font-serif italic">Execute Trace Extraction</h3>
                      <p className="text-[11px] text-[#A0A0A5] leading-relaxed font-sans font-light">
                        Select an extraction engine and push 'Execute Trace'. Let the transformer synthesize entities and project connections instantly.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[10px] tracking-widest uppercase font-mono text-blue-400">
                      <span>Visualization</span>
                      <ArrowRight size={10} />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 2: API SETUP */}
          {filteredSections.some(s => s.id === 'api-setup') && (
            <section 
              id="api-setup" 
              ref={sectionRefs['api-setup']} 
              className="scroll-mt-28 transition-all duration-700 animate-fade-in"
            >
              <div className="border-t border-accent pt-6">
                <span className="text-[9px] font-mono tracking-[0.3em] text-accent uppercase font-bold">Protocol 02</span>
                <h2 className="text-2xl lg:text-3xl font-serif italic text-white mb-4">API Configuration Portal</h2>
                
                <p className="text-xs lg:text-sm text-[#A0A0A5] leading-relaxed max-w-3xl mb-8 font-sans font-light">
                  GraphMind works strictly in local browser sandbox runtimes. To process context, you should set up an external API model provider. Below is the checklist to acquire complimentary free developer keys:
                </p>

                <div className="space-y-4">
                  {apiProviders.map((prov, i) => (
                    <div 
                      key={i} 
                      className={`relative overflow-hidden bg-gradient-to-r ${prov.color} border p-5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white font-mono">{prov.name}</h4>
                          <span className="text-[8px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 tracking-wider uppercase font-mono text-white/50">{prov.tier}</span>
                        </div>
                        <p className="text-[11px] text-white/60 leading-relaxed font-sans font-light max-w-xl">
                          {prov.freeInfo}
                        </p>
                      </div>
                      
                      <a 
                        href={prov.consoleUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-2.5 rounded border border-white/10 hover:border-accent bg-black/40 hover:bg-black/70 text-[9px] text-white/80 hover:text-accent uppercase tracking-widest font-mono font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap md:self-center self-start"
                      >
                        Acquire Token <ExternalLink size={10} />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* SECTION 3: UNDERSTANDING THE GRAPH */}
          {filteredSections.some(s => s.id === 'understanding-graph') && (
            <section 
              id="understanding-graph" 
              ref={sectionRefs['understanding-graph']} 
              className="scroll-mt-28 transition-all duration-700 animate-fade-in"
            >
              <div className="border-t border-accent pt-6">
                <span className="text-[9px] font-mono tracking-[0.3em] text-accent uppercase font-bold">Protocol 03</span>
                <h2 className="text-2xl lg:text-3xl font-serif italic text-white mb-4">Understanding the Graph Architecture</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" /> Network Elements
                    </h3>
                    <p className="text-[11px] text-[#A0A0A5] leading-relaxed font-sans font-light">
                      The canvas registers a non-linear network where characters, places, events, technologies, and concepts are represented as <span className="font-semibold text-white">Nodes</span>. The relationships linking separate entities are represented as weighted vector <span className="font-semibold text-white">Links</span>.
                    </p>
                    <ul className="text-[11px] text-[#A0A0A5] space-y-2 leading-relaxed">
                      <li className="flex items-start gap-2">
                        <span className="text-accent mt-0.5 font-bold font-mono">▸</span>
                        <div>
                          <strong className="text-white font-sans font-semibold">Weighted Nodes</strong>: Double-click nodes in Edit Mode to modify labels. Larger text indicates core entities as determined by total link density.
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-accent mt-0.5 font-bold font-mono">▸</span>
                        <div>
                          <strong className="text-white font-sans font-semibold">Directional Links</strong>: Faint structural lines track actions and relationships. Directed arrows pointing outward trace cause and direction of the action.
                        </div>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-[#111118]/40 border border-white/5 rounded-lg p-5 flex flex-col justify-center">
                    <h4 className="text-[9px] tracking-widest font-mono uppercase text-white/45 mb-4">Interactive Node Legend</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-2 gap-3.5">
                      {nodeLegend.map((n, idx) => (
                        <div key={idx} className="flex items-start gap-2 bg-white/[0.01] border border-white/5 p-2 rounded-lg">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 shadow-sm" 
                            style={{ 
                              backgroundColor: n.color,
                              boxShadow: `0 0 8px ${n.color}50`
                            }} 
                          />
                          <div>
                            <span className="text-[10px] font-bold text-white block">{n.type}</span>
                            <span className="text-[8px] text-[#A0A0A5] leading-tight block font-sans font-light">{n.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 4: CONTROLS GUIDE */}
          {filteredSections.some(s => s.id === 'controls-guide') && (
            <section 
              id="controls-guide" 
              ref={sectionRefs['controls-guide']} 
              className="scroll-mt-28 transition-all duration-700 animate-fade-in"
            >
              <div className="border-t border-accent pt-6">
                <span className="text-[9px] font-mono tracking-[0.3em] text-accent uppercase font-bold">Protocol 04</span>
                <h2 className="text-2xl lg:text-3xl font-serif italic text-white mb-4">Controls Matrix Reference</h2>
                
                <p className="text-xs lg:text-sm text-[#A0A0A5] leading-relaxed max-w-3xl mb-8 font-sans font-light">
                  A high-level synthesis of every interactive action modifier configured in the viewport:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#111118]/60 border border-white/5 hover:border-white/10 p-4 rounded-lg flex items-start gap-3.5 transition-all">
                    <div className="p-2.5 bg-white/5 border border-white/10 rounded text-accent">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white">Generate Map</h4>
                      <p className="text-[10px] text-[#A0A0A5] leading-relaxed mt-1 font-sans font-light">Triggers the AI semantic core model to process the raw input prompt or screenplay into nodes.</p>
                    </div>
                  </div>

                  <div className="bg-[#111118]/60 border border-white/5 hover:border-white/10 p-4 rounded-lg flex items-start gap-3.5 transition-all">
                    <div className="p-2.5 bg-white/5 border border-white/10 rounded text-green-400">
                      <Maximize2 size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white">Reset Zoom</h4>
                      <p className="text-[10px] text-[#A0A0A5] leading-relaxed mt-1 font-sans font-light">Resets zoom scaling coordinates to center the graph network.</p>
                    </div>
                  </div>

                  <div className="bg-[#111118]/60 border border-white/5 hover:border-white/10 p-4 rounded-lg flex items-start gap-3.5 transition-all">
                    <div className="p-2.5 bg-white/5 border border-white/10 rounded text-blue-400">
                      <Eye size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white">Toggle Labels</h4>
                      <p className="text-[10px] text-[#A0A0A5] leading-relaxed mt-1 font-sans font-light">Enables or disables visual text descriptive overlays next to node centroids.</p>
                    </div>
                  </div>

                  <div className="bg-[#111118]/60 border border-white/5 hover:border-white/10 p-4 rounded-lg flex items-start gap-3.5 transition-all">
                    <div className="p-2.5 bg-white/5 border border-white/10 rounded text-purple-400">
                      <Lock size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white">Freeze Graph</h4>
                      <p className="text-[10px] text-[#A0A0A5] leading-relaxed mt-1 font-sans font-light">Halts real-time simulation physics to let you focus on steady node coordination.</p>
                    </div>
                  </div>

                  <div className="bg-[#111118]/60 border border-white/5 hover:border-white/10 p-4 rounded-lg flex items-start gap-3.5 transition-all">
                    <div className="p-2.5 bg-white/5 border border-white/10 rounded text-red-400">
                      <RotateCcw size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white">Clear View</h4>
                      <p className="text-[10px] text-[#A0A0A5] leading-relaxed mt-1 font-sans font-light">Flushes the current visualization coordinates and active graph buffer.</p>
                    </div>
                  </div>

                  <div className="bg-[#111118]/60 border border-white/5 hover:border-white/10 p-4 rounded-lg flex items-start gap-3.5 transition-all">
                    <div className="p-2.5 bg-white/5 border border-white/10 rounded text-indigo-400">
                      <Network size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white">Layout Switcher</h4>
                      <p className="text-[10px] text-[#A0A0A5] leading-relaxed mt-1 font-sans font-light">Switches topologies between Force, Circular, Tree, and Grid structures.</p>
                    </div>
                  </div>

                  <div className="bg-[#111118]/60 border border-white/5 hover:border-white/10 p-4 rounded-lg flex items-start gap-3.5 transition-all">
                    <div className="p-2.5 bg-white/5 border border-white/10 rounded text-yellow-500">
                      <Code size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white">Edit Mode</h4>
                      <p className="text-[10px] text-[#A0A0A5] leading-relaxed mt-1 font-sans font-light">Locks/Unlocks live additions, link deletions, and name updating.</p>
                    </div>
                  </div>

                  <div className="bg-[#111118]/60 border border-white/5 hover:border-white/10 p-4 rounded-lg flex items-start gap-3.5 transition-all">
                    <div className="p-2.5 bg-white/5 border border-white/10 rounded text-pink-400">
                      <Undo size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white">Undo / Redo</h4>
                      <p className="text-[10px] text-[#A0A0A5] leading-relaxed mt-1 font-sans font-light">Steps backward or forward through coordinate position moves and edits.</p>
                    </div>
                  </div>

                  <div className="bg-[#111118]/60 border border-white/5 hover:border-white/10 p-4 rounded-lg flex items-start gap-3.5 transition-all">
                    <div className="p-2.5 bg-white/5 border border-white/10 rounded text-cyan-400">
                      <GitBranch size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white">Branches Control</h4>
                      <p className="text-[10px] text-[#A0A0A5] leading-relaxed mt-1 font-sans font-light">Branches a neural sandbox version to structure alternative plot timelines.</p>
                    </div>
                  </div>

                  <div className="bg-[#111118]/60 border border-white/5 hover:border-white/10 p-4 rounded-lg flex items-start gap-3.5 transition-all">
                    <div className="p-2.5 bg-white/5 border border-white/10 rounded text-amber-500">
                      <Share2 size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white">Share Node Parameters</h4>
                      <p className="text-[10px] text-[#A0A0A5] leading-relaxed mt-1 font-sans font-light">Generates direct URLs for instant collaborative viewing.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 5: SETTINGS EXPLAINED */}
          {filteredSections.some(s => s.id === 'settings-explained') && (
            <section 
              id="settings-explained" 
              ref={sectionRefs['settings-explained']} 
              className="scroll-mt-28 transition-all duration-700 animate-fade-in"
            >
              <div className="border-t border-accent pt-6">
                <span className="text-[9px] font-mono tracking-[0.3em] text-accent uppercase font-bold">Protocol 05</span>
                <h2 className="text-2xl lg:text-3xl font-serif italic text-white mb-4">Settings & Panel Variables Explained</h2>
                
                <p className="text-xs lg:text-sm text-[#A0A0A5] leading-relaxed max-w-3xl mb-8 font-sans font-light">
                  A functional breakdown of categories hosted inside our System Core panel, explaining standard impact outcomes:
                </p>

                <div className="space-y-6">
                  {/* Category A: Appearance */}
                  <div className="bg-[#111118]/40 border border-white/5 rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                      <Eye size={14} className="text-amber-500" />
                      <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Appearance Settings</h4>
                    </div>
                    <div className="space-y-3 font-sans font-light">
                      <div>
                        <span className="text-[10px] font-mono text-accent font-semibold">Theme Toggle</span>
                        <p className="text-[10px] text-[#A0A0A5] leading-relaxed mt-0.5">Toggles between custom light and default dark modes to adapt high contrast visibility.</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-accent font-semibold">Node Size Scaling</span>
                        <p className="text-[10px] text-[#A0A0A5] leading-relaxed mt-0.5">Adjusts node circle radius depending on connection lines density, allowing customization of depth representation.</p>
                      </div>
                    </div>
                  </div>

                  {/* Category B: Physics */}
                  <div className="bg-[#111118]/40 border border-white/5 rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                      <Sliders size={14} className="text-green-400" />
                      <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Simulation Physics Settings</h4>
                    </div>
                    <div className="space-y-3 font-sans font-light">
                      <div>
                        <span className="text-[10px] font-mono text-accent font-semibold">Gravity Force</span>
                        <p className="text-[10px] text-[#A0A0A5] leading-relaxed mt-0.5">Tears nodes together toward the centroid. Higher indices bundle nodes tightly; lower indices let links extend wider.</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-accent font-semibold">Repulsion Charge Strength</span>
                        <p className="text-[10px] text-[#A0A0A5] leading-relaxed mt-0.5">Limits node intersection issues. Higher repulsion forces push adjacent entities away, ensuring text names do not overlap.</p>
                      </div>
                    </div>
                  </div>

                  {/* Category C: AI Behavior */}
                  <div className="bg-[#111118]/40 border border-white/5 rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                      <Sparkles size={14} className="text-blue-400" />
                      <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">AI Behavior & Engine Settings</h4>
                    </div>
                    <div className="space-y-3 font-sans font-light">
                      <div>
                        <span className="text-[10px] font-mono text-accent font-semibold">Model Provider Selection</span>
                        <p className="text-[10px] text-[#A0A0A5] leading-relaxed mt-0.5">Switches APIs of active prompt transformer models. Best utilized when switching reasoning depth vs extraction speed.</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-accent font-semibold">Recursion Threshold</span>
                        <p className="text-[10px] text-[#A0A0A5] leading-relaxed mt-0.5">Dictates how deeply subgraphs, lore descriptions, or alternate timeline sequences are cataloged during deep parsing.</p>
                      </div>
                    </div>
                  </div>

                  {/* Category D: Export Settings */}
                  <div className="bg-[#111118]/40 border border-white/5 rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                      <Download size={14} className="text-purple-400" />
                      <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Export & Backup Settings</h4>
                    </div>
                    <div className="space-y-3 font-sans font-light">
                      <div>
                        <span className="text-[10px] font-mono text-accent font-semibold">Raw Graph Schema Exports</span>
                        <p className="text-[10px] text-[#A0A0A5] leading-relaxed mt-0.5">Downloads a local structured JSON schema of all current nodes, weights, link annotations, and coordinates.</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-accent font-semibold">Copy Coordinate State Stream</span>
                        <p className="text-[10px] text-[#A0A0A5] leading-relaxed mt-0.5">Copies a serialized configuration string containing current map metadata for local clipboard backups.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 6: LAYOUTS */}
          {filteredSections.some(s => s.id === 'layouts') && (
            <section 
              id="layouts" 
              ref={sectionRefs['layouts']} 
              className="scroll-mt-28 transition-all duration-700 animate-fade-in"
            >
              <div className="border-t border-accent pt-6">
                <span className="text-[9px] font-mono tracking-[0.3em] text-accent uppercase font-bold">Protocol 06</span>
                <h2 className="text-2xl lg:text-3xl font-serif italic text-white mb-4">Topology Layouts & Formations</h2>
                
                <p className="text-xs lg:text-sm text-[#A0A0A5] leading-relaxed max-w-3xl mb-8 font-sans font-light">
                  Choose from four distinct spatial positioning formations depending on the nature of your structural narrative analysis:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Layout A: Force-Directed */}
                  <div className="bg-[#111118]/50 border border-white/5 hover:border-white/10 p-5 rounded-lg flex flex-col justify-between transition-all">
                    <div>
                      <div className="h-28 bg-[#0a0a0f] border border-white/5 rounded-md flex items-center justify-center relative overflow-hidden mb-4">
                        {/* Force simulation miniature diagram */}
                        <svg width="120" height="90" viewBox="0 0 120 90" className="opacity-70">
                          <line x1="60" y1="45" x2="30" y2="25" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                          <line x1="60" y1="45" x2="90" y2="25" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                          <line x1="60" y1="45" x2="60" y2="75" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                          <line x1="30" y1="25" x2="15" y2="55" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                          <line x1="90" y1="25" x2="105" y2="55" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                          <circle cx="60" cy="45" r="5" fill="#f5c842" />
                          <circle cx="30" cy="25" r="4" fill="#10b981" />
                          <circle cx="90" cy="25" r="4" fill="#3b82f6" />
                          <circle cx="60" cy="75" r="4.5" fill="#a855f7" />
                          <circle cx="15" cy="55" r="3" fill="#6366f1" />
                          <circle cx="105" cy="55" r="3" fill="#f43f5e" />
                        </svg>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Network size={14} className="text-accent" />
                        <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Force-Directed</h4>
                      </div>
                      <p className="text-[10px] text-[#A0A0A5] leading-relaxed font-sans font-light">
                        Uses simulated gravity, repulsion, and tension forces to organically float entities into optimal configurations based on connection weights.
                      </p>
                    </div>
                    <span className="text-[8px] bg-accent/10 text-accent font-mono py-1 px-2.5 rounded self-start mt-4 tracking-wider uppercase font-bold">Best for mapping complex associations</span>
                  </div>

                  {/* Layout B: Circular Ring */}
                  <div className="bg-[#111118]/50 border border-white/5 hover:border-white/10 p-5 rounded-lg flex flex-col justify-between transition-all">
                    <div>
                      <div className="h-28 bg-[#0a0a0f] border border-white/5 rounded-md flex items-center justify-center relative overflow-hidden mb-4">
                        {/* Circular ring miniature diagram */}
                        <svg width="120" height="90" viewBox="0 0 120 90" className="opacity-70">
                          <circle cx="60" cy="45" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="2 3" />
                          <line x1="60" y1="17" x2="60" y2="73" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                          <line x1="32" y1="45" x2="88" y2="45" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                          <circle cx="60" cy="17" r="4.5" fill="#f5c842" />
                          <circle cx="88" cy="45" r="4.5" fill="#10b981" />
                          <circle cx="60" cy="73" r="4.5" fill="#3b82f6" />
                          <circle cx="32" cy="45" r="4.5" fill="#a855f7" />
                          <circle cx="80" cy="25" r="3.5" fill="#6366f1" />
                          <circle cx="40" cy="65" r="3.5" fill="#f43f5e" />
                        </svg>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Orbit size={14} className="text-emerald-400" />
                        <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Circular Ring</h4>
                      </div>
                      <p className="text-[10px] text-[#A0A0A5] leading-relaxed font-sans font-light">
                        Aligns all node entities along a perfect circular ring. Helpful to organize narrative orbits, faction lists, or entities cleanly in chronological order.
                      </p>
                    </div>
                    <span className="text-[8px] bg-emerald-500/10 text-emerald-400 font-mono py-1 px-2.5 rounded self-start mt-4 tracking-wider uppercase font-bold">Best for faction rosters & networks</span>
                  </div>

                  {/* Layout C: Sequential Tree */}
                  <div className="bg-[#111118]/50 border border-white/5 hover:border-white/10 p-5 rounded-lg flex flex-col justify-between transition-all">
                    <div>
                      <div className="h-28 bg-[#0a0a0f] border border-white/5 rounded-md flex items-center justify-center relative overflow-hidden mb-4">
                        {/* Sequential tree miniature diagram */}
                        <svg width="120" height="90" viewBox="0 0 120 90" className="opacity-70">
                          <line x1="60" y1="15" x2="30" y2="45" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                          <line x1="60" y1="15" x2="90" y2="45" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                          <line x1="30" y1="45" x2="15" y2="75" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                          <line x1="30" y1="45" x2="45" y2="75" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                          <line x1="90" y1="45" x2="75" y2="75" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                          <line x1="90" y1="45" x2="105" y2="75" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                          <circle cx="60" cy="15" r="5" fill="#f5c842" />
                          <circle cx="30" cy="45" r="4.5" fill="#10b981" />
                          <circle cx="90" cy="45" r="4.5" fill="#3b82f6" />
                          <circle cx="15" cy="75" r="3.5" fill="#a855f7" />
                          <circle cx="45" cy="75" r="3.5" fill="#6366f1" />
                          <circle cx="75" cy="75" r="3.5" fill="#f43f5e" />
                          <circle cx="105" cy="75" r="3.5" fill="#f5c842" />
                        </svg>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <GitFork size={14} className="text-[#a855f7] rotate-180" />
                        <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Sequential Tree</h4>
                      </div>
                      <p className="text-[10px] text-[#A0A0A5] leading-relaxed font-sans font-light">
                        Forces a cascade of parent and child links. Highly valuable to map lineage, family lines, cause-and-effect paths, or system decision trees.
                      </p>
                    </div>
                    <span className="text-[8px] bg-[#a855f7]/10 text-[#a855f7] font-mono py-1 px-2.5 rounded self-start mt-4 tracking-wider uppercase font-bold">Best for family trees & event sequences</span>
                  </div>

                  {/* Layout D: Matrix Grid */}
                  <div className="bg-[#111118]/50 border border-white/5 hover:border-white/10 p-5 rounded-lg flex flex-col justify-between transition-all">
                    <div>
                      <div className="h-28 bg-[#0a0a0f] border border-white/5 rounded-md flex items-center justify-center relative overflow-hidden mb-4">
                        {/* Matrix grid miniature diagram */}
                        <svg width="120" height="90" viewBox="0 0 120 90" className="opacity-70">
                          <line x1="20" y1="10" x2="100" y2="10" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                          <line x1="20" y1="45" x2="100" y2="45" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                          <line x1="20" y1="80" x2="100" y2="80" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                          <line x1="20" y1="10" x2="20" y2="80" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                          <line x1="60" y1="10" x2="60" y2="80" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                          <line x1="100" y1="10" x2="100" y2="80" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                          <circle cx="20" cy="20" r="4.5" fill="#f5c842" />
                          <circle cx="60" cy="20" r="4.5" fill="#10b981" />
                          <circle cx="100" cy="20" r="4.5" fill="#3b82f6" />
                          <circle cx="20" cy="45" r="4.5" fill="#a855f7" />
                          <circle cx="60" cy="45" r="4.5" fill="#6366f1" />
                          <circle cx="100" cy="45" r="4.5" fill="#f43f5e" />
                          <circle cx="20" cy="70" r="4.5" fill="#f5c842" />
                          <circle cx="60" cy="70" r="4.5" fill="#10b981" />
                          <circle cx="100" cy="70" r="4.5" fill="#3b82f6" />
                        </svg>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Grid size={14} className="text-blue-400" />
                        <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Matrix Grid</h4>
                      </div>
                      <p className="text-[10px] text-[#A0A0A5] leading-relaxed font-sans font-light">
                        Distributes remaining entities strictly inside modular columns and rows. Ideal for a high-density tabular view of distinct files or entity lists.
                      </p>
                    </div>
                    <span className="text-[8px] bg-blue-500/10 text-blue-400 font-mono py-1 px-2.5 rounded self-start mt-4 tracking-wider uppercase font-bold">Best for structured node indexes</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 7: TIPS & TRICKS */}
          {filteredSections.some(s => s.id === 'tips-tricks') && (
            <section 
              id="tips-tricks" 
              ref={sectionRefs['tips-tricks']} 
              className="scroll-mt-28 transition-all duration-700 animate-fade-in"
            >
              <div className="border-t border-accent pt-6">
                <span className="text-[9px] font-mono tracking-[0.3em] text-accent uppercase font-bold">Protocol 07</span>
                <h2 className="text-2xl lg:text-3xl font-serif italic text-white mb-4">Power User Tips & Tricks</h2>
                
                <div className="space-y-4">
                  <div className="bg-[#111118]/80 border border-white/5 hover:border-white/10 p-5 rounded-lg flex items-start gap-4 transition-all">
                    <div className="p-2 bg-accent/10 rounded-full text-accent mt-0.5 shrink-0">
                      <Lock size={14} />
                    </div>
                    <div>
                      <h4 className="text-xs font-serif italic font-bold text-white">Freeze Custom Entities by Dragging</h4>
                      <p className="text-[11px] text-[#A0A0A5] leading-relaxed mt-1 font-sans font-light">
                        Want to establish a static centerpiece in your mapping? Simply drag an entity node to your desired coordinate viewport location while in Edit Mode. The simulation automatically <span className="font-semibold text-white">pins and freezes</span> that node's spatial coordinate so it remains steady.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#111118]/80 border border-white/5 hover:border-white/10 p-5 rounded-lg flex items-start gap-4 transition-all">
                    <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-400 mt-0.5 shrink-0">
                      <Code size={14} />
                    </div>
                    <div>
                      <h4 className="text-xs font-serif italic font-bold text-white">Leverage Structured Prompts first</h4>
                      <p className="text-[11px] text-[#A0A0A5] leading-relaxed mt-1 font-sans font-light">
                        The NLP tracer relies heavily on clear grammatical links. For best results, use structured sentence layouts like: <span className="font-mono text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-white italic">"Aragorn of Faction Fellowship travels to Place Gondor carrying Object Anduril."</span> Explicit descriptions immediately improve graph accuracy!
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#111118]/80 border border-white/5 hover:border-white/10 p-5 rounded-lg flex items-start gap-4 transition-all">
                    <div className="p-2 bg-blue-500/10 rounded-full text-blue-400 mt-0.5 shrink-0">
                      <Sparkles size={14} />
                    </div>
                    <div>
                      <h4 className="text-xs font-serif italic font-bold text-white">Model Selection Synergy</h4>
                      <p className="text-[11px] text-[#A0A0A5] leading-relaxed mt-1 font-sans font-light">
                        Match model to task. For quick sandbox drafts or lighter notes, <span className="font-mono text-white">DeepSeek</span> delivers rapid results. If you are doing deep textual, philosophical, or historic lore extractions, opt for <span className="font-mono text-white">Claude 3.5 Sonnet</span> or <span className="font-mono text-white">Gemini 1.5 Pro</span> for advanced conceptual parsing.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#111118]/80 border border-white/5 hover:border-white/10 p-5 rounded-lg flex items-start gap-4 transition-all">
                    <div className="p-2 bg-[#a855f7]/10 rounded-full text-[#a855f7] mt-0.5 shrink-0">
                      <GitBranch size={14} />
                    </div>
                    <div>
                      <h4 className="text-xs font-serif italic font-bold text-white">Incremental Plot Mapping via Branches</h4>
                      <p className="text-[11px] text-[#A0A0A5] leading-relaxed mt-1 font-sans font-light">
                        Never worry about destroying your masterpiece. Branch a graph version to try experimental extraction prompts or structural edits. You can easily switch back or compare branch variations in real-time.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 8: FAQ */}
          {filteredSections.some(s => s.id === 'faq') && (
            <section 
              id="faq" 
              ref={sectionRefs['faq']} 
              className="scroll-mt-28 transition-all duration-700 animate-fade-in"
            >
              <div className="border-t border-accent pt-6">
                <span className="text-[9px] font-mono tracking-[0.3em] text-accent uppercase font-bold">Protocol 08</span>
                <h2 className="text-2xl lg:text-3xl font-serif italic text-white mb-4">Frequently Asked Questions</h2>
                
                <p className="text-xs lg:text-sm text-[#A0A0A5] leading-relaxed max-w-3xl mb-8 font-sans font-light">
                  Common queries regarding security protocols, graph rendering coordinates, offline setups, and canvas structures:
                </p>

                <div className="space-y-3">
                  {faqs.map((faq, idx) => {
                    const isExpanded = expandedFaq === idx;
                    return (
                      <div 
                        key={idx} 
                        className="bg-[#111118]/60 border border-white/5 rounded-lg overflow-hidden transition-all duration-300"
                      >
                        <button
                          onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                          className="w-full text-left px-5 py-4 flex justify-between items-center hover:bg-white/[0.01] transition-all focus:outline-none"
                        >
                          <span className="text-xs font-serif font-semibold text-white">{faq.q}</span>
                          <ChevronRight 
                            size={14} 
                            className={`text-white/40 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-accent' : ''}`} 
                          />
                        </button>
                        
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="border-t border-white/5 bg-black/20"
                            >
                              <p className="p-5 text-[11px] text-[#A0A0A5] leading-relaxed font-sans font-light">
                                {faq.a}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

        </div>
      </div>
      
    </div>
  );
};
