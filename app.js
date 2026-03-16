// ─── Noms des bureaux de vote (source : linternaute.com) ────────────────────
const NOMS_BUREAUX = {
  '0001': 'Hôtel de Ville — Salle des Fêtes',
  '0002': 'École Maternelle Mainguy',
  '0003': 'Gymnase Aiache — Salle de Danse',
  '0004': 'École Maternelle Jean Zay',
  '0005': 'École Maternelle Noue Caillet',
  '0006': 'École Maternelle Terre-Saint-Blaise',
  '0007': 'École Maternelle Pasteur',
  '0008': 'École Maternelle Henri Sellier',
  '0009': 'École Maternelle Camille Claudel',
  '0010': 'École Élémentaire Jules Ferry',
  '0011': 'Salle Blanqui — Espace Mandela',
  '0012': 'École Maternelle Roger Salengro',
  '0013': 'École Maternelle Pierre Curie',
  '0014': 'École Maternelle Léo Lagrange',
  '0015': 'Salle Maurice Petit Jean',
  '0016': 'École Maternelle Assia Djebar',
  '0017': 'Salle Polyvalente Pierre Curie',
  '0018': 'Hôtel de Ville — Salle des Fêtes',
  '0019': 'École Élémentaire Mainguy-Guéhénno',
  '0020': 'Gymnase Aiache',
  '0021': 'École Élémentaire André Boulloche',
  '0022': 'École Élémentaire Pasteur',
  '0023': 'Centre de Loisirs — Salle Coluche',
  '0024': 'École Élémentaire Olympe de Gouges',
  '0025': 'École Élémentaire Noue Caillet',
  '0026': 'Gymnase Léo Lagrange',
  '0027': 'École Élémentaire Léo Lagrange',
  '0028': 'Centre de Loisirs Guillaume Apollinaire',
  '0029': 'École Élémentaire Roger Salengro',
  '0030': 'École Élémentaire Pierre Curie',
  '0031': 'Maison Marianne',
  '0032': 'Centre de Loisirs — Salle Coluche',
}

// ─── Palette de couleurs pour les bureaux de vote ───────────────────────────
const PALETTE = [
  '#4f7ef7','#e05c5c','#5cb85c','#f0ad4e','#9b59b6',
  '#1abc9c','#e67e22','#3498db','#e74c3c','#2ecc71',
  '#f39c12','#8e44ad','#16a085','#d35400','#2980b9',
  '#c0392b','#27ae60','#f1c40f','#7f8c8d','#6c5ce7',
  '#fd79a8','#00b894','#e17055','#74b9ff','#a29bfe',
  '#55efc4','#fab1a0','#81ecec','#636e72','#b2bec3',
  '#dfe6e9','#2d3436',
]

// Couleurs fixes par liste
const LIST_COLORS = [
  '#4f7ef7','#e05c5c','#5cb85c','#f0ad4e','#1abc9c','#e67e22',
]
const listColorMap = {
  'ÊTRE BONDY':                  '#9b59b6',
  'Bondy, ce qui nous rassemble': '#5cb85c',
}
let listColorIndex = 0
const ABSTENTION_COLOR = '#e17055'

function getListColor(libelle) {
  if (!listColorMap[libelle]) {
    listColorMap[libelle] = LIST_COLORS[listColorIndex % LIST_COLORS.length]
    listColorIndex++
  }
  return listColorMap[libelle]
}

function getBothScores(code, libelle) {
  const bureau = resultats[code]
  if (!bureau) return { voix: 0, pct: 0 }
  const cand = bureau.candidats.find(c => c.libelle === libelle)
  return { voix: cand?.voix ?? 0, pct: cand?.pctExprimes ?? 0 }
}

function getScoreAnalyse(code) {
  if (analyseMode === 'simple') return getScore(code, listeSelect?.value)
  const libA = listeSelect?.value, libB = listeSelectB?.value
  if (!libA || !libB) return null
  return (getScore(code, libA) ?? 0) - (getScore(code, libB) ?? 0)
}

// ─── Init carte Leaflet ──────────────────────────────────────────────────────
const map = L.map('map', {
  center: [48.9025, 2.4825],
  zoom: 14,
  zoomControl: true,
})

L.tileLayer(
  'https://data.geopf.fr/wmts?' +
  'SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
  '&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2' +
  '&STYLE=normal&FORMAT=image/png' +
  '&TILEMATRIXSET=PM' +
  '&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
  {
    attribution: '© <a href="https://www.ign.fr">IGN</a> — Géoplateforme · Résultats : Ministère de l\'Intérieur via data.gouv.fr',
    minZoom: 10,
    maxZoom: 19,
  }
).addTo(map)

