import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronRight,
  Search,
  BookOpen,
  ShieldCheck,
  Zap,
  Loader2,
  Trash2,
  FolderOpen,
  Plus,
  Settings,
  MoreVertical,
  File,
  FilePlus,
  X,
  CloudUpload,
  ScanLine,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Clock,
  Star,
  Archive,
  LayoutGrid,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// ─────────────────────────────────────────────
//  Environment / Config
// ─────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

// ─────────────────────────────────────────────
//  Mock Data
// ─────────────────────────────────────────────
const MOCK_PROJECTS = [
  { id: 'p1', name: 'ISO 42001 Audit', status: 'active', docs: 4, lastModified: 'Hoy' },
  { id: 'p2', name: 'GDPR Compliance', status: 'warning', docs: 7, lastModified: 'Ayer' },
  { id: 'p3', name: 'SOC 2 Type II', status: 'complete', docs: 12, lastModified: 'Hace 3 días' },
  { id: 'p4', name: 'EU AI Act Review', status: 'active', docs: 2, lastModified: 'Hace 1 semana' },
];

const MOCK_REF_DOCS = [
  { id: 'r1', name: 'ISO_42001_Standard.pdf', category: 'Estándar', selected: true },
  { id: 'r2', name: 'EU_AI_Act_2024.pdf', category: 'Regulación', selected: false },
  { id: 'r3', name: 'GDPR_Guidelines.pdf', category: 'Regulación', selected: true },
  { id: 'r4', name: 'NIST_AI_RMF.pdf', category: 'Marco', selected: false },
  { id: 'r5', name: 'SOC2_Criteria.pdf', category: 'Estándar', selected: false },
  { id: 'r6', name: 'Internal_AI_Policy_v3.pdf', category: 'Interno', selected: true },
];

// ─────────────────────────────────────────────
//  Panel wrapper
// ─────────────────────────────────────────────
const Panel = ({ title, children, className, icon: Icon, headerExtra, badge }) => (
  <div className={cn('flex flex-col h-full bg-[#0d1117] border-r border-[#21262d]', className)}>
    <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262d] bg-[#161b22]">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-[#388bfd]" />}
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8b949e]">{title}</h2>
        {badge !== undefined && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#388bfd]/20 text-[#388bfd]">
            {badge}
          </span>
        )}
      </div>
      {headerExtra}
    </div>
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {children}
    </div>
  </div>
);

// ─────────────────────────────────────────────
//  Project Item
// ─────────────────────────────────────────────
const statusConfig = {
  active: { color: 'bg-[#388bfd]', label: 'Activo', text: 'text-[#388bfd]' },
  warning: { color: 'bg-[#d29922]', label: 'Alerta', text: 'text-[#d29922]' },
  complete: { color: 'bg-[#3fb950]', label: 'Completado', text: 'text-[#3fb950]' },
};

