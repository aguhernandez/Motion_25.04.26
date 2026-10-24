import { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Film } from 'lucide-react';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';
import { IMAGE_ACCEPT, MEDIA_ACCEPT, mediaFileError } from '../../lib/mediaFiles';

interface Props {
  allowVideo?: boolean;
  disabled?: boolean;
  onFileSelect?: (file: File) => void;
  onStartSession?: () => void;
}

export default function MediaUploadArea({ allowVideo = false, disabled = false, onFileSelect, onStartSession }: Props) {
  const { language, darkMode } = useT();
  const es = language === 'es';
  const th = getTheme(darkMode);
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const selectFile = (file?: File) => {
    if (!file || disabled || !onFileSelect) return;
    const message = mediaFileError(file, allowVideo, language);
    setError(message ?? '');
    if (!message) onFileSelect(file);
  };
  const canUpload = !!onFileSelect && !disabled;
  return <section
    aria-label={es ? 'Cargar archivo para analizar' : 'Load a file for analysis'}
    className="w-full h-full min-h-[260px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-4 px-6 py-8 text-center transition-colors"
    style={{ background: dragging ? 'rgba(6,182,212,0.08)' : th.tagBg, borderColor: dragging ? '#06b6d4' : th.inputBorder }}
    onDragOver={(event) => { event.preventDefault(); if (canUpload) { event.dataTransfer.dropEffect = 'copy'; setDragging(true); } }}
    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
    onDrop={(event) => {
      event.preventDefault(); setDragging(false);
      if (!canUpload) return;
      if (event.dataTransfer.files.length > 1) { setError(es ? 'Selecciona un solo archivo a la vez.' : 'Select one file at a time.'); return; }
      selectFile(event.dataTransfer.files[0]);
    }}
  >
    <div className="rounded-2xl p-4" style={{ background: th.panelBg, color: '#06b6d4' }}><Upload className="h-8 w-8" aria-hidden="true" /></div>
    <div className="space-y-2">
      <h3 className="text-base font-semibold" style={{ color: th.title }}>{es ? (allowVideo ? 'Carga tu imagen o video' : 'Carga tu imagen') : (allowVideo ? 'Load your image or video' : 'Load your image')}</h3>
      <p className="text-sm" style={{ color: th.sub }}>{onStartSession
        ? (es ? 'Crea una sesión para comenzar con tu propio archivo.' : 'Create a session to start with your own file.')
        : (es ? 'Arrastra y suelta tu archivo aquí o selecciónalo desde tu dispositivo.' : 'Drag and drop your file here or select it from your device.')}</p>
    </div>
    {(onFileSelect || onStartSession) && <button type="button" disabled={disabled} onClick={() => onStartSession ? onStartSession() : input.current?.click()} className="px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400" style={{ background: '#fdda36', color: '#514163' }}>
      {onStartSession ? (es ? 'Crear sesión' : 'Create session') : (es ? 'Seleccionar archivo' : 'Select file')}
    </button>}
    {onFileSelect && <input ref={input} type="file" accept={allowVideo ? MEDIA_ACCEPT : IMAGE_ACCEPT} aria-label={es ? 'Archivo para analizar' : 'File to analyze'} className="sr-only" disabled={disabled} onChange={(event) => { selectFile(event.target.files?.[0]); event.target.value = ''; }} />}
    <div className="space-y-1.5 text-xs" style={{ color: th.sub }}>
      <p className="flex items-center justify-center gap-2"><ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />JPG, PNG, WebP, GIF · {es ? 'máx.' : 'max.'} 20 MB</p>
      {allowVideo && <p className="flex items-center justify-center gap-2"><Film className="h-3.5 w-3.5" aria-hidden="true" />MP4, MOV, WebM, AVI · {es ? 'máx.' : 'max.'} 500 MB</p>}
      <p>{es ? 'El archivo se abre localmente en tu navegador.' : 'The file opens locally in your browser.'}</p>
    </div>
    {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
  </section>;
}