// ─── État global ─────────────────────────────────────────────────────────────
let allFeatures  = []
let resultats    = {}   // codeBureauVote → données résultats
let layers       = {}   // codeBureauVote → { layer, color }
let activeCode   = null
let currentTab   = 'bureaux'
let activeMetric     = 'voix'  // 'pct' | 'voix'
let abstentionMetric  = 'voix'  // 'pct' | 'voix'
let repartitionMetric   = 'voix'      // 'pct' | 'voix'
let repartitionSelected = new Set()   // Set de libelles + '__abstentions__'

// ─── Éléments DOM ────────────────────────────────────────────────────────────
const bureauList        = document.getElementById('bureau-list')
const bureauCount       = document.getElementById('bureau-count')
const searchInput       = document.getElementById('search')
const infoPanel         = document.getElementById('info-panel')
const infoNumero        = document.getElementById('info-numero')
const infoBody          = document.getElementById('info-body')
const infoClose         = document.getElementById('info-close')
const listeSelect       = document.getElementById('liste-select')
const listeSelectB      = document.getElementById('liste-select-b')
const listeBWrap        = document.getElementById('liste-b-wrap')
const legendWrap        = document.getElementById('legend-wrap')
const bureauListAnalyse = document.getElementById('bureau-list-analyse')
let   analyseMode       = 'simple'  // 'simple' | 'ecart'

// ─── Chargement des données ──────────────────────────────────────────────────
Promise.all([
  fetch('data/bondy-bureaux-vote.geojson').then(r => r.json()),
  fetch('data/bondy-resultats-t1.json').then(r => r.json()),
])
.then(([geojson, resultatsData]) => {

  resultatsData.bureaux.forEach(b => {
    b.candidats.forEach(c => getListColor(c.libelle))
    resultats[b.codeBureauVote] = b
  })

  allFeatures = geojson.features.sort((a, b) =>
    a.properties.codeBureauVote.localeCompare(b.properties.codeBureauVote)
  )

  bureauCount.textContent = allFeatures.length

  allFeatures.forEach((feature, i) => {
    const code  = feature.properties.codeBureauVote
    const color = PALETTE[i % PALETTE.length]

    const layer = L.geoJSON(feature, {
      style: { color: '#0f1117', weight: 1.5, fillColor: color, fillOpacity: 0.45 },
    })

    layer.on('mouseover', e => {
      if (currentTab === 'bureaux') {
        if (code !== activeCode) e.target.setStyle({ fillOpacity: 0.7 })
        const r = resultats[code]
        const taux = r ? `${r.tauxParticipation}% participation` : ''
        e.target.bindTooltip(
          `<div class="bureau-tooltip"><strong>Bureau n° ${parseInt(code)}</strong>${taux ? '<br>' + taux : ''}</div>`,
          { sticky: true, className: '' }
        ).openTooltip()
      } else if (currentTab === 'abstention') {
        const r = resultats[code]
        const abstentions = r?.abstentions ?? 0
        const pct = r && r.inscrits > 0 ? (r.abstentions / r.inscrits * 100).toFixed(1) : 'N/D'
        e.target.setStyle({ fillOpacity: Math.min((e.target.options.fillOpacity || 0.5) + 0.15, 0.95) })
        e.target.bindTooltip(
          `<div class="bureau-tooltip"><strong>Bureau n° ${parseInt(code)}</strong><br>${abstentions} abstentions · ${pct}%</div>`,
          { sticky: true, className: '' }
        ).openTooltip()
      } else if (currentTab === 'repartition') {
        const val = getRepartitionVal(code)
        const label = repartitionMetric === 'voix'
          ? `${val} voix`
          : `${val.toFixed(1)}% des inscrits`
        const n   = repartitionSelected.size
        const nom = n === 0 ? '–' : n === 1
          ? ([...repartitionSelected][0] === '__abstentions__' ? 'Abstentions' : [...repartitionSelected][0])
          : `${n} listes`
        e.target.setStyle({ fillOpacity: Math.min((e.target.options.fillOpacity || 0.5) + 0.15, 0.95) })
        e.target.bindTooltip(
          `<div class="bureau-tooltip"><strong>Bureau n° ${parseInt(code)}</strong><br>${nom}<br>${label}</div>`,
          { sticky: true, className: '' }
        ).openTooltip()
      } else {
        const score = getScoreAnalyse(code)
        const label = activeMetric === 'pct' ? `${score !== null ? score.toFixed(1) + '%' : 'N/D'}` : `${score ?? 'N/D'} voix`
        e.target.setStyle({ fillOpacity: Math.min((e.target.options.fillOpacity || 0.5) + 0.15, 0.95) })
        e.target.bindTooltip(
          `<div class="bureau-tooltip"><strong>Bureau n° ${parseInt(code)}</strong><br>${listeSelect.value}<br>${label}</div>`,
          { sticky: true, className: '' }
        ).openTooltip()
      }
    })

    layer.on('mouseout', e => {
      if (currentTab === 'bureaux' && code !== activeCode) {
        e.target.setStyle({ fillOpacity: 0.45 })
      } else if (currentTab === 'analyse') {
        applyAnalyseStyle(code)
      } else if (currentTab === 'abstention') {
        applyAbstentionStyle(code)
      } else if (currentTab === 'repartition') {
        applyRepartitionStyle(code)
      }
      e.target.closeTooltip()
    })

    layer.on('click', () => {
      if (currentTab === 'bureaux') selectBureau(code)
    })

    layer.addTo(map)
    layers[code] = { layer, color, index: i }
  })

  renderList(allFeatures)
  initAnalyse()
  initAbstentionMetric()
  initRepartition()
})
.catch(err => console.error('Erreur chargement données :', err))