const ProjectItem = ({ project, selected, onClick }) => {
  const s = statusConfig[project.status];
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 2 }}
      className={cn(
        'w-full text-left px-3 py-3 mx-2 my-0.5 rounded-lg transition-all duration-150 group flex flex-col gap-1',
        selected
          ? 'bg-[#388bfd]/10 border border-[#388bfd]/30'
          : 'hover:bg-[#21262d] border border-transparent'
      )}
      style={{ width: 'calc(100% - 16px)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn('text-sm font-medium leading-tight', selected ? 'text-white' : 'text-[#c9d1d9]')}>
          {project.name}
        </span>
        <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', s.color)} />
      </div>
      <div className="flex items-center gap-3 text-[10px] text-[#8b949e]">
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {project.docs} docs
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {project.lastModified}
        </span>
      </div>
    </motion.button>
  );
};

// ─────────────────────────────────────────────
//  Reference Document Item
// ─────────────────────────────────────────────
const categoryColors = {
  'Estándar': 'border-[#388bfd]/40 text-[#388bfd]',
  'Regulación': 'border-[#d29922]/40 text-[#d29922]',
  'Marco': 'border-[#bc8cff]/40 text-[#bc8cff]',
  'Interno': 'border-[#3fb950]/40 text-[#3fb950]',
};

const RefDocItem = ({ doc, onToggle }) => {
  const catColor = categoryColors[doc.category] || 'border-[#8b949e]/40 text-[#8b949e]';
  return (
    <motion.div
      layout
      onClick={onToggle}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5 rounded-lg cursor-pointer transition-all duration-150 group',
        doc.selected
          ? 'bg-[#388bfd]/10 border border-[#388bfd]/25'
          : 'hover:bg-[#21262d] border border-transparent'
      )}
    >
      {/* Checkbox */}
      <div className={cn(
        'w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all',
        doc.selected
          ? 'bg-[#388bfd] border-[#388bfd]'
          : 'border-[#30363d] group-hover:border-[#8b949e]'
      )}>
        {doc.selected && (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-2.5 h-2.5 text-white"
            fill="none"
            viewBox="0 0 12 12"
          >
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-medium truncate', doc.selected ? 'text-[#c9d1d9]' : 'text-[#8b949e]')}>
          {doc.name}
        </p>
      </div>

      <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded border flex-shrink-0', catColor)}>
        {doc.category}
      </span>
    </motion.div>
  );
};

// ─────────────────────────────────────────────
//  Chat Bubble
// ─────────────────────────────────────────────
const ChatBubble = ({ role, content, citations, isLoading, steps }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    className={cn(
      'flex flex-col max-w-[85%] mb-5',
      role === 'user' ? 'self-end items-end' : 'self-start items-start'
    )}
  >
    {role === 'assistant' && (
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#388bfd] to-[#bc8cff] flex items-center justify-center">
          <ShieldCheck className="w-3 h-3 text-white" />
        </div>
        <span className="text-[10px] text-[#8b949e] font-semibold uppercase tracking-wider">ComplAI</span>
      </div>
    )}

    <div className={cn(
      'px-4 py-3 rounded-2xl text-sm leading-relaxed',
      role === 'user'
        ? 'bg-gradient-to-br from-[#388bfd] to-[#1a7bef] text-white rounded-tr-sm shadow-lg shadow-[#388bfd]/20'
        : 'bg-[#161b22] border border-[#30363d] text-[#c9d1d9] rounded-tl-sm'
    )}>
      {isLoading ? (
        <div className="flex flex-col gap-2 min-w-[200px]">
          <div className="flex items-center gap-2 text-[#388bfd] font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs animate-pulse">Analizando documentos...</span>
          </div>
          <div className="space-y-1 mt-1">
            {steps?.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.3 }}
                className="text-[10px] text-[#8b949e] flex items-center gap-1.5"
              >
                <div className="w-1 h-1 rounded-full bg-[#388bfd]/50" />
                {step}
              </motion.div>
            ))}
          </div>
        </div>
      ) : content}
    </div>

    {!isLoading && citations && citations.length > 0 && (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {citations.map((cite, i) => (
          <button key={i} className="text-[10px] px-2 py-1 rounded-lg bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-[#388bfd] hover:border-[#388bfd]/40 transition-colors flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            {cite.source} (pág. {cite.page})
          </button>
        ))}
      </div>
    )}
  </motion.div>
);

