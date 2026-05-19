import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Settings, Sliders, Type, Cpu, Database, 
  Download, Upload, Image as ImageIcon, Save,
  RotateCcw, Info, Globe, AlertTriangle, Play, Shield
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { GraphData } from '../types';
import * as htmlToImage from 'html-to-image';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  graphData: GraphData;
  onLoadGraph: (data: GraphData) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  isOpen, 
  onClose, 
  graphData,
  onLoadGraph 
}) => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [showPrivacy, setShowPrivacy] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neural_graph_${graphData.title.replace(/\s+/g, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        onLoadGraph(data);
        onClose();
      } catch (err) {
        alert('Malformed protocol data. Import aborted.');
      }
    };
    reader.readAsText(file);
  };

  const handleExportPNG = async () => {
    const viewport = document.getElementById('graph-viewport');
    if (!viewport) return;
    
    try {
      const dataUrl = await htmlToImage.toPng(viewport, {
        backgroundColor: settings.appearance.theme === 'light' ? '#f9fafb' : '#0a0a0f',
        style: {
          borderRadius: '0'
        }
      });
      const link = document.createElement('a');
      link.download = `neural_map_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Snapshot capture failed:', err);
    }
  };

  const Section: React.FC<{ title: string; icon: any; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-6">
        <Icon size={14} className="text-gray-500" />
        <h3 className="text-[10px] uppercase tracking-[0.4em] font-bold text-gray-500">{title}</h3>
      </div>
      <div className="space-y-6 pl-6 border-l border-white/5">
        {children}
      </div>
    </div>
  );

  const ControlLine: React.FC<{ label: string; description?: string; children: React.ReactNode }> = ({ label, description, children }) => (
    <div className="flex items-center justify-between gap-8">
      <div>
        <p className="text-xs font-medium text-gray-300">{label}</p>
        {description && <p className="text-[10px] text-gray-500 mt-1">{description}</p>}
      </div>
      <div className="flex-shrink-0">
        {children}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-lg bg-[#080808] border-l border-white/10 z-[101] shadow-2xl overflow-y-auto"
          >
            <div className="p-10">
              <header className="flex items-center justify-between mb-16">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <Settings size={20} className="text-white" />
                    <h2 className="text-2xl font-serif italic text-white tracking-tight">System Core</h2>
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500">Neural Configuration Protocol</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-3 hover:bg-white/5 rounded-full transition-colors group"
                >
                  <X size={20} className="text-gray-500 group-hover:text-white transition-colors" />
                </button>
              </header>

              <Section title="Graph Appearance" icon={Sliders}>
                <ControlLine label="Node Scale">
                  <div className="flex bg-white/5 p-1 rounded-sm">
                    {['small', 'medium', 'large'].map((size) => (
                      <button
                        key={size}
                        onClick={() => updateSettings({ appearance: { ...settings.appearance, nodeSize: size as any } })}
                        className={`px-3 py-1 text-[9px] uppercase tracking-widest rounded-sm transition-all ${
                          settings.appearance.nodeSize === size 
                            ? 'bg-white text-black font-bold' 
                            : 'text-gray-500 hover:text-white'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </ControlLine>

                <ControlLine label="Link Thickness">
                  <input 
                    type="range" min="0.5" max="5" step="0.5"
                    value={settings.appearance.linkThickness}
                    onChange={(e) => updateSettings({ appearance: { ...settings.appearance, linkThickness: parseFloat(e.target.value) } })}
                    className="w-32 accent-white"
                  />
                </ControlLine>

                <ControlLine label="Label Size">
                  <input 
                    type="range" min="8" max="20" step="1"
                    value={settings.appearance.labelSize}
                    onChange={(e) => updateSettings({ appearance: { ...settings.appearance, labelSize: parseInt(e.target.value) } })}
                    className="w-32 accent-white"
                  />
                </ControlLine>

                <ControlLine label="Show Flow Vectors" description="Display directional arrows on links">
                  <button 
                    onClick={() => updateSettings({ appearance: { ...settings.appearance, showArrows: !settings.appearance.showArrows } })}
                    className={`w-10 h-5 rounded-full relative transition-colors ${settings.appearance.showArrows ? 'bg-white' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 left-1 w-3 h-3 rounded-full transition-all ${settings.appearance.showArrows ? 'translate-x-5 bg-black' : 'bg-gray-500'}`} />
                  </button>
                </ControlLine>

                <ControlLine label="Aesthetic Theme">
                  <button 
                    onClick={() => updateSettings({ appearance: { ...settings.appearance, theme: settings.appearance.theme === 'dark' ? 'light' : 'dark' } })}
                    className="px-4 py-2 bg-white/5 border border-white/10 text-[9px] uppercase tracking-widest hover:bg-white/10"
                  >
                    {settings.appearance.theme} Theme
                  </button>
                </ControlLine>
              </Section>

              <Section title="Neural Simulation" icon={Play}>
                <ControlLine label="Cluster Proximity" description="Base distance between nodes">
                  <input 
                    type="range" min="50" max="400" step="10"
                    value={settings.physics.linkDistance}
                    onChange={(e) => updateSettings({ physics: { ...settings.physics, linkDistance: parseInt(e.target.value) } })}
                    className="w-32 accent-white"
                  />
                </ControlLine>

                <ControlLine label="Repulsion Strength">
                  <input 
                    type="range" min="-1000" max="-100" step="50"
                    value={settings.physics.repulsionStrength}
                    onChange={(e) => updateSettings({ physics: { ...settings.physics, repulsionStrength: parseInt(e.target.value) } })}
                    className="w-32 accent-white"
                  />
                </ControlLine>

                <ControlLine label="Auto-Freeze" description="Stop physics after simulation settles">
                  <button 
                    onClick={() => updateSettings({ physics: { ...settings.physics, autoFreeze: !settings.physics.autoFreeze } })}
                    className={`w-10 h-5 rounded-full relative transition-colors ${settings.physics.autoFreeze ? 'bg-white' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 left-1 w-3 h-3 rounded-full transition-all ${settings.physics.autoFreeze ? 'translate-x-5 bg-black' : 'bg-gray-500'}`} />
                  </button>
                </ControlLine>
              </Section>

              <Section title="AI Intelligence" icon={Cpu}>
                <ControlLine label="Map Blueprint" description="Optimization template for specific use cases">
                  <select 
                    value={settings.ai.mode}
                    onChange={(e) => updateSettings({ ai: { ...settings.ai, mode: e.target.value as any } })}
                    className="bg-white/5 border border-white/10 text-[10px] px-2 py-1 outline-none appearance-none cursor-pointer"
                  >
                    <option value="general">Standard Knowledge Map</option>
                    <option value="creative">Creative Bible (Manga/Game/World)</option>
                    <option value="academic">Academic / Research Synthesis</option>
                    <option value="professional">Professional Architecture / Org</option>
                    <option value="personal">Personal Archive / Travel / Life</option>
                    <option value="detective">Detective Wall / Investigation</option>
                  </select>
                </ControlLine>

                <ControlLine label="Neural Capacity" description="Max entities to extract per pass">
                  <select 
                    value={settings.ai.maxNodes}
                    onChange={(e) => updateSettings({ ai: { ...settings.ai, maxNodes: parseInt(e.target.value) } })}
                    className="bg-white/5 border border-white/10 text-[10px] px-2 py-1 outline-none appearance-none cursor-pointer"
                  >
                    <option value="10">10 Nodes</option>
                    <option value="25">25 Nodes</option>
                    <option value="50">50 Nodes</option>
                    <option value="100">Unlimited</option>
                  </select>
                </ControlLine>

                <ControlLine label="Extraction Detail">
                  <div className="flex bg-white/5 p-1 rounded-sm">
                    {['quick', 'deep'].map((level) => (
                      <button
                        key={level}
                        onClick={() => updateSettings({ ai: { ...settings.ai, detailLevel: level as any } })}
                        className={`px-3 py-1 text-[9px] uppercase tracking-widest rounded-sm transition-all ${
                          settings.ai.detailLevel === level 
                            ? 'bg-white text-black font-bold' 
                            : 'text-gray-500 hover:text-white'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </ControlLine>

                <ControlLine label="Output Dialect" description="Preferred language for entities">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2">
                    <Globe size={12} className="text-gray-500" />
                    <input 
                      type="text"
                      value={settings.ai.language}
                      onChange={(e) => updateSettings({ ai: { ...settings.ai, language: e.target.value } })}
                      className="bg-transparent text-xs outline-none w-24"
                      placeholder="English"
                    />
                  </div>
                </ControlLine>
              </Section>

              <Section title="Security & API" icon={Database}>
                <div className="p-4 border border-yellow-500/20 bg-yellow-500/5 rounded-sm mb-6">
                  <div className="flex items-center gap-2 mb-2 text-yellow-500">
                    <AlertTriangle size={14} />
                    <span className="text-[9px] uppercase font-bold tracking-widest">Protocol Warning</span>
                  </div>
                  <p className="text-[10px] text-yellow-500/80 leading-relaxed italic">
                    Saved API keys are stored in your primary node's local buffer. Do not use on public terminals.
                  </p>
                </div>

                <ControlLine label="Neural Provider">
                  <select 
                    value={settings.api.provider}
                    onChange={(e) => updateSettings({ api: { ...settings.api, provider: e.target.value as any } })}
                    className="bg-white/5 border border-white/10 text-[10px] px-2 py-1 outline-none appearance-none cursor-pointer"
                  >
                    <option value="gemini">Gemini Neural (Default)</option>
                    <option value="openai">OpenAI Synapse</option>
                    <option value="groq">Groq Engine</option>
                    <option value="aki">Aki.io Repository</option>
                  </select>
                </ControlLine>

                <div className="space-y-4 pt-6 mt-6 border-t border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Info size={10} className="text-gray-500" />
                    <p className="text-[9px] uppercase tracking-[0.2em] text-gray-500 font-bold">Neural Key Overrides</p>
                  </div>
                  
                  {(['gemini', 'openai', 'groq'] as const).map((prov) => (
                    <div key={prov} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-gray-400 capitalize font-medium">{prov} Link</label>
                        {!settings.api.keys?.[prov] && (
                          <div className="flex items-center gap-1 text-[8px] text-emerald-500/60 uppercase tracking-widest font-bold">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            System Key Protected
                          </div>
                        )}
                      </div>
                      <input 
                        type="password"
                        value={settings.api.keys?.[prov] || ''}
                        onChange={(e) => updateSettings({ 
                          api: { 
                            ...settings.api, 
                            keys: { ...settings.api.keys, [prov]: e.target.value } 
                          } 
                        })}
                        placeholder={`Enter private ${prov} key`}
                        className="w-full bg-white/5 border border-white/10 text-xs px-3 py-2 outline-none focus:border-white/20 transition-all font-mono"
                      />
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Data Transparency" icon={Shield}>
                <div className="space-y-4">
                  <p className="text-[10px] text-gray-400 leading-relaxed font-sans font-light">
                    In compliance with strict data auditing practices, we outline an honest and legally reasonable description of internal app tracking, local values, and transmissions.
                  </p>
                  <button 
                    onClick={() => setShowPrivacy(!showPrivacy)}
                    className="text-[9px] uppercase tracking-widest text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1 border border-amber-500/20 px-3 py-1.5 rounded-sm hover:border-amber-500/40 bg-amber-500/5 transition-all"
                  >
                    {showPrivacy ? 'Hide Privacy Document' : 'View Privacy Document'}
                  </button>
                  
                  {showPrivacy && (
                    <div className="bg-[#030303] border border-white/5 p-4 rounded-sm text-[11px] leading-relaxed text-gray-400 font-sans space-y-4 max-h-72 overflow-y-auto no-scrollbar border-dashed">
                      <h4 className="font-serif italic text-sm text-amber-500 border-b pb-1.5 border-white/5">Neural Mapping Privacy & Protocol</h4>
                      
                      <div>
                        <p className="font-bold text-gray-300">1. Absolute Zero Background Profiling</p>
                        <p className="mt-1">This workspace operates completely free of hidden analytic scripts, background telemetry tracking, trackers, or unsolicited session recordings.</p>
                      </div>

                      <div>
                        <p className="font-bold text-gray-300">2. Local Storage Allocation</p>
                        <p className="mt-1">All layout scale parameters, customized colors, physics simulation attraction values, and manually committed branch history nodes are saved strictly inside client the local localStorage buffer.</p>
                      </div>

                      <div>
                        <p className="font-bold text-gray-300">3. Secure API Transmissions</p>
                        <p className="mt-1">Text-to-nodes layout conversions use Google Gemini API (standard backend workspace routing) carrying only user-input scriptures. If you input key overrides for OpenAI, Groq, or Gemini, authentication occurs directly from client to host, leaving zero footprints.</p>
                      </div>

                      <div>
                        <p className="font-bold text-gray-300">4. Live Synching & Co-Authoring</p>
                        <p className="mt-1">Toggling "Public Collab" updates standard Firestore `isShared=true` flags, exposing a direct invitation token. Any individual possessing this WebSocket-based sync connection can read and write live graph layout additions in real-time.</p>
                      </div>

                      <div>
                        <p className="font-bold text-gray-300">5. Right to Erase</p>
                        <p className="mt-1">You may wipe all cached local parameters instantly by choosing "Reset Core" or delete server extractions using the trash toggle on the archive panel.</p>
                      </div>
                    </div>
                  )}
                </div>
              </Section>

              <Section title="Transmission & Backup" icon={Download}>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={handleExportJSON}
                    className="flex flex-col items-center gap-3 p-6 border border-white/5 bg-white/2 hover:bg-white/5 transition-all text-gray-400 hover:text-white"
                  >
                    <Download size={20} />
                    <span className="text-[9px] uppercase tracking-widest">Export Protocol</span>
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-3 p-6 border border-white/5 bg-white/2 hover:bg-white/5 transition-all text-gray-400 hover:text-white"
                  >
                    <Upload size={20} />
                    <span className="text-[9px] uppercase tracking-widest">Load History</span>
                  </button>
                  <button 
                    onClick={handleExportPNG}
                    className="flex flex-col items-center gap-3 p-6 border border-white/5 bg-white/2 hover:bg-white/5 transition-all text-gray-400 hover:text-white"
                  >
                    <ImageIcon size={20} />
                    <span className="text-[9px] uppercase tracking-widest">Capture Map</span>
                  </button>
                  <button 
                    onClick={resetSettings}
                    className="flex flex-col items-center gap-3 p-6 border border-white/5 bg-white/2 hover:bg-white/5 transition-all text-gray-400 hover:text-white"
                  >
                    <RotateCcw size={20} />
                    <span className="text-[9px] uppercase tracking-widest">Reset Core</span>
                  </button>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".json"
                  onChange={handleImportJSON}
                />
              </Section>

              <footer className="mt-20 pt-10 border-t border-white/5 flex flex-col items-center">
                <p className="text-[9px] uppercase tracking-[0.8em] text-gray-600 mb-2">Neural Mapping Engine v2.4.0</p>
                <p className="text-[8px] text-gray-700 italic">Core Status: Operational & Synced</p>
              </footer>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