// ─── Onglets ─────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    btn.classList.add('active')
    currentTab = btn.dataset.tab

    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'))
    document.getElementById(`tab-${currentTab}`).classList.remove('hidden')

    if (currentTab !== 'bureaux' && activeCode) {
      document.querySelector(`.bureau-item[data-code="${activeCode}"]`)?.classList.remove('active')
      activeCode = null
      hideInfoPanel()
    }
    if (currentTab === 'analyse') {
      applyAnalyseAll()
    } else if (currentTab === 'abstention') {
      applyAbstentionColors()
      renderAbstention()
    } else if (currentTab === 'repartition') {
      applyRepartitionColors()
      renderRepartition()
    } else {
      restoreNormalColors()
    }
  })
})

// ─── Mode normal — rendu liste sidebar ───────────────────────────────────────
function renderList(features) {
  bureauList.innerHTML = ''
  features.forEach((feature, i) => {
    const props = feature.properties
    const code  = props.codeBureauVote
    const num   = parseInt(code)
    const color = layers[code]?.color ?? PALETTE[i % PALETTE.length]
    const r     = resultats[code]
    const taux  = r ? `participation ${r.tauxParticipation}%` : (props.nomCirco ?? '')

    const li = document.createElement('li')
    li.className = 'bureau-item' + (code === activeCode ? ' active' : '')
    li.dataset.code = code
    li.innerHTML = `
      <div class="bureau-swatch" style="background:${color}"></div>
      <div class="bureau-label">
        <div class="bureau-num">Bureau n° ${num}</div>
        <div class="bureau-nom">${NOMS_BUREAUX[code] ?? ''}</div>
        <div class="bureau-circ">${taux}</div>
      </div>
    `
    li.addEventListener('click', () => selectBureau(code))
    bureauList.appendChild(li)
  })
}

function restoreNormalColors() {
  allFeatures.forEach((feature, i) => {
    const code  = feature.properties.codeBureauVote
    const color = layers[code]?.color ?? PALETTE[i % PALETTE.length]
    layers[code]?.layer.setStyle({ fillColor: color, fillOpacity: 0.45, weight: 1.5, color: '#0f1117' })
  })
}

// ─── Sélection bureau (onglet bureaux) ───────────────────────────────────────
function selectBureau(code) {
  if (activeCode && layers[activeCode]) {
    layers[activeCode].layer.setStyle({ fillOpacity: 0.45, weight: 1.5, color: '#0f1117' })
    document.querySelector(`.bureau-item[data-code="${activeCode}"]`)?.classList.remove('active')
  }
  if (activeCode === code) { activeCode = null; hideInfoPanel(); return }

  activeCode = code
  const { layer, color } = layers[code]
  layer.setStyle({ fillOpacity: 0.8, weight: 2.5, color: '#ffffff' })
  layer.bringToFront()

  const li = document.querySelector(`.bureau-item[data-code="${code}"]`)
  li?.classList.add('active')
  li?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

  const feature = allFeatures.find(f => f.properties.codeBureauVote === code)
  showInfoPanel(feature, color)
}

