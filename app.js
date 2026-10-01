/* Tablero ETDH · Técnicos Laborales — UNIMINUTO Sede Tolima-Huila */
(async function () {
  'use strict';

  // ---------- Datos ----------
  let DATA;
  try {
    DATA = window.__ETDH_DATA__ || await fetch('data.json', { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  } catch (e) {
    document.getElementById('notice').innerHTML =
      '<div class="notice">No se pudo cargar <b>data.json</b>. Verifica que esté en la misma carpeta que index.html ' +
      '(al abrir el archivo localmente usa preview_standalone.html).</div>';
    return;
  }

  const C = { ink: '#16324F', ink3: '#2A5580', accent: '#E2962B', accentD: '#B8730F', teal: '#2F7A6D', muted: '#5D6B7E', line: '#E1E6ED' };
  const TIPO_COLOR = { 'Técnico laboral': C.ink, 'Idiomas': C.accent };

  const R = DATA.registros;
  const PM = {}; DATA.programas.forEach(p => PM[p.nombre] = p);
  const YEARS = [...new Set(R.map(r => r.anio))].sort((a, b) => a - b);
  const TIPOS = [...new Set(DATA.programas.map(p => p.tipo))].sort();
  const sumBy = (rows, key, val) => rows.reduce((m, r) => { m[r[key]] = (m[r[key]] || 0) + r[val]; return m; }, {});
  const totIngProg = sumBy(R, 'programa', 'ingresos');
  const totEstProg = sumBy(R, 'programa', 'estudiantes');
  const PROGS = Object.keys(totIngProg).sort((a, b) => totIngProg[b] - totIngProg[a]);

  // ---------- Formatos ----------
  const nf0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const money = v => '$' + nf0.format(Math.round(v));
  const moneyM = v => '$' + nf1.format(v / 1e6) + ' M';
  const moneyK = v => '$' + nf0.format(Math.round(v / 1000)) + ' mil';
  const pctS = v => (v > 0 ? '+' : '') + nf1.format(v) + '%';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rangeTxt = ys => !ys.length ? '—' : ys.length === 1 ? String(ys[0]) :
    (ys[ys.length - 1] - ys[0] === ys.length - 1 ? `${ys[0]}–${ys[ys.length - 1]}` : ys.join(', '));

  // ---------- Estado ----------
  const sel = { anio: new Set(YEARS), tipo: new Set(TIPOS), programa: new Set(PROGS) };
  let heatMetric = 'est';
  let sortKey = 'ingresos', sortDir = -1;

  // ---------- Filtros (sidebar) ----------
  const F = document.getElementById('filters');
  F.innerHTML = `
    <div class="fgroup" data-g="anio">
      <button type="button" class="fg-head" aria-expanded="true">Año <span class="cnt"></span><span class="chev">▼</span></button>
      <div class="fg-body">
        <div class="fg-actions"><button type="button" data-all>Todos</button><button type="button" data-none>Ninguno</button><button type="button" data-last>Último año</button></div>
        <div class="pills">${YEARS.map(y => `<button type="button" class="pill on" data-v="${y}">${y}</button>`).join('')}</div>
      </div>
    </div>
    <div class="fgroup" data-g="tipo">
      <button type="button" class="fg-head" aria-expanded="true">Tipo de programa <span class="cnt"></span><span class="chev">▼</span></button>
      <div class="fg-body">
        ${TIPOS.map(t => `<label class="chk"><input type="checkbox" checked data-v="${esc(t)}"><span class="dot" style="background:${TIPO_COLOR[t] === C.ink ? '#7FA3C9' : C.accent}"></span>${esc(t)}<span class="n">${DATA.programas.filter(p => p.tipo === t).length}</span></label>`).join('')}
      </div>
    </div>
    <div class="fgroup" data-g="programa">
      <button type="button" class="fg-head" aria-expanded="true">Programa <span class="cnt"></span><span class="chev">▼</span></button>
      <div class="fg-body">
        <input type="search" class="search" placeholder="Buscar programa…" aria-label="Buscar programa">
        <div class="fg-actions"><button type="button" data-all>Todos</button><button type="button" data-none>Ninguno</button></div>
        <div class="prog-list">${PROGS.map(p => `<label class="chk" data-name="${esc(p.toLowerCase())}"><input type="checkbox" checked data-v="${esc(p)}">${esc(p)}<span class="n">${nf0.format(totEstProg[p])}</span></label>`).join('')}</div>
      </div>
    </div>`;

  F.querySelectorAll('.fg-head').forEach(h => h.addEventListener('click', () => {
    const g = h.parentElement; g.classList.toggle('closed');
    h.setAttribute('aria-expanded', !g.classList.contains('closed'));
  }));

  const gAnio = F.querySelector('[data-g="anio"]');
  gAnio.querySelectorAll('.pill').forEach(b => b.addEventListener('click', () => {
    const y = +b.dataset.v; sel.anio.has(y) ? sel.anio.delete(y) : sel.anio.add(y); render();
  }));
  gAnio.querySelector('[data-all]').onclick = () => { YEARS.forEach(y => sel.anio.add(y)); render(); };
  gAnio.querySelector('[data-none]').onclick = () => { sel.anio.clear(); render(); };
  gAnio.querySelector('[data-last]').onclick = () => { sel.anio.clear(); sel.anio.add(YEARS[YEARS.length - 1]); render(); };

  F.querySelectorAll('[data-g="tipo"] input').forEach(i => i.addEventListener('change', () => {
    i.checked ? sel.tipo.add(i.dataset.v) : sel.tipo.delete(i.dataset.v); render();
  }));

  const gProg = F.querySelector('[data-g="programa"]');
  gProg.querySelectorAll('input[type=checkbox]').forEach(i => i.addEventListener('change', () => {
    i.checked ? sel.programa.add(i.dataset.v) : sel.programa.delete(i.dataset.v); render();
  }));
  gProg.querySelector('[data-all]').onclick = () => { PROGS.forEach(p => sel.programa.add(p)); render(); };
  gProg.querySelector('[data-none]').onclick = () => { sel.programa.clear(); render(); };
  gProg.querySelector('.search').addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    gProg.querySelectorAll('.prog-list .chk').forEach(l => l.style.display = l.dataset.name.includes(q) ? '' : 'none');
  });

  document.getElementById('resetAll').onclick = () => {
    YEARS.forEach(y => sel.anio.add(y)); TIPOS.forEach(t => sel.tipo.add(t)); PROGS.forEach(p => sel.programa.add(p));
    gProg.querySelector('.search').value = ''; gProg.querySelectorAll('.prog-list .chk').forEach(l => l.style.display = '');
    render();
  };

  function syncFilterUI() {
    gAnio.querySelectorAll('.pill').forEach(b => b.classList.toggle('on', sel.anio.has(+b.dataset.v)));
    gAnio.querySelector('.cnt').textContent = `${sel.anio.size}/${YEARS.length}`;
    F.querySelectorAll('[data-g="tipo"] input').forEach(i => i.checked = sel.tipo.has(i.dataset.v));
    F.querySelector('[data-g="tipo"] .cnt').textContent = `${sel.tipo.size}/${TIPOS.length}`;
    gProg.querySelectorAll('.prog-list .chk').forEach(l => {
      const i = l.querySelector('input'); i.checked = sel.programa.has(i.dataset.v);
      l.classList.toggle('dim', !sel.tipo.has(PM[i.dataset.v].tipo));
    });
    gProg.querySelector('.cnt').textContent = `${sel.programa.size}/${PROGS.length}`;
  }

  // Menú móvil
  const toggleSide = open => document.body.classList.toggle('side-open', open);
  document.getElementById('menuBtn').onclick = () => toggleSide(true);
  document.getElementById('backdrop').onclick = () => toggleSide(false);

  // ---------- Chart.js ----------
  Chart.defaults.font.family = '"IBM Plex Sans", system-ui, sans-serif';
  Chart.defaults.font.size = 11.5;
  Chart.defaults.color = C.muted;
  Chart.defaults.borderColor = C.line;
  Chart.defaults.plugins.tooltip.backgroundColor = C.ink;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.titleFont = { weight: '600' };

  // Etiquetas de datos (plugin propio, sin CDN externo)
  Chart.register({
    id: 'valueLabels',
    afterDatasetsDraw(chart, _a, opts) {
      if (!opts || !opts.display) return;
      const { ctx } = chart; const horizontal = chart.options.indexAxis === 'y';
      chart.data.datasets.forEach((ds, i) => {
        const meta = chart.getDatasetMeta(i);
        if (meta.hidden || ds.noLabels) return;
        meta.data.forEach((el, j) => {
          const v = ds.data[j]; if (v == null || v === 0) return;
          const txt = ds.fmt ? ds.fmt(v) : String(v);
          ctx.save(); ctx.font = '600 11px "IBM Plex Sans", sans-serif'; ctx.fillStyle = ds.labelColor || C.ink;
          if (horizontal) { ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, el.x + 6, el.y); }
          else if (meta.type === 'line') { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = '#fff'; ctx.strokeText(txt, el.x, el.y - 9); ctx.fillText(txt, el.x, el.y - 9); }
          else if (ds.labelInside && el.width && ctx.measureText(txt).width > el.width - 4) { /* barra angosta: se omite la etiqueta */ }
          else if (ds.labelInside && (el.base - el.y) > 24) { ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(txt, el.x, el.base - 7); }
          else { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(txt, el.x, el.y - 4); }
          ctx.restore();
        });
      });
    }
  });

  const legendCfg = { position: 'top', align: 'end', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'rectRounded', color: C.text } };

  const chEvol = new Chart(document.getElementById('chEvol'), {
    data: { labels: [], datasets: [
      { type: 'bar', label: 'Ingresos', data: [], backgroundColor: C.ink, borderRadius: 6, maxBarThickness: 56, yAxisID: 'y', order: 2, fmt: moneyM, labelInside: true },
      { type: 'line', label: 'Estudiantes', data: [], borderColor: C.accent, backgroundColor: C.accent, borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 6, tension: .3, yAxisID: 'y1', order: 1, fmt: v => nf0.format(v), labelColor: C.accentD }
    ] },
    options: {
      maintainAspectRatio: false, layout: { padding: { top: 6 } }, interaction: { mode: 'index', intersect: false },
      plugins: { valueLabels: { display: true }, legend: legendCfg,
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${c.datasetIndex === 0 ? money(c.raw) : nf0.format(c.raw)}` } } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grace: '8%', ticks: { callback: v => '$' + nf0.format(v / 1e6) + ' M' } },
        y1: { position: 'right', beginAtZero: true, grace: '22%', grid: { drawOnChartArea: false }, ticks: { callback: v => nf0.format(v) } }
      }
    }
  });

  const chProg = new Chart(document.getElementById('chProg'), {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Ingresos', data: [], backgroundColor: [], borderRadius: 4, barThickness: 16, fmt: moneyM }] },
    options: {
      indexAxis: 'y', maintainAspectRatio: false,
      plugins: { valueLabels: { display: true }, legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${money(c.raw)} · ${nf0.format(c.dataset.est[c.dataIndex])} estudiantes` } } },
      scales: {
        x: { beginAtZero: true, grace: '22%', ticks: { callback: v => '$' + nf0.format(v / 1e6) + ' M' } },
        y: { grid: { display: false }, ticks: { color: C.text, autoSkip: false } }
      }
    }
  });

  const chTicket = new Chart(document.getElementById('chTicket'), {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Ingreso por estudiante', data: [], borderColor: C.teal, backgroundColor: 'rgba(47,122,109,.12)', fill: true, borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: C.teal, tension: .3, fmt: moneyK, labelColor: C.teal }] },
    options: {
      maintainAspectRatio: false, layout: { padding: { left: 18, right: 26, top: 6 } },
      plugins: { valueLabels: { display: true }, legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${money(c.raw)} por estudiante` } } },
      scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grace: '15%', ticks: { callback: v => moneyK(v) } } }
    }
  });

  // ---------- Mapa de calor ----------
  document.querySelectorAll('#heatSeg button').forEach(b => b.addEventListener('click', () => {
    heatMetric = b.dataset.m;
    document.querySelectorAll('#heatSeg button').forEach(x => x.classList.toggle('on', x === b));
    render();
  }));

  function renderHeat(rows, YS) {
    const cell = {}; const progs = new Set();
    rows.forEach(r => { progs.add(r.programa); const k = r.programa + '|' + r.anio; cell[k] = cell[k] || { i: 0, e: 0 }; cell[k].i += r.ingresos; cell[k].e += r.estudiantes; });
    const val = c => !c ? null : heatMetric === 'est' ? c.e : heatMetric === 'ing' ? c.i : (c.e ? c.i / c.e : null);
    const fmt = v => heatMetric === 'est' ? nf0.format(v) : heatMetric === 'ing' ? moneyM(v) : moneyK(v);
    const tot = p => { let i = 0, e = 0; YS.forEach(y => { const c = cell[p + '|' + y]; if (c) { i += c.i; e += c.e; } }); return val({ i, e }); };
    const list = [...progs].sort((a, b) => (tot(b) || 0) - (tot(a) || 0));
    let max = 0; list.forEach(p => YS.forEach(y => { const v = val(cell[p + '|' + y]); if (v > max) max = v; }));
    const tbl = document.getElementById('heat');
    if (!list.length) { tbl.innerHTML = '<tbody><tr><td class="p" style="color:var(--muted)">Sin datos para los filtros actuales.</td></tr></tbody>'; return; }
    tbl.innerHTML = `<thead><tr><th class="p">Programa</th>${YS.map(y => `<th>${y}</th>`).join('')}<th class="t">${heatMetric === 'tick' ? 'Promedio' : 'Total'}</th></tr></thead><tbody>` +
      list.map(p => {
        const tipo = PM[p].tipo;
        const tds = YS.map(y => {
          const v = val(cell[p + '|' + y]);
          if (v == null) return '<td class="c empty">·</td>';
          const a = .1 + .9 * Math.pow(max ? v / max : 0, .65);
          return `<td class="c" style="background:rgba(47,122,109,${a.toFixed(3)});color:${a > .55 ? '#fff' : 'var(--text)'}" title="${esc(p)} · ${y}: ${fmt(v)}">${fmt(v)}</td>`;
        }).join('');
        return `<tr><td class="p">${esc(p)}<span class="tag ${tipo === 'Idiomas' ? 'id' : 'tl'}">${tipo === 'Idiomas' ? 'Idiomas' : 'TL'}</span></td>${tds}<td class="t">${fmt(tot(p) || 0)}</td></tr>`;
      }).join('') + '</tbody>';
  }

  // ---------- Tabla detalle ----------
  let lastDetail = [];
  function renderDetail(rows) {
    const m = {};
    rows.forEach(r => {
      const o = m[r.programa] = m[r.programa] || { programa: r.programa, tipo: PM[r.programa].tipo, ingresos: 0, estudiantes: 0, years: new Set() };
      o.ingresos += r.ingresos; o.estudiantes += r.estudiantes; if (r.estudiantes > 0) o.years.add(r.anio);
    });
    const totI = rows.reduce((a, r) => a + r.ingresos, 0), totE = rows.reduce((a, r) => a + r.estudiantes, 0);
    const list = Object.values(m).map(o => ({ ...o, ticket: o.estudiantes ? o.ingresos / o.estudiantes : 0, share: totI ? o.ingresos / totI * 100 : 0, nyears: o.years.size, yearsArr: [...o.years].sort() }));
    list.sort((a, b) => { const av = a[sortKey], bv = b[sortKey]; return sortDir * (typeof av === 'string' ? av.localeCompare(bv, 'es') : av - bv); });
    lastDetail = list;
    const maxShare = Math.max(1, ...list.map(o => o.share));
    const cols = [['programa', 'Programa', 'l'], ['tipo', 'Tipo', 'l'], ['nyears', 'Años con estudiantes', 'l'], ['estudiantes', 'Estudiantes'], ['ingresos', 'Ingresos'], ['ticket', 'Ingreso por estudiante'], ['share', 'Participación']];
    const tbl = document.getElementById('detail');
    tbl.innerHTML = `<thead><tr>${cols.map(([k, t, c]) => `<th data-k="${k}" class="${c || ''} ${sortKey === k ? 'sorted' : ''}">${t}<span class="ar">${sortKey === k ? (sortDir < 0 ? '▼' : '▲') : '↕'}</span></th>`).join('')}</tr></thead>
      <tbody>${list.map(o => `<tr>
        <td class="l">${esc(o.programa)}<span class="sap">SAP: ${esc(PM[o.programa].nombres_sap.join(' / '))}</span></td>
        <td class="l nw">${esc(o.tipo)}</td>
        <td class="l"><span class="years">${rangeTxt(o.yearsArr)} (${o.nyears})</span></td>
        <td>${nf0.format(o.estudiantes)}</td><td>${money(o.ingresos)}</td><td>${money(o.ticket)}</td>
        <td><div class="share"><span>${nf1.format(o.share)}%</span><span class="bar"><i style="width:${(o.share / maxShare * 100).toFixed(1)}%"></i></span></div></td>
      </tr>`).join('')}</tbody>
      <tfoot><tr><td class="l">Total</td><td></td><td></td><td>${nf0.format(totE)}</td><td>${money(totI)}</td><td>${totE ? money(totI / totE) : '—'}</td><td>${list.length ? '100,0%' : ''}</td></tr></tfoot>`;
    tbl.querySelectorAll('th').forEach(th => th.onclick = () => {
      const k = th.dataset.k; if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = (k === 'programa' || k === 'tipo') ? 1 : -1; } render();
    });
  }

  document.getElementById('btnCsv').onclick = () => {
    const head = ['Programa', 'Tipo', 'Años con estudiantes', 'Estudiantes', 'Ingresos', 'Ingreso por estudiante', 'Participación %'];
    const lines = [head.join(';')].concat(lastDetail.map(o => [o.programa, o.tipo, o.yearsArr.join(' '), o.estudiantes, Math.round(o.ingresos), Math.round(o.ticket), o.share.toFixed(2).replace('.', ',')].join(';')));
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ETDH_tecnicos_laborales_detalle.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  // ---------- Lectura rápida ----------
  function renderInsights(rows, YS, ingY, estY) {
    const ul = document.getElementById('insights');
    if (!rows.length) { ul.innerHTML = '<li>Activa al menos un año, un tipo y un programa para ver el análisis.</li>'; return; }
    const out = [];
    const ysData = YS.filter(y => estY[y] > 0);
    const peak = ysData.reduce((a, y) => estY[y] > estY[a] ? y : a, ysData[0]);
    if (ysData.length > 1) out.push(`El año de mayor matrícula fue <b>${peak}</b>, con <b>${nf0.format(estY[peak])}</b> estudiantes y <b>${moneyM(ingY[peak])}</b> en ingresos.`);
    if (ysData.length > 1) {
      const f = ysData[0], l = ysData[ysData.length - 1], d = (estY[l] - estY[f]) / estY[f] * 100;
      out.push(`Entre ${f} y ${l} los estudiantes ${d < 0 ? 'cayeron' : 'crecieron'} <b>${pctS(d)}</b> (de ${nf0.format(estY[f])} a ${nf0.format(estY[l])}).`);
      if (peak !== l) { const dp = (estY[l] - estY[peak]) / estY[peak] * 100; out.push(`Frente al pico de ${peak}, ${l} está <b>${pctS(dp)}</b> en estudiantes.`); }
    }
    const byP = sumBy(rows, 'programa', 'ingresos'); const totI = rows.reduce((a, r) => a + r.ingresos, 0);
    const top = Object.keys(byP).sort((a, b) => byP[b] - byP[a])[0];
    if (top && Object.keys(byP).length > 1) out.push(`<b>${esc(top)}</b> concentra el <b>${nf1.format(byP[top] / totI * 100)}%</b> de los ingresos del periodo.`);
    if (ysData.length) {
      const l = ysData[ysData.length - 1];
      const inL = [...new Set(rows.filter(r => r.anio === l && r.estudiantes > 0).map(r => r.programa))];
      const before = new Set(rows.filter(r => r.anio < l && r.estudiantes > 0).map(r => r.programa));
      const nuevos = inL.filter(p => !before.has(p));
      out.push(`En ${l} hubo estudiantes en <b>${inL.length}</b> programa${inL.length === 1 ? '' : 's'}${inL.length <= 4 ? ': ' + inL.map(esc).join(', ') : ''}.`);
      if (nuevos.length && ysData.length > 1) out.push(`${nuevos.map(p => `<b>${esc(p)}</b>`).join(', ')} ${nuevos.length === 1 ? 'aparece' : 'aparecen'} por primera vez en ${l}.`);
      if (ysData.length > 1) { const f = ysData[0]; out.push(`El ingreso por estudiante pasó de <b>${moneyK(ingY[f] / estY[f])}</b> en ${f} a <b>${moneyK(ingY[l] / estY[l])}</b> en ${l}.`); }
    }
    ul.innerHTML = out.map(t => `<li>${t}</li>`).join('');
  }

  // ---------- Render ----------
  function render() {
    syncFilterUI();
    const rows = R.filter(r => sel.anio.has(r.anio) && sel.tipo.has(PM[r.programa].tipo) && sel.programa.has(r.programa));
    const YS = YEARS.filter(y => sel.anio.has(y));
    const ingY = {}, estY = {}; YS.forEach(y => { ingY[y] = 0; estY[y] = 0; });
    rows.forEach(r => { ingY[r.anio] += r.ingresos; estY[r.anio] += r.estudiantes; });
    const ing = rows.reduce((a, r) => a + r.ingresos, 0), est = rows.reduce((a, r) => a + r.estudiantes, 0);
    const nProg = new Set(rows.filter(r => r.estudiantes > 0).map(r => r.programa)).size;

    document.getElementById('notice').innerHTML = rows.length ? '' :
      '<div class="notice">Ningún registro coincide con los filtros. Activa al menos un año, un tipo y un programa, o usa <b>Restablecer</b>.</div>';

    document.getElementById('scope').innerHTML =
      `<span>${rangeTxt(YS)}</span><span>${nProg} programa${nProg === 1 ? '' : 's'}</span><span>${sel.tipo.size === TIPOS.length ? 'Todos los tipos' : [...sel.tipo].join(', ') || 'Sin tipo'}</span>`;

    // KPIs
    const ys = YS.filter(y => estY[y] > 0), l = ys[ys.length - 1], p = ys[ys.length - 2];
    const delta = (obj) => {
      if (!p || !obj[p]) return '';
      const d = (obj[l] - obj[p]) / obj[p] * 100;
      return `<b class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${pctS(d)}</b> ${l} vs ${p}`;
    };
    const tickets = ys.map(y => ingY[y] / estY[y]);
    const progL = l ? new Set(rows.filter(r => r.anio === l && r.estudiantes > 0).map(r => r.programa)).size : 0;
    document.getElementById('kpis').innerHTML = `
      <div class="kpi"><div class="kpi-lbl">Ingresos acumulados</div><div class="kpi-val">${moneyM(ing)}</div><div class="kpi-sub">${delta(ingY) || money(ing)}</div></div>
      <div class="kpi k2"><div class="kpi-lbl">Estudiantes</div><div class="kpi-val">${nf0.format(est)}</div><div class="kpi-sub">${delta(estY) || 'Suma de los años seleccionados'}</div></div>
      <div class="kpi k3"><div class="kpi-lbl">Ingreso por estudiante</div><div class="kpi-val">${est ? moneyK(ing / est) : '—'}</div><div class="kpi-sub">${tickets.length > 1 ? `Rango anual: ${moneyK(Math.min(...tickets))} a ${moneyK(Math.max(...tickets))}` : 'Promedio del periodo'}</div></div>
      <div class="kpi k4"><div class="kpi-lbl">Programas con estudiantes</div><div class="kpi-val">${nProg} <small>de ${PROGS.length}</small></div><div class="kpi-sub">${l ? `${progL} activo${progL === 1 ? '' : 's'} en ${l}` : '—'}</div></div>`;

    // Evolución
    chEvol.data.labels = YS;
    chEvol.data.datasets[0].data = YS.map(y => ingY[y]);
    chEvol.data.datasets[1].data = YS.map(y => estY[y]);
    chEvol.update();

    // Programas
    const byP = sumBy(rows, 'programa', 'ingresos'), byPE = sumBy(rows, 'programa', 'estudiantes');
    const plist = Object.keys(byP).filter(k => byP[k] > 0).sort((a, b) => byP[b] - byP[a]);
    document.getElementById('boxProg').style.height = Math.max(200, plist.length * 30 + 40) + 'px';
    chProg.data.labels = plist;
    chProg.data.datasets[0].data = plist.map(k => byP[k]);
    chProg.data.datasets[0].est = plist.map(k => byPE[k]);
    chProg.data.datasets[0].backgroundColor = plist.map(k => TIPO_COLOR[PM[k].tipo] || C.ink);
    chProg.resize(); chProg.update();

    // Ticket
    chTicket.data.labels = YS;
    chTicket.data.datasets[0].data = YS.map(y => estY[y] ? ingY[y] / estY[y] : null);
    chTicket.update();

    renderHeat(rows, YS);
    renderDetail(rows);
    renderInsights(rows, YS, ingY, estY);
  }

  document.getElementById('foot').innerHTML =
    `Fuente: ${esc(DATA.meta.fuente)} · Datos agregados por programa y año (${YEARS[0]}–${YEARS[YEARS.length - 1]}), sin información personal. ` +
    `Ingresos en pesos colombianos (M = millones). Actualizado: ${esc(DATA.meta.generado)}. · ${esc(DATA.meta.sede)}`;

  render();
})();
