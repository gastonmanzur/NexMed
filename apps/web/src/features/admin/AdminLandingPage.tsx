import { useEffect, useState, type ChangeEvent, type ReactElement } from 'react';
import { adminApi, type LandingContentState } from './admin-api';
import { useAuth } from '../auth/AuthContext';

type AnyRecord = Record<string, any>;

const sectionTabs = [
  ['hero', 'Hero'], ['features', 'Features'], ['problemSolution', 'Problema/Solución'], ['howItWorks', 'Cómo funciona'],
  ['benefits', 'Beneficios'], ['modules', 'Showcase'], ['testimonials', 'Testimonios'], ['faq', 'FAQ'], ['finalCta', 'CTA final'], ['footer', 'Footer']
] as const;

const deepClone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const setAtPath = (obj: AnyRecord, path: string, value: unknown) => {
  const keys = path.split('.');
  let ref: AnyRecord = obj;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const k = keys[i] as string;
    ref = ref[k] ?? (ref[k] = {});
  }
  const last = keys[keys.length - 1] as string;
  ref[last] = value;
};

const Text = ({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) => (
  <label className="nx-field"><span>{label}</span><input value={value ?? ''} onChange={(e)=>onChange(e.target.value)} /></label>
);
const Area = ({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) => (
  <label className="nx-field"><span>{label}</span><textarea rows={3} value={value ?? ''} onChange={(e)=>onChange(e.target.value)} /></label>
);

export const AdminLandingPage = (): ReactElement => {
  const { accessToken } = useAuth();
  const [remoteState, setRemoteState] = useState<LandingContentState | null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [active, setActive] = useState<(typeof sectionTabs)[number][0]>('hero');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    adminApi.getLandingAdmin(accessToken).then((data) => {
      setRemoteState(data);
      setDraft(deepClone(data.draft));
    });
  }, [accessToken]);

  const update = (path: string, value: unknown) => setDraft((prev: any) => {
    const next = deepClone(prev);
    setAtPath(next, path, value);
    return next;
  });

  const save = async () => {
    if (!accessToken || !draft) return;
    setSaving(true);
    try {
      const next = await adminApi.saveLandingDraft(accessToken, draft);
      setRemoteState(next);
      setDraft(deepClone(next.draft));
      setMessage('Borrador guardado.');
    } finally { setSaving(false); }
  };

  const publish = async () => {
    if (!accessToken) return;
    setPublishing(true);
    try {
      const next = await adminApi.publishLanding(accessToken);
      setRemoteState(next);
      setMessage('Cambios publicados.');
    } finally { setPublishing(false); }
  };

  const uploadAt = async (path: string, file?: File | null, type: 'image' | 'video' = 'image') => {
    if (!accessToken || !file) return;
    const media = await adminApi.uploadLandingMedia(accessToken, file);
    const current = path.split('.').reduce((acc: any, key) => acc?.[key], draft) ?? {};
    update(path, { ...current, url: media.url, type });
  };

  if (!draft) return <div>Cargando configuración de landing...</div>;

  return <div className="nx-admin-page nx-admin-landing">
    <header className="nx-admin-landing__header"><div><h1>Administración del sitio público</h1><p>Gestioná la landing de NexMed con borrador, publicación y vista previa.</p></div>
      <div className="nx-admin-landing__actions"><button className="nx-btn-secondary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar borrador'}</button><button className="nx-btn" onClick={publish} disabled={publishing}>{publishing ? 'Publicando...' : 'Publicar cambios'}</button><a className="nx-btn-secondary" href="/" target="_blank" rel="noreferrer">Vista previa</a></div>
    </header>
    {message ? <p>{message}</p> : null}
    {remoteState?.publishedAt ? <p>Última publicación: {new Date(remoteState.publishedAt).toLocaleString()}</p> : null}
    <div className="nx-admin-landing__layout"><aside>{sectionTabs.map(([id, label]) => <button key={id} className={active===id? 'is-active' : ''} onClick={()=>setActive(id)}>{label}</button>)}</aside>
    <section>
      {active === 'hero' && <div className="nx-card-grid">
        <Text label="Eyebrow" value={draft.hero?.eyebrow} onChange={(v)=>update('hero.eyebrow', v)} />
        <Text label="Título" value={draft.hero?.title} onChange={(v)=>update('hero.title', v)} />
        <Area label="Subtítulo" value={draft.hero?.subtitle} onChange={(v)=>update('hero.subtitle', v)} />
        <Area label="Texto complementario" value={draft.hero?.supportingText} onChange={(v)=>update('hero.supportingText', v)} />
        <Text label="Poster" value={draft.hero?.media?.posterUrl} onChange={(v)=>update('hero.media.posterUrl', v)} />
        <input type="file" accept="image/*,video/*" onChange={(e: ChangeEvent<HTMLInputElement>)=>uploadAt('hero.media', e.target.files?.[0], e.target.files?.[0]?.type.startsWith('video') ? 'video' : 'image')} />
      </div>}
      {active === 'features' && <div>{(draft.features ?? []).map((item:any, index:number)=><div className="nx-card" key={index}><Text label={`Título #${index+1}`} value={item.title} onChange={(v)=>update(`features.${index}.title`, v)} /><Area label="Descripción" value={item.description} onChange={(v)=>update(`features.${index}.description`, v)} /></div>)}</div>}
      {active === 'problemSolution' && <Area label="Texto" value={draft.problemSolution?.text} onChange={(v)=>update('problemSolution.text', v)} />}
      {active === 'howItWorks' && <Area label="Subtítulo" value={draft.howItWorks?.subtitle} onChange={(v)=>update('howItWorks.subtitle', v)} />}
      {active === 'benefits' && <div className="nx-card-grid"><Area label="Beneficios centro (uno por línea)" value={(draft.benefits?.centerItems ?? []).join('\n')} onChange={(v)=>update('benefits.centerItems', v.split('\n').filter(Boolean))} /><Area label="Beneficios pacientes (uno por línea)" value={(draft.benefits?.patientItems ?? []).join('\n')} onChange={(v)=>update('benefits.patientItems', v.split('\n').filter(Boolean))} /></div>}
      {active === 'modules' && <pre>{JSON.stringify(draft.modules ?? {}, null, 2)}</pre>}
      {active === 'testimonials' && <div>{(draft.testimonials ?? []).map((item:any, index:number)=><div className="nx-card" key={index}><Text label="Nombre" value={item.name} onChange={(v)=>update(`testimonials.${index}.name`, v)} /><Text label="Rol" value={item.role} onChange={(v)=>update(`testimonials.${index}.role`, v)} /><Area label="Texto" value={item.text} onChange={(v)=>update(`testimonials.${index}.text`, v)} /></div>)}</div>}
      {active === 'faq' && <div>{(draft.faq ?? []).map((item:any, index:number)=><div className="nx-card" key={index}><Text label="Pregunta" value={item.question} onChange={(v)=>update(`faq.${index}.question`, v)} /><Area label="Respuesta" value={item.answer} onChange={(v)=>update(`faq.${index}.answer`, v)} /></div>)}</div>}
      {active === 'finalCta' && <Text label="Título" value={draft.finalCta?.title} onChange={(v)=>update('finalCta.title', v)} />}
      {active === 'footer' && <Area label="Texto" value={draft.footer?.brandText} onChange={(v)=>update('footer.brandText', v)} />}
    </section></div>
  </div>;
};