// ─── Panneau d'info ──────────────────────────────────────────────────────────
function showInfoPanel(feature, color) {
  const p   = feature.properties
  const num = parseInt(p.codeBureauVote)
  const r   = resultats[p.codeBureauVote]

  infoNumero.innerHTML = `Bureau n° ${num}<span class="info-nom">${NOMS_BUREAUX[p.codeBureauVote] ?? ''}</span>`
  infoNumero.style.color = color

  if (!r) {
    infoBody.innerHTML = `<div style="color:var(--text-muted)">Résultats non disponibles</div>`
    infoPanel.classList.remove('hidden')
    return
  }

  const tauxPct  = r.tauxParticipation ?? 0
  const candidats = [...r.candidats].sort((a, b) => (b.voix ?? 0) - (a.voix ?? 0))
  const maxVoix   = candidats[0]?.voix ?? 1

  const candidatsHTML = candidats.map(c => {
    const pct    = c.pctExprimes ?? 0
    const barPct = Math.round((c.voix ?? 0) / maxVoix * 100)
    const clr    = getListColor(c.libelle)
    return `
      <div class="liste-row">
        <div class="liste-name" title="${c.libelle}">${c.libelle}</div>
        <div class="liste-bar-wrap">
          <div class="liste-bar" style="width:${barPct}%;background:${clr}"></div>
        </div>
        <div class="liste-score">
          <span class="liste-voix">${c.voix ?? 0} voix</span>
          <span class="liste-pct">${pct.toFixed(1)}%</span>
        </div>
      </div>
    `
  }).join('')

  infoBody.innerHTML = `
    <div class="stat-grid">
      <div class="stat-cell"><div class="stat-val">${r.inscrits ?? '–'}</div><div class="stat-lbl">Inscrits</div></div>
      <div class="stat-cell"><div class="stat-val">${r.votants ?? '–'}</div><div class="stat-lbl">Votants</div></div>
      <div class="stat-cell"><div class="stat-val">${r.exprimes ?? '–'}</div><div class="stat-lbl">Exprimés</div></div>
      <div class="stat-cell highlight"><div class="stat-val">${tauxPct}%</div><div class="stat-lbl">Participation</div></div>
    </div>
    <div class="participation-bar-wrap">
      <div class="participation-bar" style="width:${tauxPct}%"></div>
    </div>
    <div class="listes-title">Résultats par liste</div>
    <div class="listes-list">${candidatsHTML}</div>
    <div class="info-meta">${r.blancs ?? 0} blancs · ${r.nuls ?? 0} nuls</div>
  `
  infoPanel.classList.remove('hidden')
}

function hideInfoPanel() {
  infoPanel.classList.add('hidden')
  if (activeCode && layers[activeCode]) {
    layers[activeCode].layer.setStyle({ fillOpacity: 0.45, weight: 1.5, color: '#0f1117' })
  }
}

infoClose.addEventListener('click', () => {
  if (activeCode) {
    document.querySelector(`.bureau-item[data-code="${activeCode}"]`)?.classList.remove('active')
    activeCode = null
  }
  hideInfoPanel()
})

// ─── Recherche ───────────────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase()
  if (!q) { renderList(allFeatures); return }
  const filtered = allFeatures.filter(f => {
    const p   = f.properties
    const num = parseInt(p.codeBureauVote).toString()
    return num.includes(q) || (p.nomCirco ?? '').toLowerCase().includes(q)
  })
  renderList(filtered)
})

// ─── ONGLET ANALYSE ──────────────────────────────────────────────────────────

function initAnalyse() {
  // Calculer les voix totales par liste pour le tri
  const totaux = {}
  Object.values(resultats).forEach(b => {
    b.candidats.forEach(c => {
      totaux[c.libelle] = (totaux[c.libelle] ?? 0) + (c.voix ?? 0)
    })
  })

  const listes = Object.entries(totaux).sort((a, b) => b[1] - a[1])
  const optionsHTML = listes.map(([lib]) => `<option value="${lib}">${lib}</option>`).join('')

  listeSelect.innerHTML  = optionsHTML
  listeSelectB.innerHTML = optionsHTML
  // Sélectionner la 2e liste par défaut pour listeSelectB
  if (listeSelectB.options.length > 1) listeSelectB.selectedIndex = 1

  listeSelect.addEventListener('change', applyAnalyseAll)
  listeSelectB.addEventListener('change', applyAnalyseAll)

  // Toggle mode simple / écart
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      analyseMode = btn.dataset.mode
      listeBWrap.style.display = analyseMode === 'ecart' ? 'flex' : 'none'
      document.getElementById('label-liste-a').textContent = analyseMode === 'ecart' ? 'Liste A' : 'Liste'
      applyAnalyseAll()
    })
  })

  document.querySelectorAll('.metric-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.metric-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      activeMetric = btn.dataset.metric
      applyAnalyseAll()
    })
  })
}

