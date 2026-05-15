import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Upload, ShieldCheck, Zap, Loader2, Trash2,
  FolderOpen, Plus, File, X, CloudUpload, ScanLine, Clock, LayoutGrid, AlertCircle, CheckCircle2, XCircle, Search, BookOpen, ChevronRight, FileSearch
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

const ExpandableText = ({ text, className, maxLength = 300 }) => {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  
  if (text.length <= maxLength) {
    return <p className={className}>{text}</p>;
  }

  return (
    <div className="flex flex-col h-full">
      <p className={className}>
        {expanded ? text : `${text.substring(0, maxLength)}...`}
      </p>
      <button 
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="text-[#388bfd] hover:text-[#58a6ff] text-xs font-semibold mt-2 self-start transition-colors"
      >
        {expanded ? 'Mostrar menos ▲' : 'Leer detalle completo ▼'}
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────
//  Main App
// ─────────────────────────────────────────────
export default function App() {
  // ── States ──
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('compliance_projects');
    if (saved) return JSON.parse(saved);
    return [
      { 
        id: 'p1', 
        name: 'Mi Primera Auditoría', 
        status: 'active', 
        docs: [], 
        auditResult: null, 
        auditStatus: 'idle',
        selectedFramework: 'saij',
        lastModified: 'Hoy' 
      }
    ];
  });
  
  const [activeProjectId, setActiveProjectId] = useState(() => {
    return localStorage.getItem('compliance_active_project_id') || 'p1';
  });

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  // Dashboard states: idle, loading, done, error
  const [processingSteps, setProcessingSteps] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isBackendHealthy, setIsBackendHealthy] = useState(false);

  const fileInputRef = useRef(null);
  const sessionId = useRef(Math.random().toString(36).substr(2, 9));
  
  // Derived values
  const analysisFiles = activeProject?.docs || [];
  const auditResult = activeProject?.auditResult || null;
  const auditStatus = activeProject?.auditStatus || 'idle';
  const selectedFramework = activeProject?.selectedFramework || 'saij';
  
  // Keep collection name tied to project id
  const collectionName = `project_${activeProject?.id || 'default'}`;

  // ── Helpers ──
  const updateActiveProject = (updates) => {
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId ? { ...p, ...updates, lastModified: 'Ahora' } : p
    ));
  };

  const setSelectedFramework = (framework) => updateActiveProject({ selectedFramework: framework });
  const setAuditStatus = (status) => updateActiveProject({ auditStatus: status });
  const setAuditResult = (result) => updateActiveProject({ auditResult: result });
  const setAnalysisFiles = (updater) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      const newDocs = typeof updater === 'function' ? updater(p.docs) : updater;
      return { ...p, docs: newDocs, lastModified: 'Ahora' };
    }));
  };

  // ── Effects ──
  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then(r => r.ok && setIsBackendHealthy(true))
      .catch(() => setIsBackendHealthy(false));
  }, []);

  useEffect(() => {
    localStorage.setItem('compliance_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('compliance_active_project_id', activeProjectId);
  }, [activeProjectId]);

  // ── Actions ──
  const createProject = () => {
    const newProject = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Auditoría ${projects.length + 1}`,
      status: 'active',
      docs: [],
      auditResult: null,
      auditStatus: 'idle',
      selectedFramework: 'saij',
      lastModified: 'Ahora'
    };
    setProjects(prev => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
  };

  const deleteProject = (id, e) => {
    e.stopPropagation();
    if (!window.confirm("¿Seguro que deseas eliminar este proyecto?")) return;
    const filtered = projects.filter(p => p.id !== id);
    setProjects(filtered);
    if (activeProjectId === id) {
      setActiveProjectId(filtered.length > 0 ? filtered[0].id : null);
    }
  };

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
        setAnalysisFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'done', raw: null } : f));
      } catch (_) {
        setAnalysisFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'error', raw: null } : f));
      }
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

  const runAudit = async () => {
    if (!activeProject || analysisFiles.length === 0) {
      alert("Sube al menos un archivo para auditar.");
      return;
    }

    const hiddenQuery = selectedFramework === 'saij' 
      ? 'Analizar de forma rigurosa y exhaustiva el cumplimiento legal de todo el documento.' 
      : 'Revisar el cumplimiento del documento referenciando los estándares de seguridad.';

    setAuditStatus('loading');
    setProcessingSteps([
      'Extrayendo conceptos clave del documento...',
      selectedFramework === 'saij' ? 'Consultando leyes oficiales en SAIJ/CKAN Argentina...' : 'Buscando en repositorios de normativas ISO locales...',
      'Ejecutando cruce de datos (Agentes en paralelo)...',
      'Elaborando veredicto oficial...',
    ]);

    try {
      const resp = await fetch(`${API_BASE_URL}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: hiddenQuery, 
          session_id: sessionId.current, 
          collection_name: collectionName,
          framework: selectedFramework
        }),
      });

      if (!resp.ok) throw new Error("Error en API");
      const data = await resp.json();
      
      setAuditResult(data);
      setAuditStatus('done');
    } catch {
      await new Promise(r => setTimeout(r, 2000));
      setAuditResult({
          veredicto: "Error",
          razonamiento: "(Modo Offline) Hubo un fallo conectando con el backend.",
          evidencia: "No se encontraron evidencias por problemas de conexión.",
          critica: "No se pudo realizar la crítica.",
          citations: []
      });
      setAuditStatus('error');
    }
  };

  const clearCache = async () => {
    if (!window.confirm("¿Seguro que deseas purgar la caché? Esto borrará todos los archivos subidos para este proyecto en la base de datos.")) return;
    try {
      await fetch(`${API_BASE_URL}/purge?collection_name=${collectionName}`, {
        method: 'POST',
      });
      setAnalysisFiles([]);
      updateActiveProject({ auditResult: null, auditStatus: 'idle' });
    } catch (e) {
      console.error("Error purging cache:", e);
      alert("Error al purgar la caché del backend.");
    }
  };

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
          <button onClick={createProject} className="p-1.5 rounded-md hover:bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        }
      >
        <div className="px-1 py-2">
          {projects.map(p => (
            <div
              key={p.id}
              onClick={() => setActiveProjectId(p.id)}
              className={cn(
                'w-[calc(100%-16px)] mx-2 my-1 p-3 rounded-lg cursor-pointer transition-all border group relative',
                activeProjectId === p.id ? 'bg-[#388bfd]/10 border-[#388bfd]/30' : 'bg-transparent border-transparent hover:bg-[#21262d]'
              )}
            >
              <div className="flex justify-between items-start">
                <span className={cn('text-sm font-medium', activeProjectId === p.id ? 'text-white' : 'text-[#c9d1d9]')}>
                  {p.name}
                </span>
                <button onClick={(e) => deleteProject(p.id, e)} className="opacity-0 group-hover:opacity-100 p-1 -mr-1 -mt-1 text-[#8b949e] hover:text-red-400 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="flex gap-3 text-[10px] text-[#8b949e] mt-2">
                <span className="flex items-center gap-1"><FileText className="w-3 h-3"/> {p.docs?.length || 0}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {p.lastModified}</span>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <p className="text-xs text-center text-[#8b949e] mt-10">Ningún proyecto creado.</p>
          )}
        </div>
      </Panel>

      {/* ══════════════════════════════
          PANEL 2 — MARCO NORMATIVO 
      ══════════════════════════════ */}
      <Panel
        title="Marco Referencial"
        icon={BookOpen}
        className="w-64 flex-shrink-0"
      >
        <div className="p-4 flex flex-col gap-3">
          <p className="text-xs text-[#8b949e] mb-2 leading-relaxed">
            Seleccioná el modelo normativo (BYOL) mediante el cual ComplAI evaluará tus documentos.
          </p>
          
          <div 
            onClick={() => setSelectedFramework('saij')}
            className={cn(
              "p-3 rounded-lg border cursor-pointer transition-all",
              selectedFramework === 'saij' 
                ? "bg-gradient-to-br from-[#1a7bef]/10 to-[#bc8cff]/10 border-[#388bfd]/50"
                : "bg-[#161b22] border-[#30363d] hover:border-[#8b949e]/50"
            )}
          >
            <div className="flex justify-between items-start mb-2">
              <span className={cn('text-sm font-bold block', selectedFramework === 'saij' ? 'text-white' : 'text-[#c9d1d9]')}>Leyes (SAIJ)</span>
              {selectedFramework === 'saij' && <CheckCircle2 className="w-4 h-4 text-[#388bfd]"/> }
            </div>
            <p className="text-[10px] text-[#8b949e]">Sistema Argentino de Información Jurídica. Descarga y audita contra legislación nacional de forma dinámica (CKAN API).</p>
          </div>

          <div 
            onClick={() => setSelectedFramework('iso')}
            className={cn(
              "p-3 rounded-lg border cursor-pointer transition-all",
              selectedFramework === 'iso' 
                ? "bg-[#3fb950]/10 border-[#3fb950]/50"
                : "bg-[#161b22] border-[#30363d] hover:border-[#8b949e]/50"
            )}
          >
             <div className="flex justify-between items-start mb-2">
              <span className={cn('text-sm font-bold block', selectedFramework === 'iso' ? 'text-white' : 'text-[#c9d1d9]')}>Estándares Globales</span>
              {selectedFramework === 'iso' && <CheckCircle2 className="w-4 h-4 text-[#3fb950]"/> }
            </div>
            <p className="text-[10px] text-[#8b949e]">Audita documentos usando normativas como ISO 42001, SOC 2 Typ II o plantillas locales (Offline).</p>
          </div>
        </div>
      </Panel>

      {/* ══════════════════════════════
          PANEL 3 — DASHBOARD AUDITORÍA
      ══════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117] border-r border-[#21262d] relative">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-[#21262d] bg-[#161b22] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#388bfd] to-[#bc8cff] flex items-center justify-center shadow-lg shadow-[#388bfd]/20">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">ComplAI Auditor Pro</h1>
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-[#d29922]" />
                <span className="text-[10px] text-[#8b949e] uppercase tracking-widest font-semibold flex items-center gap-1">
                  Dashboard de Análisis <span className="text-white bg-[#30363d] px-1 rounded">{selectedFramework.toUpperCase()}</span>
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <div className={cn(
                  'w-2 h-2 rounded-full',
                  isBackendHealthy ? 'bg-[#3fb950] shadow-[0_0_6px_rgba(63,185,80,0.5)]' : 'bg-red-500'
                )} />
             <span className="text-[10px] text-[#8b949e] font-mono">{isBackendHealthy ? 'API ONLINE' : 'API OFFLINE'}</span>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin flex flex-col items-center justify-center">
          
          <AnimatePresence mode="wait">
            {/* ESTADO IDLE */}
            {auditStatus === 'idle' && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center max-w-lg text-center gap-5"
              >
                <div className="w-20 h-20 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center shadow-2xl">
                   <FileSearch className="w-10 h-10 text-[#8b949e]"/>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Comienza tu Auditoría</h2>
                  <p className="text-sm text-[#8b949e] leading-relaxed">
                    Sube y carga tus documentos corporativos en el panel derecho. Luego, con un solo click validaremos todo tu set contra el marco <strong>{selectedFramework === 'saij' ? 'Leyes Argentinas (SAIJ)' : 'Estándares (ISO)'}</strong>.
                  </p>
                </div>
                <button 
                  onClick={runAudit}
                  disabled={analysisFiles.length === 0}
                  className="mt-4 px-8 py-3.5 rounded-xl text-white font-bold bg-gradient-to-r from-[#388bfd] to-[#bc8cff] hover:shadow-[0_0_20px_rgba(56,139,253,0.4)] transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group"
                >
                  <span className="flex items-center gap-2">Ejecutar Auditoría General <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/></span>
                </button>
                {analysisFiles.length === 0 && <p className="text-[10px] text-red-400">⚠️ Necesitas subir al menos un archivo primero.</p>}
              </motion.div>
            )}

            {/* ESTADO LOADING */}
            {auditStatus === 'loading' && (
               <motion.div 
                 key="loading"
                 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                 className="flex flex-col items-center gap-6 w-full max-w-sm"
               >
                 <div className="relative w-24 h-24 flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-[#388bfd] animate-spin absolute" />
                    <ShieldCheck className="w-5 h-5 text-[#bc8cff] relative z-10 animate-pulse" />
                 </div>
                 <div className="w-full bg-[#161b22] p-6 rounded-2xl border border-[#30363d] space-y-3 shadow-2xl">
                    <p className="text-xs text-white font-bold uppercase tracking-widest text-center mb-4">Progreso</p>
                    {processingSteps.map((step, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.8 }}
                        className="text-[11px] text-[#c9d1d9] flex items-center gap-2"
                      >
                        <ScanLine className="w-4 h-4 text-[#388bfd] flex-shrink-0" />
                        {step}
                      </motion.div>
                    ))}
                 </div>
               </motion.div>
            )}

            {/* ESTADO DONE */}
            {(auditStatus === 'done' || auditStatus === 'error') && auditResult && (
              <motion.div 
               key="done"
               initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
               className="w-full h-full flex flex-col justify-start max-w-4xl"
              >
                {/* Header info */}
                <div className="flex items-end justify-between mb-8 border-b border-[#30363d] pb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Reporte de Cumplimiento</h2>
                    <p className="text-xs text-[#8b949e]">Proyecto: {activeProject?.name} • Marco: {selectedFramework.toUpperCase()} • Análisis en {(auditResult.latency_ms / 1000).toFixed(2)}s</p>
                  </div>
                  <button onClick={() => setAuditStatus('idle')} className="text-xs px-4 py-2 bg-[#21262d] rounded-lg text-[#c9d1d9] hover:bg-[#30363d] transition-colors border border-[#30363d]">
                    Nueva Auditoría
                  </button>
                </div>

                {/* Veredicto Banner */}
                <div className={cn(
                    "p-6 rounded-2xl border mb-6 flex items-start flex-col sm:flex-row gap-5",
                    auditResult.veredicto?.toLowerCase().includes('no cumple') || auditResult.veredicto === 'Error'
                      ? "bg-red-500/10 border-red-500/30 text-red-200" 
                      : auditResult.veredicto?.toLowerCase().includes('parcial')
                        ? "bg-[#d29922]/10 border-[#d29922]/30 text-[#d29922]"
                        : "bg-[#3fb950]/10 border-[#3fb950]/30 text-[#3fb950]"
                  )}>
                   {auditResult.veredicto?.toLowerCase().includes('no cumple') || auditResult.veredicto === 'Error' ? <XCircle className="w-10 h-10 flex-shrink-0" /> : <CheckCircle2 className="w-10 h-10 flex-shrink-0"/>}
                   <div>
                     <h3 className="text-base font-bold uppercase tracking-wider mb-2">Veredicto Final: {auditResult.veredicto}</h3>
                     <p className="text-sm leading-relaxed opacity-90">{auditResult.razonamiento}</p>
                   </div>
                </div>

                {/* Grid Evidencia & Critica */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Evidencia */}
                  <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 flex flex-col">
                    <h4 className="text-xs font-bold text-[#8b949e] uppercase tracking-widest mb-4 flex items-center gap-2">
                       <FileText className="w-4 h-4"/> Evidencia Encontrada
                    </h4>
                    <ExpandableText text={auditResult.evidencia} className="text-sm text-[#c9d1d9] leading-relaxed whitespace-pre-wrap flex-1" />
                  </div>

                  {/* Critica */}
                  <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 flex flex-col">
                    <h4 className="text-xs font-bold text-[#8b949e] uppercase tracking-widest mb-4 flex items-center gap-2">
                       <AlertCircle className="w-4 h-4"/> Crítica & Riesgos
                    </h4>
                    <ExpandableText text={auditResult.critica} className="text-sm text-[#c9d1d9] leading-relaxed whitespace-pre-wrap flex-1" />
                  </div>
                </div>

                {/* Citations section */}
                {auditResult.citations && auditResult.citations.length > 0 && (
                  <div className="flex flex-col gap-6">
                    {/* Document Snippets */}
                    {auditResult.citations.filter(c => !c.source.startsWith('SAIJ:')).length > 0 && (
                      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
                         <h4 className="text-xs font-bold text-[#8b949e] uppercase tracking-widest mb-4 flex items-center gap-2">
                           <FileSearch className="w-4 h-4"/> Fragmentos del Documento Analizados
                        </h4>
                        <div className="flex flex-col gap-3">
                          {auditResult.citations.filter(c => !c.source.startsWith('SAIJ:')).map((cite, i) => (
                             <div key={i} className="p-3 rounded-lg bg-[#0d1117] border border-[#21262d]">
                               <span className="text-xs font-bold text-[#8b949e] block mb-1.5">{cite.source}</span>
                               <ExpandableText text={`"${cite.snippet}"`} className="text-[11px] text-[#8b949e] leading-relaxed italic" maxLength={150} />
                             </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Laws / Framework */}
                    {auditResult.citations.filter(c => c.source.startsWith('SAIJ:')).length > 0 && (
                      <div className="bg-gradient-to-br from-[#1a7bef]/5 to-[#bc8cff]/5 border border-[#388bfd]/30 rounded-2xl p-6 mt-4">
                         <h4 className="text-sm font-bold text-[#c9d1d9] uppercase tracking-widest mb-4 flex items-center gap-2">
                           <BookOpen className="w-5 h-5 text-[#388bfd]"/> Marco Normativo / Leyes Aplicadas
                        </h4>
                        <p className="text-xs text-[#8b949e] mb-4">Las siguientes normativas oficiales fueron utilizadas como base estricta para auditar tu documento:</p>
                        <div className="flex flex-col gap-3">
                          {auditResult.citations.filter(c => c.source.startsWith('SAIJ:')).map((cite, i) => (
                             <div key={i} className="p-4 rounded-lg bg-[#0d1117] border border-[#388bfd]/20 shadow-lg">
                               <span className="text-sm font-bold text-[#388bfd] block mb-2">{cite.source.replace('SAIJ: ', '')}</span>
                               <ExpandableText text={cite.snippet} className="text-xs text-[#c9d1d9] leading-relaxed" maxLength={200} />
                             </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ══════════════════════════════
          PANEL 4 — CARGA DE ARCHIVOS
      ══════════════════════════════ */}
      <Panel
        title="Documentos"
        icon={ScanLine}
        className="w-72 flex-shrink-0 border-r-0"
        badge={analysisFiles.length || undefined}
        headerExtra={
          <button onClick={clearCache} className="text-[10px] text-[#8b949e] hover:text-red-400 transition-colors flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Purgar Caché
          </button>
        }
      >
        <input ref={fileInputRef} type="file" className="hidden" multiple accept=".pdf,.doc,.docx,.txt" onChange={handleFileInputChange} />

        <div className="px-3 pt-3 pb-2">
          <motion.div
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            animate={{ borderColor: isDragOver ? 'rgba(56,139,253,0.6)' : 'rgba(48,54,61,0.8)' }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'relative rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 border-2 border-dashed',
              isDragOver ? 'bg-[#388bfd]/8 border-[#388bfd]/60' : 'bg-[#161b22] hover:bg-[#21262d] hover:border-[#388bfd]/30'
            )}
          >
            <AnimatePresence mode="wait">
              {isDragOver ? (
                <motion.div key="drag" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="flex flex-col items-center gap-2">
                  <CloudUpload className="w-10 h-10 text-[#388bfd] animate-bounce" />
                  <p className="text-xs text-[#388bfd] font-semibold">Soltá para analizar</p>
                </motion.div>
              ) : (
                <motion.div key="idle" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="flex flex-col items-center gap-2 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#388bfd]/10 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-[#388bfd]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#c9d1d9]">Subir Evidencias</p>
                    <p className="text-[10px] text-[#8b949e] mt-0.5">Click o arrastrá tus archivos</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="px-4 py-2 mt-2 border-t border-[#21262d]">
           <span className="text-[10px] text-[#8b949e] uppercase tracking-wider font-semibold">En proyecto: <span className="text-white">{activeProject?.name}</span></span>
        </div>

        <AnimatePresence>
          {analysisFiles.length > 0 ? (
            <div className="pb-3 px-1">
              <AnimatePresence>
                {analysisFiles.map(file => {
                   const ext = file.name.split('.').pop().toUpperCase();
                   return (
                     <motion.div
                       key={file.id}
                       initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, x: 20 }} layout
                       className="flex items-center gap-3 px-3 py-2.5 mx-2 my-1 rounded-lg bg-[#161b22] border border-[#30363d] group"
                     >
                       <div className="px-1.5 py-0.5 rounded text-[9px] font-bold border flex-shrink-0 bg-[#388bfd]/10 text-[#388bfd] border-[#388bfd]/20">{ext}</div>
                       <div className="flex-1 min-w-0">
                         <p className="text-xs text-[#c9d1d9] font-medium truncate">{file.name}</p>
                         <p className="text-[10px] text-[#8b949e]">{(file.size && file.status !== 'loading') ? `${(file.size / 1024).toFixed(1)} KB` : file.status}</p>
                       </div>
                       <div className="flex items-center gap-1.5">
                         {file.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-[#3fb950]" />}
                         {file.status === 'error' && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                         {file.status === 'loading' && <Loader2 className="w-3.5 h-3.5 text-[#388bfd] animate-spin" />}
                         <button onClick={() => setAnalysisFiles(prev => prev.filter(f => f.id !== file.id))} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 hover:text-red-400 text-[#8b949e] transition-all"><X className="w-3 h-3" /></button>
                       </div>
                     </motion.div>
                   )
                })}
              </AnimatePresence>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2 py-8 text-[#8b949e]/40">
              <FileText className="w-10 h-10" />
              <p className="text-xs text-center">Sin documentos subidos</p>
            </motion.div>
          )}
        </AnimatePresence>
      </Panel>
    </div>
  );
}
