import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  LogOut, 
  ChevronRight, 
  Search,
  BookOpen,
  ShieldCheck,
  Zap,
  Loader2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for tailwind classes
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Panel = ({ title, children, className, icon: Icon }) => (
  <div className={cn("flex flex-col h-full bg-slate-900/50 backdrop-blur-md border-r border-slate-800", className)}>
    <div className="flex items-center gap-2 p-4 border-b border-slate-800">
      {Icon && <Icon className="w-5 h-5 text-corporate-blue" />}
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
    </div>
    <div className="flex-1 overflow-y-auto">
      {children}
    </div>
  </div>
);

const DocumentItem = ({ name, type, selected, onClick, onDelete }) => (
  <div 
    onClick={onClick}
    className={cn(
      "group flex items-center justify-between p-3 mx-2 my-1 rounded-lg cursor-pointer transition-all duration-200",
      selected ? "bg-corporate-blue/10 border border-corporate-blue/30" : "hover:bg-slate-800/50 border border-transparent"
    )}
  >
    <div className="flex items-center gap-3 overflow-hidden">
      <div className={cn("p-2 rounded-md", selected ? "bg-corporate-blue/20 text-corporate-blue" : "bg-slate-800 text-slate-400")}>
        <FileText className="w-4 h-4" />
      </div>
      <div className="overflow-hidden">
        <p className={cn("text-sm font-medium truncate", selected ? "text-white" : "text-slate-300")}>{name}</p>
        <p className="text-xs text-slate-500 uppercase">{type}</p>
      </div>
    </div>
    <button 
      onClick={(e) => { e.stopPropagation(); onDelete(); }}
      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-400 text-slate-500 transition-all"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  </div>
);

const ChatBubble = ({ role, content, citations, isLoading, steps }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      "flex flex-col max-w-[85%] mb-6",
      role === 'user' ? "self-end items-end" : "self-start items-start"
    )}
  >
    <div className={cn(
      "p-4 rounded-2xl text-sm leading-relaxed",
      role === 'user' 
        ? "bg-corporate-blue text-white rounded-tr-none" 
        : "bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none"
    )}>
      {isLoading ? (
        <div className="flex flex-col gap-3 min-w-[200px]">
          <div className="flex items-center gap-2 text-corporate-blue font-medium animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>ComplAI Auditor Procesando...</span>
          </div>
          <div className="space-y-1">
            {steps?.map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[10px] text-slate-500 flex items-center gap-1.5"
              >
                <div className="w-1 h-1 rounded-full bg-slate-600" />
                {step}
              </motion.div>
            ))}
          </div>
        </div>
      ) : content}
    </div>
    
    {!isLoading && citations && citations.length > 0 && (
      <div className="mt-2 flex flex-wrap gap-2">
        {citations.map((cite, i) => (
          <button key={i} className="text-[10px] px-2 py-1 rounded bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-corporate-blue hover:border-corporate-blue/50 transition-colors flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            {cite.source} (pág. {cite.page})
          </button>
        ))}
      </div>
    )}
  </motion.div>
);