function getScore(code, libelle) {
  const bureau = resultats[code]
  if (!bureau) return null
  const candidat = bureau.candidats.find(c => c.libelle === libelle)
  if (!candidat) return null
  return activeMetric === 'pct' ? (candidat.pctExprimes ?? 0) : (candidat.voix ?? 0)
}

function applyAnalyseAll() {
  if (analyseMode === 'simple') applySimple()
  else applyEcart()
}

// ── Mode simple ──────────────────────────────────────────────
function applySimple() {
  const libelle = listeSelect?.value
  if (!libelle) return
  const scores = allFeatures.map(f => getScore(f.properties.codeBureauVote, libelle)).filter(v => v !== null)
  const min = Math.min(...scores), max = Math.max(...scores)
  const color = getListColor(libelle)
  allFeatures.forEach(f => {
    const code  = f.properties.codeBureauVote
    const score = getScore(code, libelle)
    const t     = score !== null ? (score - min) / (max - min || 1) : 0
    layers[code]?.layer.setStyle({ fillColor: color, fillOpacity: 0.1 + t * 0.8, color: '#0f1117', weight: 1.5 })
  })
  const fmt = v => activeMetric === 'pct' ? `${v.toFixed(1)}%` : `${Math.round(v)} voix`
  legendWrap.innerHTML = `
    <div class="legend-label-row"><span>${fmt(min)}</span><span>${fmt(max)}</span></div>
    <div class="legend-gradient" style="background:linear-gradient(to right,${hexToRgba(color,0.1)},${hexToRgba(color,0.9)})"></div>
    <div class="legend-caption">Score de « ${libelle} »</div>
  `
  const sorted = allFeatures
    .map(f => ({ code: f.properties.codeBureauVote, score: getScore(f.properties.codeBureauVote, libelle) }))
    .filter(b => b.score !== null).sort((a, b) => b.score - a.score)
  const range = max - min || 1
  bureauListAnalyse.innerHTML = sorted.map(({ code, score }) => {
    const both = getBothScores(code, libelle)
    return `
      <li class="bureau-item analyse-item">
        <div class="bureau-label" style="flex:1">
          <div class="bureau-num">Bureau n° ${parseInt(code)}</div>
          <div class="bureau-nom">${NOMS_BUREAUX[code] ?? ''}</div>
          <div class="analyse-bar-wrap">
            <div class="analyse-bar" style="width:${Math.round((score-min)/range*100)}%;background:${color}"></div>
          </div>
        </div>
        <div class="analyse-score" style="text-align:right">${
          activeMetric === 'voix'
            ? `<div>${both.voix} voix</div><div style="font-size:10px;font-weight:400;color:var(--text-muted)">${both.pct.toFixed(1)}%</div>`
            : `<div>${both.pct.toFixed(1)}%</div><div style="font-size:10px;font-weight:400;color:var(--text-muted)">${both.voix} voix</div>`
        }</div>
      </li>
    `
  }).join('')
}