// ─────────────────────────────────────────────
//  Upload File Card
// ─────────────────────────────────────────────
const UploadedFileCard = ({ file, onRemove }) => {
  const ext = file.name.split('.').pop().toUpperCase();
  const extColors = {
    PDF: 'bg-red-500/10 text-red-400 border-red-500/20',
    TXT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    LOG: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    DOC: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    DOCX: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  };
  const colorClass = extColors[ext] || 'bg-[#388bfd]/10 text-[#388bfd] border-[#388bfd]/20';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, x: 20 }}
      layout
      className="flex items-center gap-3 px-3 py-2.5 mx-3 my-1 rounded-lg bg-[#161b22] border border-[#30363d] group"
    >
      <div className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold border flex-shrink-0', colorClass)}>
        {ext}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#c9d1d9] font-medium truncate">{file.name}</p>
        <p className="text-[10px] text-[#8b949e]">
          {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Listo'}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {file.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-[#3fb950]" />}
        {file.status === 'loading' && <Loader2 className="w-3.5 h-3.5 text-[#388bfd] animate-spin" />}
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 hover:text-red-400 text-[#8b949e] transition-all"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────
//  Main App
// ─────────────────────────────────────────────
export default function App() {
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState('p1');
  const [refDocs, setRefDocs] = useState(MOCK_REF_DOCS);
  const [analysisFiles, setAnalysisFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [processingSteps, setProcessingSteps] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isBackendHealthy, setIsBackendHealthy] = useState(false);
  const [refSearch, setRefSearch] = useState('');

  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const sessionId = useRef(Math.random().toString(36).substr(2, 9));
  const collectionName = `session_${sessionId.current}`;

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then(r => r.ok && setIsBackendHealthy(true))
      .catch(() => setIsBackendHealthy(false));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // ── Toggle ref doc selection ──
  const toggleRefDoc = (id) => {
    setRefDocs(prev => prev.map(d => d.id === id ? { ...d, selected: !d.selected } : d));
  };

  // ── Upload analysis files ──
  const processFiles = async (fileList) => {
    const newFiles = Array.from(fileList).map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      name: f.name,
      size: f.size,
      status: 'loading',
      raw: f,
    }));
    setAnalysisFiles(prev => [...prev, ...newFiles]);

    for (const fileObj of newFiles) {
      const formData = new FormData();
      formData.append('file', fileObj.raw);
      try {
        await fetch(`${API_BASE_URL}/upload?collection_name=${collectionName}`, {
          method: 'POST',
          body: formData,
        });
      } catch (_) { /* offline ok */ }
      setAnalysisFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'done' } : f));
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files?.length) processFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files);
  };

  // ── Chat ──
  const runAudit = async (query) => {
    setIsLoading(true);
    setProcessingSteps([
      'Consultando documentos de referencia...',
      'Ejecutando análisis de cumplimiento...',
      'Generando veredicto...',
    ]);
    try {
      const resp = await fetch(`${API_BASE_URL}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, session_id: sessionId.current, collection_name: collectionName }),
      });
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      setIsLoading(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.razonamiento,
        citations: data.citations?.map(c => ({ source: c.source, page: 1, snippet: c.snippet })) || [],
      }]);
    } catch {
      await new Promise(r => setTimeout(r, 2000));
      setIsLoading(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `(Modo Offline) Análisis para "${query}" completado. Cumplimiento parcial detectado. Verifica los logs del servidor para más detalles.`,
        citations: [],
      }]);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    setMessages(prev => [...prev, { role: 'user', content: inputValue }]);
    runAudit(inputValue);
    setInputValue('');
  };

  const selectedCount = refDocs.filter(d => d.selected).length;
  const filteredRefDocs = refDocs.filter(d =>
    d.name.toLowerCase().includes(refSearch.toLowerCase()) ||
    d.category.toLowerCase().includes(refSearch.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: '#0d1117', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ══════════════════════════════
          PANEL 1 — PROYECTOS
      ══════════════════════════════ */}
      <Panel
        title="Proyectos"
        icon={LayoutGrid}
        className="w-60 flex-shrink-0"
        badge={projects.length}
        headerExtra={
          <button className="p-1.5 rounded-md hover:bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        }
      >
        {/* Search */}
        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8b949e]" />
            <input
              type="text"
              placeholder="Buscar proyecto..."
              className="w-full bg-[#21262d] border border-[#30363d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#c9d1d9] placeholder-[#8b949e] focus:outline-none focus:border-[#388bfd]/50 transition-colors"
            />
          </div>
        </div>

        {/* Project list */}
        <div className="px-1 pb-2">
          {projects.map(p => (
            <ProjectItem
              key={p.id}
              project={p}
              selected={selectedProjectId === p.id}
              onClick={() => setSelectedProjectId(p.id)}
            />
          ))}
        </div>

        {/* Bottom stats */}
        <div className="mt-auto p-3 border-t border-[#21262d]">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Activos', value: projects.filter(p => p.status === 'active').length, color: 'text-[#388bfd]' },
              { label: 'Alertas', value: projects.filter(p => p.status === 'warning').length, color: 'text-[#d29922]' },
            ].map(stat => (
              <div key={stat.label} className="bg-[#161b22] rounded-lg p-2 text-center border border-[#21262d]">
                <p className={cn('text-lg font-bold', stat.color)}>{stat.value}</p>
                <p className="text-[9px] text-[#8b949e] uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* ══════════════════════════════
          PANEL 2 — DOCS DE REFERENCIA
      ══════════════════════════════ */}
      <Panel
        title="Referencia"
        icon={BookOpen}
        className="w-64 flex-shrink-0"
        badge={`${selectedCount}/${refDocs.length}`}
        headerExtra={
          <span className="text-[9px] text-[#8b949e] font-medium">{selectedCount} activos</span>
        }
      >
        {/* Search */}
        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8b949e]" />
            <input
              type="text"
              value={refSearch}
              onChange={e => setRefSearch(e.target.value)}
              placeholder="Filtrar docs..."
              className="w-full bg-[#21262d] border border-[#30363d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#c9d1d9] placeholder-[#8b949e] focus:outline-none focus:border-[#388bfd]/50 transition-colors"
            />
          </div>
        </div>

        {/* Select all row */}
        <div className="flex items-center justify-between px-4 pb-2">
          <span className="text-[10px] text-[#8b949e]">Documentos normativos</span>
          <button
            onClick={() => setRefDocs(prev => {
              const allSelected = prev.every(d => d.selected);
              return prev.map(d => ({ ...d, selected: !allSelected }));
            })}
            className="text-[10px] text-[#388bfd] hover:underline transition-all"
          >
            {refDocs.every(d => d.selected) ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </button>
        </div>

        {/* Doc list */}
        <div className="px-1 pb-3 space-y-0.5">
          <AnimatePresence>
            {filteredRefDocs.map(doc => (
              <RefDocItem key={doc.id} doc={doc} onToggle={() => toggleRefDoc(doc.id)} />
            ))}
          </AnimatePresence>
          {filteredRefDocs.length === 0 && (
            <div className="text-center py-8 text-[#8b949e] text-xs">Sin resultados</div>
          )}
        </div>

        {/* Add reference */}
        <div className="p-3 border-t border-[#21262d]">
          <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-[#30363d] text-[#8b949e] hover:border-[#388bfd]/40 hover:text-[#388bfd] transition-all text-xs font-medium">
            <FilePlus className="w-3.5 h-3.5" />
            Agregar referencia
          </button>
        </div>
      </Panel>

      {/* ══════════════════════════════
          PANEL 3 — CHAT
      ══════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117] border-r border-[#21262d]">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-[#21262d] bg-[#161b22] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#388bfd] to-[#bc8cff] flex items-center justify-center shadow-lg shadow-[#388bfd]/20">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">ComplAI Auditor</h1>
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-[#d29922]" />
                <span className="text-[10px] text-[#8b949e] uppercase tracking-widest font-semibold">
                  Auditoría en Tiempo Real
                </span>
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  isBackendHealthy ? 'bg-[#3fb950] shadow-[0_0_6px_rgba(63,185,80,0.5)]' : 'bg-red-500'
                )} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              {refDocs.filter(d => d.selected).slice(0, 3).map(d => (
                <div key={d.id} title={d.name} className="w-5 h-5 rounded-full bg-[#388bfd]/20 border border-[#388bfd]/30 flex items-center justify-center">
                  <BookOpen className="w-2.5 h-2.5 text-[#388bfd]" />
                </div>
              ))}
              {selectedCount > 3 && (
                <div className="w-5 h-5 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[9px] text-[#8b949e] font-bold">
                  +{selectedCount - 3}
                </div>
              )}
            </div>
            <span className="text-[10px] text-[#8b949e]">{selectedCount} refs activas</span>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col scrollbar-thin">
          {messages.length === 0 && !isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#388bfd]/20 to-[#bc8cff]/20 border border-[#388bfd]/20 flex items-center justify-center mb-4 shadow-lg"
              >
                <MessageSquare className="w-8 h-8 text-[#388bfd]" />
              </motion.div>
              <h2 className="text-base font-semibold text-[#8b949e] mb-1">Asistente de Cumplimiento</h2>
              <p className="text-xs text-[#8b949e]/60 max-w-xs leading-relaxed">
                Cargá archivos para analizar y seleccioná los documentos de referencia, luego hacé tu consulta aquí.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2 max-w-sm">
                {[
                  '¿Los logs cumplen ISO 42001?',
                  '¿Existe riesgo GDPR en este documento?',
                  'Analizá sesgos algorítmicos',
                  'Verificá soberanía de datos',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => setInputValue(q)}
                    className="text-left px-3 py-2.5 rounded-xl bg-[#161b22] border border-[#30363d] text-[10px] text-[#8b949e] hover:border-[#388bfd]/40 hover:text-[#c9d1d9] transition-all leading-tight"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col">
            {messages.map((msg, i) => (
              <ChatBubble key={i} {...msg} />
            ))}
            {isLoading && (
              <ChatBubble role="assistant" isLoading steps={processingSteps} />
            )}
          </div>
        </div>

        {/* Input */}
        <div className="px-6 pb-5 pt-3 border-t border-[#21262d] bg-[#0d1117] flex-shrink-0">
          <form onSubmit={handleSend} className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Preguntá sobre el cumplimiento normativo..."
              className="w-full bg-[#161b22] border border-[#30363d] rounded-2xl py-3.5 pl-5 pr-14 text-sm text-[#c9d1d9] placeholder-[#8b949e] focus:outline-none focus:border-[#388bfd]/60 focus:ring-1 focus:ring-[#388bfd]/20 transition-all"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-2 top-2 bottom-2 aspect-square rounded-xl bg-gradient-to-br from-[#388bfd] to-[#1a7bef] text-white flex items-center justify-center transition-all hover:shadow-lg hover:shadow-[#388bfd]/25 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
          <p className="text-center text-[10px] text-[#8b949e]/50 mt-2">
            IA verificada bajo estándares ISO 42001 · {selectedCount} documentos de referencia activos
          </p>
        </div>
      </div>

      {/* ══════════════════════════════
          PANEL 4 — CARGA DE ARCHIVOS
      ══════════════════════════════ */}
      <Panel
        title="Archivos a Analizar"
        icon={ScanLine}
        className="w-72 flex-shrink-0 border-r-0"
        badge={analysisFiles.length || undefined}
        headerExtra={analysisFiles.length > 0 && (
          <button
            onClick={() => setAnalysisFiles([])}
            className="text-[10px] text-[#8b949e] hover:text-red-400 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Limpiar
          </button>
        )}
      >
        {/* Hidden input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.doc,.docx,.txt,.log,.csv,.json"
          onChange={handleFileInputChange}
        />

        {/* Drop Zone */}
        <div className="px-3 pt-3 pb-2">
          <motion.div
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            animate={{ borderColor: isDragOver ? 'rgba(56,139,253,0.6)' : 'rgba(48,54,61,0.8)' }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'relative rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 border-2 border-dashed',
              isDragOver
                ? 'bg-[#388bfd]/8 border-[#388bfd]/60'
                : 'bg-[#161b22] hover:bg-[#21262d] hover:border-[#388bfd]/30'
            )}
          >
            <AnimatePresence mode="wait">
              {isDragOver ? (
                <motion.div
                  key="drag"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex flex-col items-center gap-2"
                >
                  <CloudUpload className="w-10 h-10 text-[#388bfd] animate-bounce" />
                  <p className="text-xs text-[#388bfd] font-semibold">Soltá para analizar</p>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-[#388bfd]/10 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-[#388bfd]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#c9d1d9]">Arrastrá archivos aquí</p>
                    <p className="text-[10px] text-[#8b949e] mt-0.5">o hacé click para seleccionar</p>
                  </div>
                  <p className="text-[9px] text-[#8b949e]/60">PDF, DOC, TXT, LOG, CSV, JSON</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* File list */}
        <AnimatePresence>
          {analysisFiles.length > 0 ? (
            <div className="pb-3">
              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] text-[#8b949e] uppercase tracking-wider font-semibold">
                  Archivos cargados
                </span>
                <span className="text-[10px] text-[#8b949e]">
                  {analysisFiles.filter(f => f.status === 'done').length}/{analysisFiles.length} procesados
                </span>
              </div>
              <AnimatePresence>
                {analysisFiles.map(file => (
                  <UploadedFileCard
                    key={file.id}
                    file={file}
                    onRemove={() => setAnalysisFiles(prev => prev.filter(f => f.id !== file.id))}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-2 py-8 text-[#8b949e]/40"
            >
              <FileText className="w-10 h-10" />
              <p className="text-xs text-center">Sin archivos cargados</p>
              <p className="text-[10px] text-center">Los archivos que subas aparecerán aquí para ser analizados</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom: supported formats */}
        <div className="mt-auto p-3 border-t border-[#21262d]">
          <p className="text-[9px] text-[#8b949e]/60 text-center uppercase tracking-wider mb-2">
            Formatos soportados
          </p>
          <div className="flex flex-wrap gap-1 justify-center">
            {['PDF', 'DOC', 'TXT', 'LOG', 'CSV', 'JSON'].map(fmt => (
              <span key={fmt} className="px-2 py-0.5 rounded bg-[#21262d] text-[9px] text-[#8b949e] border border-[#30363d] font-mono">
                {fmt}
              </span>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}