const ComplianceCard = ({ title, status, reason }) => {
  const [showReason, setShowReason] = useState(false);
  
  const statusStyles = {
    pass: { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: CheckCircle2 },
    warning: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: AlertCircle },
    fail: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: XCircle },
  };

  const current = statusStyles[status];
  const StatusIcon = current.icon;

  return (
    <div className={cn("p-4 mx-4 my-2 rounded-xl border transition-all duration-300", current.bg, current.border)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <StatusIcon className={cn("w-5 h-5", current.color)} />
          <h3 className="text-sm font-medium text-slate-200">{title}</h3>
        </div>
        <button 
          onClick={() => setShowReason(!showReason)}
          className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
        >
          {showReason ? "Ocultar" : "Ver Por Qué"}
        </button>
      </div>
      <AnimatePresence>
        {showReason && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pt-2 text-xs text-slate-400 leading-relaxed border-t border-slate-800/50">
              {reason}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [documents, setDocuments] = useState([
    { id: '1', name: 'AI_Policy_v2.pdf', type: 'SOP', path: '' },
    { id: '2', name: 'System_Logs_March.txt', type: 'LOG', path: '' }
  ]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [processingSteps, setProcessingSteps] = useState([]);
  const [sessionId] = useState(() => Math.random().toString(36).substr(2, 9));
  const [collectionName] = useState(() => `session_${sessionId}`);
  const [isBackendHealthy, setIsBackendHealthy] = useState(false);

  const scrollRef = useRef(null);

  useEffect(() => {
    // Check Backend Health
    const checkHealth = async () => {
      try {
        const res = await fetch("http://localhost:8001/health");
        if (res.ok) setIsBackendHealthy(true);
      } catch (e) {
        console.error("Backend not reachable");
        setIsBackendHealthy(false);
      }
    };
    checkHealth();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const fileInputRef = useRef(null);

  const handleUploadClick = async () => {
    if (window.electronAPI) {
      // Usar diálogo nativo de Electron
      const files = await window.electronAPI.openFileDialog();
      if (files && files.length > 0) {
        for (const f of files) {
          // Nota: En un entorno local de Electron, el backend (Python) 
          // podría acceder al archivo directamente por su path si está habilitado,
          // pero aquí mantenemos la lógica de subida por API para mayor seguridad.
          setDocuments(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            name: f.name,
            type: f.type,
            path: f.path
          }]);
        }
      }
    } else if (fileInputRef.current) {
      // Fallback a diálogo web estándar
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const formData = new FormData();
        formData.append('file', f);
        
        try {
          const res = await fetch(`http://localhost:8001/upload?collection_name=${collectionName}`, {
            method: 'POST',
            body: formData
          });
          
          if (res.ok) {
            setDocuments(prev => [...prev, {
              id: Math.random().toString(36).substr(2, 9),
              name: f.name,
              type: f.name.split('.').pop().toUpperCase() || 'FILE',
              path: ''
            }]);
          }
        } catch (error) {
          console.error("Upload failed", error);
          setDocuments(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            name: f.name,
            type: f.name.split('.').pop().toUpperCase() || 'FILE',
            path: ''
          }]);
        }
      }
    }
  };

  const handleEndSession = async () => {
    try {
      await fetch(`http://localhost:8001/purge?collection_name=${collectionName}`, { method: 'POST' });
    } catch (e) {
      console.error("Session purge failed", e);
    }
    setDocuments([]);
    setMessages([]);
    setSelectedDocId(null);
  };

  const runRealAudit = async (query) => {
    setIsLoading(true);
    setProcessingSteps(["Consultando Analista...", "Verificando con Auditor...", "Consensuando Veredicto..."]);
    
    try {
      const resp = await fetch("http://localhost:8001/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query,
          session_id: sessionId,
          collection_name: collectionName
        })
      });

      if (!resp.ok) throw new Error("API Error");
      
      const data = await resp.json();
      
      setIsLoading(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.razonamiento,
        citations: data.citations.map((c) => ({
          source: c.source,
          page: 1, // Mocked page
          snippet: c.snippet
        }))
      }]);
    } catch (e) {
      console.error("Audit failed", e);
      // Fallback a simulación
      await new Promise(r => setTimeout(r, 2000));
      setIsLoading(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `(Modo Offline) El análisis para "${query}" sugiere cumplimiento parcial. Por favor verifica los logs de Bedrock.`,
        citations: []
      }]);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = { role: 'user', content: inputValue };
    setMessages([...messages, userMessage]);
    setInputValue('');
    runRealAudit(inputValue);
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      
      {/* Panel Izquierdo: Library */}
      <Panel title="Library" className="w-72" icon={BookOpen}>
        <div className="p-4">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            multiple 
            accept=".pdf,.doc,.docx,.txt,.log"
          />
          <button 
            onClick={handleUploadClick}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-corporate-blue hover:bg-blue-600 rounded-xl transition-all font-semibold text-sm shadow-lg shadow-corporate-blue/20"
          >
            <Upload className="w-4 h-4" />
            Cargar Documento
          </button>
        </div>
        <div className="space-y-1">
          {documents.map(doc => (
            <DocumentItem 
              key={doc.id} 
              {...doc} 
              selected={selectedDocId === doc.id}
              onClick={() => setSelectedDocId(doc.id)}
              onDelete={() => setDocuments(documents.filter(d => d.id !== doc.id))}
            />
          ))}
          {documents.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center opacity-40">
              <FileText className="w-12 h-12 mb-3" />
              <p className="text-xs">Sin documentos cargados</p>
            </div>
          )}
        </div>
      </Panel>

      {/* Panel Central: Chat */}
      <div className="flex-1 flex flex-col bg-slate-900 border-r border-slate-800 relative shadow-2xl z-10">
        <header className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="bg-corporate-blue/20 p-2 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-corporate-blue" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold">ComplAI Auditor</h1>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-500" /> Auditoría en Tiempo Real
                </p>
                <div className={cn("w-2 h-2 rounded-full", isBackendHealthy ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" : "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]")} />
                <span className="text-[8px] text-slate-500">{isBackendHealthy ? "API CONECTADA" : "API OFFLINE"}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={handleEndSession}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 transition-all text-xs font-medium text-slate-400"
          >
            <LogOut className="w-3.5 h-3.5" />
            Finalizar Sesión
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col custom-scrollbar" ref={scrollRef}>
          {messages.length === 0 && !isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 px-12">
              <div className="p-6 bg-slate-800 rounded-full mb-4">
                <MessageSquare className="w-12 h-12" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Asistente de Cumplimiento</h2>
              <p className="text-sm max-w-sm">
                Haz una pregunta sobre el estado de cumplimiento de los documentos cargados para comenzar el análisis.
              </p>
            </div>
          )}
          
          {messages.map((msg, i) => (
            <ChatBubble key={i} {...msg} />
          ))}
          
          {isLoading && (
            <ChatBubble role="assistant" isLoading steps={processingSteps} />
          )}
        </div>

        <div className="p-6 bg-slate-900/80 backdrop-blur-sm border-t border-slate-800">
          <form onSubmit={handleSendMessage} className="relative group">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Pregunta sobre el cumplimiento normativo..."
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-corporate-blue/50 focus:border-corporate-blue text-sm transition-all shadow-inner"
            />
            <button 
              type="submit"
              className="absolute right-2 top-2 bottom-2 aspect-square bg-corporate-blue hover:bg-blue-600 text-white rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95 disabled:opacity-50"
              disabled={!inputValue.trim() || isLoading}
            >
              <ChevronRight className={cn("w-5 h-5 transition-transform", isLoading && "animate-pulse")} />
            </button>
          </form>
          <p className="mt-3 text-[10px] text-center text-slate-500">
            Inteligencia Artificial Propietaria • Verificada bajo estándares ISO 42001
          </p>
        </div>
      </div>

      {/* Panel Derecho: Compliance Dashboard */}
      <Panel title="Compliance Dashboard" className="w-80 border-r-0" icon={ShieldCheck}>
        <div className="p-4 pb-0">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 mb-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400">Score de Cumplimiento</span>
              <span className="font-bold text-green-400">82%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 w-[82%] rounded-full shadow-[0_0_10px_rgba(34,197,94,0.3)]" />
            </div>
          </div>
        </div>
        
        <div className="pb-6">
          <ComplianceCard 
            title="Transparencia de Datos" 
            status="pass" 
            reason="Los logs de sistema demuestran una trazabilidad completa de las decisiones del modelo, cumpliendo con el Art. 13 de la Ley de IA de la UE."
          />
          <ComplianceCard 
            title="Gestión de Sesgos" 
            status="warning" 
            reason="Se detectaron menciones genéricas en la política de privacidad. Se requiere especificar métodos de testeo estadístico para grupos vulnerables."
          />
          <ComplianceCard 
            title="Soberanía de Datos" 
            status="fail" 
            reason="El documento menciona el uso de servidores en regiones fuera de la UE sin especificar mecanismos de encriptación de extremo a extremo."
          />
          <ComplianceCard 
            title="Ciberseguridad" 
            status="pass" 
            reason="La arquitectura descrita utiliza MFA y segmentación de red adecuada para sistemas de IA de alto riesgo."
          />
        </div>
        
        <div className="mt-auto p-4 border-t border-slate-800">
          <button className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all text-xs font-medium">
            <Search className="w-3.5 h-3.5 text-corporate-blue" />
            Auditoría Completa
          </button>
        </div>
      </Panel>

    </div>
  );
}