// ── Mode écart ───────────────────────────────────────────────
function applyEcart() {
  const libA = listeSelect?.value
  const libB = listeSelectB?.value
  if (!libA || !libB || libA === libB) return

  const colorA = getListColor(libA)
  const colorB = getListColor(libB)

  const ecarts = allFeatures.map(f => {
    const code  = f.properties.codeBureauVote
    const bothA = getBothScores(code, libA)
    const bothB = getBothScores(code, libB)
    const scoreA = activeMetric === 'pct' ? bothA.pct : bothA.voix
    const scoreB = activeMetric === 'pct' ? bothB.pct : bothB.voix
    return { code, ecart: scoreA - scoreB, ecartVoix: bothA.voix - bothB.voix, ecartPct: bothA.pct - bothB.pct, bothA, bothB }
  })

  const vals  = ecarts.map(e => e.ecart)
  const maxAbs = Math.max(...vals.map(Math.abs), 0.01)

  ecarts.forEach(({ code, ecart }) => {
    const t       = ecart / maxAbs          // -1 → 1
    const color   = t >= 0 ? colorA : colorB
    const opacity = 0.1 + Math.abs(t) * 0.8
    layers[code]?.layer.setStyle({ fillColor: color, fillOpacity: opacity, color: '#0f1117', weight: 1.5 })
  })

  legendWrap.innerHTML = `
    <div class="legend-label-row">
      <span style="color:${colorB}">← ${libB.length > 20 ? libB.slice(0,20)+'…' : libB}</span>
      <span style="color:${colorA}">${libA.length > 20 ? libA.slice(0,20)+'…' : libA} →</span>
    </div>
    <div class="legend-gradient" style="background:linear-gradient(to right,${hexToRgba(colorB,0.8)},rgba(40,40,40,0.2),${hexToRgba(colorA,0.8)})"></div>
    <div class="legend-caption">Écart A − B par bureau</div>
  `

  const sorted = [...ecarts].sort((a, b) => b.ecart - a.ecart)
  bureauListAnalyse.innerHTML = sorted.map(({ code, ecart, ecartVoix, ecartPct, bothA, bothB }) => {
    const num    = parseInt(code)
    const color  = ecart >= 0 ? colorA : colorB
    const barPct = Math.round(Math.abs(ecart) / maxAbs * 100)
    const detail = `A: ${bothA.voix} voix (${bothA.pct.toFixed(1)}%) · B: ${bothB.voix} voix (${bothB.pct.toFixed(1)}%)`
    const signV  = ecartVoix > 0 ? '+' : ''
    const signP  = ecartPct  > 0 ? '+' : ''
    return `
      <li class="bureau-item analyse-item">
        <div class="bureau-label" style="flex:1">
          <div class="bureau-num">Bureau n° ${num}</div>
          <div class="bureau-nom">${NOMS_BUREAUX[code] ?? ''}</div>
          <div class="bureau-circ ecart-detail">${detail}</div>
          <div class="analyse-bar-wrap">
            <div class="analyse-bar" style="width:${barPct}%;background:${color}"></div>
          </div>
        </div>
        <div class="analyse-score" style="color:${color};text-align:right">${
          activeMetric === 'voix'
            ? `<div>${signV}${ecartVoix} voix</div><div style="font-size:10px;font-weight:400">${signP}${ecartPct.toFixed(1)} pts</div>`
            : `<div>${signP}${ecartPct.toFixed(1)} pts</div><div style="font-size:10px;font-weight:400">${signV}${ecartVoix} voix</div>`
        }</div>
      </li>
    `
  }).join('')
}

function applyAnalyseStyle(code) {
  // Appelé depuis mouseout — réappliquer le style courant
  if (analyseMode === 'simple') {
    const libelle = listeSelect?.value
    if (!libelle) return
    const scores = allFeatures.map(f => getScore(f.properties.codeBureauVote, libelle)).filter(v => v !== null)
    const min = Math.min(...scores), max = Math.max(...scores)
    const score = getScore(code, libelle)
    const t = score !== null ? (score - min) / (max - min || 1) : 0
    layers[code]?.layer.setStyle({ fillColor: getListColor(libelle), fillOpacity: 0.1 + t * 0.8, color: '#0f1117', weight: 1.5 })
  } else {
    applyEcart()
  }
}

// ─── Onglet Abstention ────────────────────────────────────────────────────────
function getAbstentionVal(code) {
  const r = resultats[code]
  if (!r) return 0
  return abstentionMetric === 'voix'
    ? (r.abstentions ?? 0)
    : (r.inscrits > 0 ? r.abstentions / r.inscrits * 100 : 0)
}

function getAbstentionData() {
  const vals = allFeatures.map(f => getAbstentionVal(f.properties.codeBureauVote))
  return { min: Math.min(...vals), max: Math.max(...vals) }
}

function applyAbstentionColors() {
  const { min, max } = getAbstentionData()
  allFeatures.forEach(f => {
    const code = f.properties.codeBureauVote
    const val  = getAbstentionVal(code)
    const t    = (val - min) / (max - min || 1)
    layers[code]?.layer.setStyle({ fillColor: ABSTENTION_COLOR, fillOpacity: 0.1 + t * 0.8, color: '#0f1117', weight: 1.5 })
  })
}

function applyAbstentionStyle(code) {
  const { min, max } = getAbstentionData()
  const val = getAbstentionVal(code)
  const t   = (val - min) / (max - min || 1)
  layers[code]?.layer.setStyle({ fillColor: ABSTENTION_COLOR, fillOpacity: 0.1 + t * 0.8, color: '#0f1117', weight: 1.5 })
}

