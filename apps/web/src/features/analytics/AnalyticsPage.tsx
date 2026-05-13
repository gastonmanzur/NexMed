import { useEffect, useMemo, useState } from 'react';
import type { AnalyticsSummaryDto } from '@starter/shared-types';
import { useAuth } from '../auth/AuthContext';
import { professionalsApi } from '../professionals/professionals-api';
import { specialtiesApi } from '../specialties/specialties-api';
import { analyticsApi } from './analytics-api';

const rangeOptions = [
  { id: 'today', label: 'Hoy' }, { id: 'last7', label: 'Últimos 7 días' }, { id: 'last30', label: 'Últimos 30 días' },
  { id: 'thisMonth', label: 'Este mes' }, { id: 'prevMonth', label: 'Mes anterior' }, { id: 'custom', label: 'Personalizado' }
] as const;

export const AnalyticsPage = () => {
  const { accessToken, activeOrganizationId } = useAuth();
  const [data, setData] = useState<AnalyticsSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState<(typeof rangeOptions)[number]['id']>('last30');
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [professionalId, setProfessionalId] = useState(''); const [specialtyId, setSpecialtyId] = useState('');
  const [professionals, setProfessionals] = useState<any[]>([]); const [specialties, setSpecialties] = useState<any[]>([]);

  const computedRange = useMemo(() => {
    const now = new Date(); let start = new Date(now); let end = new Date(now);
    if (range === 'today') { start.setHours(0,0,0,0); end.setHours(23,59,59,999); }
    if (range === 'last7') start = new Date(now.getTime() - 6*86400000);
    if (range === 'last30') start = new Date(now.getTime() - 29*86400000);
    if (range === 'thisMonth') start = new Date(now.getFullYear(), now.getMonth(), 1);
    if (range === 'prevMonth') { start = new Date(now.getFullYear(), now.getMonth()-1,1); end = new Date(now.getFullYear(), now.getMonth(),0,23,59,59,999); }
    if (range === 'custom' && from && to) return { from: new Date(from).toISOString(), to: new Date(`${to}T23:59:59.999Z`).toISOString() };
    return { from: start.toISOString(), to: end.toISOString() };
  }, [range, from, to]);

  useEffect(() => { if (!accessToken || !activeOrganizationId) return; professionalsApi.list(accessToken, activeOrganizationId).then(setProfessionals); specialtiesApi.list(accessToken, activeOrganizationId).then(setSpecialties); }, [accessToken, activeOrganizationId]);
  useEffect(() => {
    if (!accessToken || !activeOrganizationId) return;
    setLoading(true); setError('');
    analyticsApi.summary(accessToken, activeOrganizationId, { from: computedRange.from, to: computedRange.to, ...(professionalId?{professionalId}:{}) , ...(specialtyId?{specialtyId}:{}) })
      .then(setData).catch((e)=>setError(e.message)).finally(()=>setLoading(false));
  }, [accessToken, activeOrganizationId, computedRange, professionalId, specialtyId]);

  if (loading) return <p>Cargando métricas…</p>; if (error) return <p>{error}</p>; if (!data) return <p>Sin datos.</p>;
  const maxProf = Math.max(1, ...data.byProfessional.map((x)=>x.count));

  return <div style={{display:'grid', gap:16}}>
    <h1>Métricas de desempeño</h1>
    <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>{rangeOptions.map((o)=><button key={o.id} onClick={()=>setRange(o.id)}>{o.label}</button>)}</div>
    {range==='custom' && <div><input type='date' value={from} onChange={(e)=>setFrom(e.target.value)}/><input type='date' value={to} onChange={(e)=>setTo(e.target.value)}/></div>}
    <div style={{display:'flex', gap:8}}>
      <select value={professionalId} onChange={(e)=>setProfessionalId(e.target.value)}><option value=''>Todos los profesionales</option>{professionals.map((p:any)=><option key={p.id} value={p.id}>{p.displayName}</option>)}</select>
      <select value={specialtyId} onChange={(e)=>setSpecialtyId(e.target.value)}><option value=''>Todas las especialidades</option>{specialties.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
    </div>
    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10}}>
      {Object.entries({Total:data.kpis.totalAppointments,Confirmados:data.kpis.bookedAppointments,Cancelados:data.kpis.canceledAppointments,Reprogramados:data.kpis.rescheduledAppointments,Atendidos:data.kpis.uniqueAttendedPatients,Nuevos:data.kpis.newPatients,Recurrentes:data.kpis.recurringPatients,'Próximos turnos':data.kpis.upcomingAppointments}).map(([k,v])=><div key={k} style={{border:'1px solid #ddd', padding:12, borderRadius:8}}><div>{k}</div><strong>{v}</strong></div>)}
    </div>
    <div><h3>Turnos por profesional</h3>{data.byProfessional.length===0?<p>Sin datos.</p>:data.byProfessional.map((p)=><div key={p.professionalId}><span>{p.label} ({p.count})</span><div style={{background:'#eee',height:8}}><div style={{height:8,width:`${(p.count/maxProf)*100}%`,background:'#2563eb'}}/></div></div>)}</div>
    <div><h3>Evolución diaria</h3>{data.timelineDaily.map((d)=><div key={d.date}>{d.date}: {d.count}</div>)}</div>
    <div><h3>Métricas no disponibles aún</h3><ul>{data.coverage.notSupportedYet.map((m)=><li key={m}>{m}</li>)}</ul></div>
  </div>;
};
