import type { BiomechanicsSnapshot, BiomechanicsSession, Athlete } from './types';

function getStatusLabel(status: string): string {
  switch (status) {
    case 'optimal': return 'Optimo';
    case 'acceptable': return 'Aceptable';
    case 'warning': return 'Advertencia';
    case 'critical': return 'Critico';
    default: return status;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'optimal': return '#10b981';
    case 'acceptable': return '#06b6d4';
    case 'warning': return '#f59e0b';
    case 'critical': return '#ef4444';
    default: return '#94a3b8';
  }
}

function getStatusBg(status: string): string {
  switch (status) {
    case 'optimal': return '#dcfce7';
    case 'acceptable': return '#cffafe';
    case 'warning': return '#fef9c3';
    case 'critical': return '#fee2e2';
    default: return '#f1f5f9';
  }
}

export function exportSessionPDF(
  session: BiomechanicsSession,
  snapshots: BiomechanicsSnapshot[],
  athlete?: Athlete | null
): void {
  const date = new Date(session.created_at).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const disciplineLabel = session.discipline.replace(/_/g, ' ');

  const snapshotRows = snapshots.map((snap, idx) => {
    const anglesHtml = (snap.angles ?? []).map((a) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${a.name}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:600;">${a.value_deg}°</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center;color:#64748b;">${a.reference_min}° – ${a.reference_max}°</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">
          <span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${getStatusBg(a.status)};color:${getStatusColor(a.status)};">
            ${getStatusLabel(a.status)}
          </span>
        </td>
      </tr>
    `).join('');

    const notesHtml = snap.notes
      ? `<p style="margin:6px 0 0;font-size:12px;color:#64748b;font-style:italic;">${snap.notes}</p>`
      : '';

    const imageHtml = snap.image_data
      ? `<img src="${snap.image_data}" alt="Snapshot ${idx + 1}" style="max-width:340px;width:100%;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:12px;" />`
      : '';

    return `
      <div style="page-break-inside:avoid;margin-bottom:32px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:4px 12px;font-size:12px;font-weight:600;color:#514163;">
            #${idx + 1} — ${snap.phase_label || `Snapshot ${idx + 1}`}
          </div>
          <span style="font-size:11px;color:#94a3b8;">
            ${new Date(snap.created_at).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          ${imageHtml}
          <div style="flex:1;min-width:200px;">
            ${anglesHtml ? `
              <table style="width:100%;border-collapse:collapse;font-size:12px;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
                <thead>
                  <tr style="background:#f8fafc;">
                    <th style="padding:7px 10px;text-align:left;font-weight:600;color:#475569;border-bottom:2px solid #e2e8f0;">Angulo</th>
                    <th style="padding:7px 10px;text-align:center;font-weight:600;color:#475569;border-bottom:2px solid #e2e8f0;">Valor</th>
                    <th style="padding:7px 10px;text-align:center;font-weight:600;color:#475569;border-bottom:2px solid #e2e8f0;">Referencia</th>
                    <th style="padding:7px 10px;text-align:center;font-weight:600;color:#475569;border-bottom:2px solid #e2e8f0;">Estado</th>
                  </tr>
                </thead>
                <tbody>${anglesHtml}</tbody>
              </table>
            ` : '<p style="font-size:12px;color:#94a3b8;">Sin angulos registrados.</p>'}
            ${notesHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');

  const athleteSection = athlete ? `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#514163;">Atleta</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;font-size:12px;color:#64748b;">
        <div><span style="font-weight:600;color:#334155;">Nombre:</span> ${athlete.name}</div>
        ${athlete.email ? `<div><span style="font-weight:600;color:#334155;">Email:</span> ${athlete.email}</div>` : ''}
        ${athlete.height_cm ? `<div><span style="font-weight:600;color:#334155;">Altura:</span> ${athlete.height_cm} cm</div>` : ''}
        ${athlete.weight_kg ? `<div><span style="font-weight:600;color:#334155;">Peso:</span> ${athlete.weight_kg} kg</div>` : ''}
        ${athlete.inseam_cm ? `<div><span style="font-weight:600;color:#334155;">Entrepierna:</span> ${athlete.inseam_cm} cm</div>` : ''}
      </div>
    </div>
  ` : '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Informe — ${session.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; background: #fff; padding: 40px; font-size: 13px; }
    @media print {
      body { padding: 20px; }
      @page { margin: 1cm; }
    }
    h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
    .meta { font-size: 12px; color: #64748b; margin-bottom: 20px; display: flex; gap: 16px; flex-wrap: wrap; }
    .section-title { font-size: 14px; font-weight: 700; color: #334155; margin: 20px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }
    .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #f1f5f9; color: #514163; border: 1px solid #e2e8f0; }
    .no-print { display: block; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:20px;">
    <button onclick="window.print()" style="padding:10px 24px;background:#fdda36;color:#514163;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">
      Imprimir / Guardar PDF
    </button>
  </div>

  <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
    <div>
      <div style="font-size:11px;font-weight:600;color:#514163;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:4px;">Informe de Analisis Biomecanico</div>
      <h1>${session.title}</h1>
      <div class="meta">
        <span class="badge">${disciplineLabel}</span>
        <span style="color:#94a3b8;">•</span>
        <span>${date}</span>
        <span style="color:#94a3b8;">•</span>
        <span>${snapshots.length} snapshot${snapshots.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
    <div style="text-align:right;font-size:11px;color:#94a3b8;">
      <div style="font-weight:700;font-size:16px;color:#fdda36;letter-spacing:-0.02em;">ASCIENDE</div>
      <div>Biomechanics</div>
    </div>
  </div>

  ${session.notes ? `<p style="font-size:12px;color:#64748b;margin-bottom:16px;padding:10px 14px;background:#f8fafc;border-left:3px solid #fdda36;border-radius:0 6px 6px 0;">${session.notes}</p>` : ''}

  ${athleteSection}

  ${snapshots.length === 0
    ? '<p style="color:#94a3b8;font-size:13px;text-align:center;padding:40px 0;">Esta sesion no tiene snapshots guardados.</p>'
    : `<div class="section-title">Snapshots (${snapshots.length})</div>${snapshotRows}`
  }

  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between;">
    <span>Generado por Asciende Biomechanics</span>
    <span>${new Date().toLocaleString('es-AR')}</span>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Habilitá las ventanas emergentes para exportar el PDF.');
    return;
  }
  win.document.write(html);
  win.document.close();
}