function renderAbstention() {
  const bureauListAbstention = document.getElementById('bureau-list-abstention')
  const abstentionCount      = document.getElementById('abstention-count')
  const { min, max }         = getAbstentionData()
  const range                = max - min || 1

  const sorted = allFeatures.map(f => {
    const code        = f.properties.codeBureauVote
    const r           = resultats[code]
    const abstentions = r?.abstentions ?? 0
    const pct         = r && r.inscrits > 0 ? r.abstentions / r.inscrits * 100 : 0
    return { code, abstentions, pct }
  }).sort((a, b) =>
    abstentionMetric === 'voix' ? b.abstentions - a.abstentions : b.pct - a.pct
  )

  if (abstentionCount) abstentionCount.textContent = sorted.length

  bureauListAbstention.innerHTML = sorted.map(({ code, abstentions, pct }) => `
    <li class="bureau-item analyse-item">
      <div class="bureau-label" style="flex:1">
        <div class="bureau-num">Bureau n° ${parseInt(code)}</div>
        <div class="bureau-nom">${NOMS_BUREAUX[code] ?? ''}</div>
        <div class="analyse-bar-wrap">
          <div class="analyse-bar" style="width:${Math.round((getAbstentionVal(code) - min) / range * 100)}%;background:${ABSTENTION_COLOR}"></div>
        </div>
      </div>
      <div class="analyse-score" style="text-align:right">${
        abstentionMetric === 'voix'
          ? `<div>${abstentions} abs.</div><div style="font-size:10px;font-weight:400;color:var(--text-muted)">${pct.toFixed(1)}%</div>`
          : `<div>${pct.toFixed(1)}%</div><div style="font-size:10px;font-weight:400;color:var(--text-muted)">${abstentions} abs.</div>`
      }</div>
    </li>
  `).join('')
}

function initAbstentionMetric() {
  document.querySelectorAll('.abst-metric-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.abst-metric-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      abstentionMetric = btn.dataset.metric
      if (currentTab === 'abstention') {
        applyAbstentionColors()
        renderAbstention()
      }
    })
  })
}

// ─── Onglet Répartition ───────────────────────────────────────────────────────
function getRepartitionColor() {
  if (repartitionSelected.size === 1) {
    const [key] = repartitionSelected
    return key === '__abstentions__' ? ABSTENTION_COLOR : getListColor(key)
  }
  return '#4f7ef7'
}

function getRepartitionVal(code) {
  if (repartitionSelected.size === 0) return 0
  const r = resultats[code]
  if (!r) return 0
  let total = 0
  repartitionSelected.forEach(key => {
    if (key === '__abstentions__') {
      total += repartitionMetric === 'voix'
        ? (r.abstentions ?? 0)
        : (r.inscrits > 0 ? r.abstentions / r.inscrits * 100 : 0)
    } else {
      const cand = r.candidats.find(c => c.libelle === key)
      total += repartitionMetric === 'voix'
        ? (cand?.voix ?? 0)
        : (r.inscrits > 0 ? (cand?.voix ?? 0) / r.inscrits * 100 : 0)
    }
  })
  return total
}

function getRepartitionData() {
  const vals = allFeatures.map(f => getRepartitionVal(f.properties.codeBureauVote))
  return { min: Math.min(...vals), max: Math.max(...vals) }
}

function applyRepartitionColors() {
  if (repartitionSelected.size === 0) {
    restoreNormalColors()
    document.getElementById('legend-wrap-rep').innerHTML = ''
    return
  }
  const { min, max } = getRepartitionData()
  const color = getRepartitionColor()
  allFeatures.forEach(f => {
    const code = f.properties.codeBureauVote
    const val  = getRepartitionVal(code)
    const t    = (val - min) / (max - min || 1)
    layers[code]?.layer.setStyle({ fillColor: color, fillOpacity: 0.1 + t * 0.8, color: '#0f1117', weight: 1.5 })
  })
  const fmt   = v => repartitionMetric === 'voix' ? `${Math.round(v)} voix` : `${v.toFixed(1)}%`
  const n     = repartitionSelected.size
  const label = n === 1
    ? ([...repartitionSelected][0] === '__abstentions__' ? 'Abstentions' : [...repartitionSelected][0])
    : `${n} listes sélectionnées`
  const caption = label.length > 34 ? label.slice(0, 34) + '…' : label
  document.getElementById('legend-wrap-rep').innerHTML = `
    <div class="legend-label-row"><span>${fmt(min)}</span><span>${fmt(max)}</span></div>
    <div class="legend-gradient" style="background:linear-gradient(to right,${hexToRgba(color, 0.1)},${hexToRgba(color, 0.9)})"></div>
    <div class="legend-caption">${caption}</div>
  `
}

function applyRepartitionStyle(code) {
  if (repartitionSelected.size === 0) return
  const { min, max } = getRepartitionData()
  const val   = getRepartitionVal(code)
  const t     = (val - min) / (max - min || 1)
  const color = getRepartitionColor()
  layers[code]?.layer.setStyle({ fillColor: color, fillOpacity: 0.1 + t * 0.8, color: '#0f1117', weight: 1.5 })
}

function renderRepartition() {
  const bureauListRep = document.getElementById('bureau-list-repartition')
  if (repartitionSelected.size === 0) {
    bureauListRep.innerHTML = '<li style="padding:16px;color:var(--text-muted);font-size:12px;text-align:center">Sélectionnez au moins une liste</li>'
    return
  }
  const { min, max } = getRepartitionData()
  const range        = max - min || 1
  const color        = getRepartitionColor()

  const sorted = allFeatures.map(f => {
    const code = f.properties.codeBureauVote
    const r    = resultats[code]
    let voix = 0, pct = 0
    repartitionSelected.forEach(key => {
      if (key === '__abstentions__') {
        voix += r?.abstentions ?? 0
        pct  += r && r.inscrits > 0 ? r.abstentions / r.inscrits * 100 : 0
      } else {
        const cand = r?.candidats.find(c => c.libelle === key)
        const v = cand?.voix ?? 0
        voix += v
        pct  += r && r.inscrits > 0 ? v / r.inscrits * 100 : 0
      }
    })
    return { code, voix, pct }
  }).sort((a, b) => repartitionMetric === 'voix' ? b.voix - a.voix : b.pct - a.pct)

  bureauListRep.innerHTML = sorted.map(({ code, voix, pct }) => `
    <li class="bureau-item analyse-item">
      <div class="bureau-label" style="flex:1">
        <div class="bureau-num">Bureau n° ${parseInt(code)}</div>
        <div class="bureau-nom">${NOMS_BUREAUX[code] ?? ''}</div>
        <div class="analyse-bar-wrap">
          <div class="analyse-bar" style="width:${Math.round((getRepartitionVal(code) - min) / range * 100)}%;background:${color}"></div>
        </div>
      </div>
      <div class="analyse-score" style="text-align:right">${
        repartitionMetric === 'voix'
          ? `<div>${voix} voix</div><div style="font-size:10px;font-weight:400;color:var(--text-muted)">${pct.toFixed(1)}%</div>`
          : `<div>${pct.toFixed(1)}%</div><div style="font-size:10px;font-weight:400;color:var(--text-muted)">${voix} voix</div>`
      }</div>
    </li>
  `).join('')
}

function setAllRepartition(checked) {
  document.querySelectorAll('#rep-checklist input[type="checkbox"]').forEach(cb => {
    cb.checked = checked
    checked ? repartitionSelected.add(cb.value) : repartitionSelected.delete(cb.value)
  })
  if (currentTab === 'repartition') { applyRepartitionColors(); renderRepartition() }
}

function initRepartition() {
  const totaux = {}
  Object.values(resultats).forEach(b => {
    b.candidats.forEach(c => { totaux[c.libelle] = (totaux[c.libelle] ?? 0) + (c.voix ?? 0) })
  })
  const listes = Object.entries(totaux).sort((a, b) => b[1] - a[1])

  const items = [
    { key: '__abstentions__', label: 'Abstentions', color: ABSTENTION_COLOR },
    ...listes.map(([lib]) => ({ key: lib, label: lib, color: getListColor(lib) })),
  ]

  document.getElementById('rep-checklist').innerHTML = items.map(({ key, label, color }) => `
    <label class="rep-check-item">
      <input type="checkbox" value="${key}">
      <div class="rep-check-swatch" style="background:${color}"></div>
      <span class="rep-check-label" title="${label}">${label}</span>
    </label>
  `).join('')

  document.querySelectorAll('#rep-checklist input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      cb.checked ? repartitionSelected.add(cb.value) : repartitionSelected.delete(cb.value)
      if (currentTab === 'repartition') { applyRepartitionColors(); renderRepartition() }
    })
  })

  document.getElementById('rep-select-all').addEventListener('click',  () => setAllRepartition(true))
  document.getElementById('rep-select-none').addEventListener('click', () => setAllRepartition(false))

  document.querySelectorAll('.rep-metric-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.rep-metric-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      repartitionMetric = btn.dataset.metric
      if (currentTab === 'repartition') { applyRepartitionColors(); renderRepartition() }
    })
  })
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
