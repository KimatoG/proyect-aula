/**
 * EcoAlecta - Reportes de Residuos Sólidos & Muro Comunitario
 * Soporte para ver comentarios ya hechos, publicar reportes y comentar.
 */

// ESTADO GLOBAL
const state = {
  activeView: 'create', // 'create' | 'feed'
  currentFilter: 'todos',
  currentReport: {
    location: '',
    reporter: '',
    date: '',
    wasteType: 'Plásticos y Envases',
    urgency: 'Moderado',
    description: '',
    solution: '',
    images: [] // { id, dataUrl, caption }
  },
  communityReports: []
};

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupDefaultDate();
  setupPills();
  setupInputs();
  setupDropzone();
  setupNavigation();
  setupActions();
  loadCommunityReports();
  updateLivePreview();
  renderCommunityFeed();
});

function setupDefaultDate() {
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('inp-date');
  if (dateInput) {
    dateInput.value = today;
    state.currentReport.date = today;
  }
}

// ==========================================================================
// NAVEGACIÓN ENTRE PESTAÑAS (CREAR VS MURO)
// ==========================================================================
function setupNavigation() {
  const tabCreate = document.getElementById('tab-btn-create');
  const tabFeed = document.getElementById('tab-btn-feed');
  const btnGoCreate = document.getElementById('btn-go-create');

  tabCreate.addEventListener('click', () => switchView('create'));
  tabFeed.addEventListener('click', () => switchView('feed'));
  if (btnGoCreate) {
    btnGoCreate.addEventListener('click', () => switchView('create'));
  }

  // Filtros del muro comunitario
  const filterPills = document.querySelectorAll('.feed-filters .filter-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.currentFilter = pill.getAttribute('data-filter');
      renderCommunityFeed();
    });
  });
}

function switchView(viewName) {
  state.activeView = viewName;

  const viewCreate = document.getElementById('view-create');
  const viewFeed = document.getElementById('view-feed');
  const tabCreate = document.getElementById('tab-btn-create');
  const tabFeed = document.getElementById('tab-btn-feed');

  if (viewName === 'create') {
    viewCreate.classList.add('active');
    viewFeed.classList.remove('active');
    tabCreate.classList.add('active');
    tabFeed.classList.remove('active');
  } else {
    viewCreate.classList.remove('active');
    viewFeed.classList.add('active');
    tabCreate.classList.remove('active');
    tabFeed.classList.add('active');
    renderCommunityFeed();
  }
}

// ==========================================================================
// FORMULARIO Y SELECTORES (PILLS)
// ==========================================================================
function setupPills() {
  const wastePills = document.querySelectorAll('#waste-type-pills .pill-option');
  wastePills.forEach(pill => {
    pill.addEventListener('click', () => {
      wastePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.currentReport.wasteType = pill.getAttribute('data-val');
      updateLivePreview();
    });
  });

  const urgencyPills = document.querySelectorAll('#urgency-pills .pill-option');
  urgencyPills.forEach(pill => {
    pill.addEventListener('click', () => {
      urgencyPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.currentReport.urgency = pill.getAttribute('data-val');
      updateLivePreview();
    });
  });
}

function setupInputs() {
  const bindings = [
    { id: 'inp-location', key: 'location' },
    { id: 'inp-reporter', key: 'reporter' },
    { id: 'inp-date', key: 'date' },
    { id: 'inp-description', key: 'description' },
    { id: 'inp-solution', key: 'solution' }
  ];

  bindings.forEach(({ id, key }) => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', (e) => {
        state.currentReport[key] = e.target.value;
        updateLivePreview();
      });
    }
  });
}

// ==========================================================================
// BOTONES PRINCIPALES
// ==========================================================================
function setupActions() {
  // Descargar PDF / Imprimir
  document.getElementById('btn-print').addEventListener('click', () => {
    if (state.activeView !== 'create') {
      switchView('create');
    }
    setTimeout(() => window.print(), 100);
  });

  // Cargar Ejemplo en el formulario
  document.getElementById('btn-example').addEventListener('click', () => {
    if (state.activeView !== 'create') switchView('create');
    loadWasteExample();
  });

  // Limpiar formulario
  document.getElementById('btn-new').addEventListener('click', resetCurrentReport);

  // Publicar en el muro
  document.getElementById('btn-publish-wall').addEventListener('click', publishReportToWall);

  // Descargar archivo autocontenido para mandar
  const btnDownload = document.getElementById('btn-download-html');
  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      // Redirigir o descargar el archivo completo
      const a = document.createElement('a');
      a.href = 'ecoalecta-completo.html';
      a.download = 'EcoAlecta-Residuos-Solidos.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      alert('✅ ¡Archivo "EcoAlecta-Residuos-Solidos.html" descargado!\n\nEste archivo único contiene todo el sistema y está listo para que lo adjuntes y lo mandes por WhatsApp, correo o Telegram.');
    });
  }

  // Zoom de fotos
  const zoomModal = document.getElementById('image-zoom');
  document.getElementById('btn-zoom-close').addEventListener('click', () => {
    zoomModal.classList.remove('show');
  });
  zoomModal.addEventListener('click', (e) => {
    if (e.target === zoomModal) zoomModal.classList.remove('show');
  });
}

// ==========================================================================
// CARGA Y DROPZONE DE IMÁGENES
// ==========================================================================
function setupDropzone() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');

  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
      fileInput.value = '';
    }
  });

  ['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  });
}

function handleFiles(files) {
  const valid = files.filter(f => f.type.startsWith('image/'));
  if (valid.length === 0) return;

  valid.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      compressAndAddImage(e.target.result, file.name);
    };
    reader.readAsDataURL(file);
  });
}

function compressAndAddImage(dataUrl, defaultName) {
  const img = new Image();
  img.onload = () => {
    const max = 1200;
    let w = img.width;
    let h = img.height;

    if (w > max || h > max) {
      if (w > h) {
        h = Math.round((h * max) / w);
        w = max;
      } else {
        w = Math.round((w * max) / h);
        h = max;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    const optimized = canvas.toDataURL('image/jpeg', 0.85);

    state.currentReport.images.push({
      id: 'img_' + Math.random().toString(36).substr(2, 6),
      dataUrl: optimized,
      caption: `Foto ${state.currentReport.images.length + 1}: Evidencia en el punto`
    });

    renderPhotosEditor();
    updateLivePreview();
  };
  img.src = dataUrl;
}

function renderPhotosEditor() {
  const container = document.getElementById('photos-editor-list');
  const countBadge = document.getElementById('photo-count-badge');
  container.innerHTML = '';

  countBadge.textContent = `${state.currentReport.images.length} ${state.currentReport.images.length === 1 ? 'foto' : 'fotos'}`;

  state.currentReport.images.forEach((img, idx) => {
    const item = document.createElement('div');
    item.className = 'photo-edit-item';

    item.innerHTML = `
      <div class="photo-thumb">
        <img src="${img.dataUrl}" alt="Foto ${idx + 1}">
      </div>
      <input type="text" class="inp-caption" value="${escapeHtml(img.caption)}" placeholder="Escribe una breve nota sobre la foto...">
      <button type="button" class="btn-del-photo" title="Eliminar foto">&times;</button>
    `;

    item.querySelector('.inp-caption').addEventListener('input', (e) => {
      img.caption = e.target.value;
      updateLivePreview();
    });

    item.querySelector('.btn-del-photo').addEventListener('click', () => {
      state.currentReport.images.splice(idx, 1);
      renderPhotosEditor();
      updateLivePreview();
    });

    container.appendChild(item);
  });
}

// ==========================================================================
// VISTA PREVIA EN TIEMPO REAL (LADO DERECHO)
// ==========================================================================
function updateLivePreview() {
  const r = state.currentReport;

  setText('pv-location', r.location || 'Indica el lugar o sector en el formulario');
  setText('pv-reporter', r.reporter || 'Comunidad / Vecinos');

  if (r.date) {
    const parts = r.date.split('-');
    setText('pv-date', parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : r.date);
  } else {
    setText('pv-date', 'Sin fecha');
  }

  setText('pv-type', r.wasteType);

  const urgEl = document.getElementById('pv-urgency');
  const urgWrapper = document.getElementById('pv-urgency-wrapper');
  if (urgEl && urgWrapper) {
    urgEl.textContent = r.urgency;
    urgWrapper.className = 'meta-tag tag-urgency ' + getUrgencyClass(r.urgency);
  }

  setText('pv-description', r.description || 'Describe aquí brevemente qué observas en el lugar para verlo reflejado en este reporte.');

  const solText = document.getElementById('pv-solution');
  solText.textContent = r.solution || 'Coordinar jornada de retiro o solicitar contenedores adecuados.';

  renderPreviewPhotos();
}

function getUrgencyClass(urg) {
  if (urg === 'Bajo') return 'urg-bajo';
  if (urg === 'Urgente') return 'urg-urgente';
  return 'urg-moderado';
}

function renderPreviewPhotos() {
  const grid = document.getElementById('pv-photos-grid');
  const countSpan = document.getElementById('pv-photo-count');
  const images = state.currentReport.images;
  countSpan.textContent = `${images.length} fotos`;

  if (images.length === 0) {
    grid.innerHTML = `
      <div class="empty-photos-box">
        <span class="empty-icon">🍃</span>
        <p>Aún no has agregado fotos.</p>
        <small>Sube fotos desde el panel izquierdo para verlas aquí.</small>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';
  images.forEach((img, idx) => {
    const card = document.createElement('div');
    card.className = 'photo-sheet-card';

    card.innerHTML = `
      <div class="photo-wrap" title="Clic para ampliar">
        <img src="${img.dataUrl}" alt="Foto ${idx + 1}">
      </div>
      <div class="photo-label-box">
        ${escapeHtml(img.caption || `Foto ${idx + 1}`)}
      </div>
    `;

    card.querySelector('.photo-wrap').addEventListener('click', () => {
      openZoom(img.dataUrl, img.caption);
    });

    grid.appendChild(card);
  });
}

function openZoom(src, caption) {
  const modal = document.getElementById('image-zoom');
  document.getElementById('zoom-img').src = src;
  document.getElementById('zoom-caption').textContent = caption || '';
  modal.classList.add('show');
}

// ==========================================================================
// PUBLICAR REPORTE AL MURO COMUNITARIO
// ==========================================================================
function publishReportToWall() {
  const r = state.currentReport;
  if (!r.location.trim()) {
    alert('Por favor escribe al menos el lugar o sector donde se ubica el problema.');
    document.getElementById('inp-location').focus();
    return;
  }

  const newPost = {
    id: 'post_' + Date.now(),
    location: r.location,
    reporter: r.reporter || 'Vecino anónimo',
    date: r.date || new Date().toISOString().split('T')[0],
    wasteType: r.wasteType,
    urgency: r.urgency,
    description: r.description || 'Sin descripción adicional.',
    solution: r.solution || 'Pendiente de coordinación con el equipo vecinal.',
    images: JSON.parse(JSON.stringify(r.images)),
    comments: [
      {
        id: 'c_init',
        author: 'Sistema EcoAlecta',
        text: 'Reporte registrado y visible para toda la comunidad.',
        time: 'Hace un momento'
      }
    ]
  };

  // Añadir al inicio de la lista
  state.communityReports.unshift(newPost);
  saveCommunityReports();

  alert('🎉 ¡Tu reporte ha sido publicado con éxito en el Muro Comunitario!');
  switchView('feed');
}

// ==========================================================================
// GESTIÓN DEL MURO Y COMENTARIOS YA HECHOS
// ==========================================================================
function loadCommunityReports() {
  const saved = localStorage.getItem('ecoalecta_community_posts') || localStorage.getItem('ecoreporte_community_posts');
  if (saved) {
    try {
      state.communityReports = JSON.parse(saved);
    } catch {
      state.communityReports = getDefaultCommunityPosts();
    }
  } else {
    state.communityReports = getDefaultCommunityPosts();
    saveCommunityReports();
  }
  updateBadgeCounts();
}

function saveCommunityReports() {
  try {
    localStorage.setItem('ecoalecta_community_posts', JSON.stringify(state.communityReports));
  } catch (e) {
    console.warn('Error guardando en localStorage', e);
  }
  updateBadgeCounts();
}

function updateBadgeCounts() {
  const totalBadge = document.getElementById('badge-total-reports');
  const filterCountAll = document.getElementById('filter-count-all');
  const count = state.communityReports.length;

  if (totalBadge) totalBadge.textContent = count;
  if (filterCountAll) filterCountAll.textContent = count;
}

function renderCommunityFeed() {
  const container = document.getElementById('feed-cards-container');
  if (!container) return;

  container.innerHTML = '';

  let list = state.communityReports;
  if (state.currentFilter !== 'todos') {
    list = list.filter(item => item.wasteType === state.currentFilter);
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: white; border-radius: 16px; border: 1px dashed #cbd5e1;">
        <span style="font-size: 2.2rem; display: block; margin-bottom: 8px;">🌱</span>
        <h3 style="color: #065f46; margin-bottom: 6px;">No hay reportes en esta categoría</h3>
        <p style="color: #64748b; font-size: 0.9rem;">Sé el primero en reportar un punto usando el botón superior.</p>
      </div>
    `;
    return;
  }

  list.forEach(post => {
    const card = document.createElement('article');
    card.className = 'community-card';

    // Foto principal si tiene
    let photoHtml = '';
    if (post.images && post.images.length > 0) {
      photoHtml = `
        <div class="card-photo-slider" title="Clic para ampliar foto">
          <img src="${post.images[0].dataUrl}" alt="${escapeHtml(post.location)}">
          <span class="card-photo-badge">📷 ${post.images.length} ${post.images.length === 1 ? 'foto' : 'fotos'}</span>
        </div>
      `;
    }

    // Lista de comentarios ya hechos
    let commentsHtml = '';
    if (post.comments && post.comments.length > 0) {
      commentsHtml = post.comments.map(c => `
        <div class="comment-bubble">
          <div>
            <span class="comment-bubble-author">${escapeHtml(c.author)}:</span>
            <span class="comment-bubble-text">${escapeHtml(c.text)}</span>
          </div>
          <span class="comment-bubble-time">${escapeHtml(c.time || 'Reciente')}</span>
        </div>
      `).join('');
    } else {
      commentsHtml = '<p class="no-comments-yet">Aún no hay comentarios. ¡Sé el primero en responder!</p>';
    }

    card.innerHTML = `
      <div class="card-top">
        <div class="card-loc-area">
          <span class="card-loc-icon">📍</span>
          <div>
            <h3 class="card-loc-title">${escapeHtml(post.location)}</h3>
            <p class="card-reporter-info">Por: <strong>${escapeHtml(post.reporter)}</strong> • ${escapeHtml(post.date)}</p>
          </div>
        </div>
      </div>

      <div class="card-badges">
        <span class="badge-res">${escapeHtml(post.wasteType)}</span>
        <span class="badge-urg meta-tag tag-urgency ${getUrgencyClass(post.urgency)}">${escapeHtml(post.urgency)}</span>
      </div>

      ${photoHtml}

      <div class="card-body">
        <p class="card-desc">${escapeHtml(post.description)}</p>
        ${post.solution ? `
          <div class="card-action-box">
            <strong>Solución o Acción:</strong>
            ${escapeHtml(post.solution)}
          </div>
        ` : ''}
      </div>

      <!-- SECCIÓN DE COMENTARIOS YA HECHOS -->
      <div class="comments-section">
        <div class="comments-header">
          <span>💬 Comentarios y acuerdos (${post.comments ? post.comments.length : 0})</span>
        </div>

        <div class="comments-list">
          ${commentsHtml}
        </div>

        <!-- FORMULARIO RÁPIDO PARA AÑADIR NUEVO COMENTARIO -->
        <div class="add-comment-box">
          <input type="text" class="input-quick-comment" placeholder="Escribe un comentario o propuesta...">
          <button type="button" class="btn-send-comment">Comentar</button>
        </div>
      </div>

      <div class="card-bottom-actions">
        <button type="button" class="btn-card-load">
          📄 Ver reporte completo en ficha / Imprimir
        </button>
      </div>
    `;

    // Clic en la foto para zoom
    if (post.images && post.images.length > 0) {
      card.querySelector('.card-photo-slider').addEventListener('click', () => {
        openZoom(post.images[0].dataUrl, post.images[0].caption || post.location);
      });
    }

    // Enviar comentario nuevo
    const inputComment = card.querySelector('.input-quick-comment');
    const btnComment = card.querySelector('.btn-send-comment');

    const handleAddComment = () => {
      const val = inputComment.value.trim();
      if (!val) return;

      if (!post.comments) post.comments = [];
      post.comments.push({
        id: 'c_' + Date.now(),
        author: 'Vecino participativo',
        text: val,
        time: 'Justo ahora'
      });

      saveCommunityReports();
      renderCommunityFeed();
    };

    btnComment.addEventListener('click', handleAddComment);
    inputComment.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAddComment();
    });

    // Cargar en la ficha de reporte
    card.querySelector('.btn-card-load').addEventListener('click', () => {
      loadPostIntoEditor(post);
      switchView('create');
    });

    container.appendChild(card);
  });
}

function loadPostIntoEditor(post) {
  state.currentReport = {
    location: post.location,
    reporter: post.reporter,
    date: post.date,
    wasteType: post.wasteType,
    urgency: post.urgency,
    description: post.description,
    solution: post.solution,
    images: JSON.parse(JSON.stringify(post.images || []))
  };

  document.getElementById('inp-location').value = post.location;
  document.getElementById('inp-reporter').value = post.reporter;
  document.getElementById('inp-date').value = post.date;
  document.getElementById('inp-description').value = post.description;
  document.getElementById('inp-solution').value = post.solution;

  activatePill('#waste-type-pills', post.wasteType);
  activatePill('#urgency-pills', post.urgency);

  renderPhotosEditor();
  updateLivePreview();
}

function activatePill(containerSelector, val) {
  const pills = document.querySelectorAll(`${containerSelector} .pill-option`);
  pills.forEach(p => {
    if (p.getAttribute('data-val') === val) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });
}

function resetCurrentReport() {
  if (!confirm('¿Deseas limpiar el formulario para escribir un reporte nuevo?')) return;

  state.currentReport = {
    location: '',
    reporter: '',
    date: '',
    wasteType: 'Plásticos y Envases',
    urgency: 'Moderado',
    description: '',
    solution: '',
    images: []
  };

  document.getElementById('inp-location').value = '';
  document.getElementById('inp-reporter').value = '';
  document.getElementById('inp-description').value = '';
  document.getElementById('inp-solution').value = '';

  setupDefaultDate();
  renderPhotosEditor();
  updateLivePreview();
}

// ==========================================================================
// EJEMPLO ILUSTRATIVO
// ==========================================================================
function loadWasteExample() {
  const foto1 = createWasteCanvasPhoto('BOTELLAS PLÁSTICAS ACUMULADAS', 'Punto crítico en borde del parque', '#3b82f6', 'botellas');
  const foto2 = createWasteCanvasPhoto('CONTENEDOR DESBORDADO', 'Falta de frecuencia de recolección', '#f59e0b', 'contenedor');

  state.currentReport = {
    location: 'Parque El Roble - Cruce con Pasaje Los Sauces',
    reporter: 'Comité de Vecinos y Voluntariado Verde',
    wasteType: 'Plásticos y Envases',
    urgency: 'Moderado',
    date: new Date().toISOString().split('T')[0],
    description: 'Se detectó acumulación de botellas PET, vasos descartables y bolsas plásticas al costado del área de juegos. Los residuos se esparcen con el viento debido a la falta de tapas en los tachos.',
    solution: 'Organizar jornada vecinal de recojo este sábado y solicitar a la municipalidad un contenedor diferenciado con tapa para plásticos reciclables.',
    images: [
      {
        id: 'img_ex1',
        dataUrl: foto1,
        caption: 'Foto 1: Acumulación de botellas plásticas cerca a zona infantil'
      },
      {
        id: 'img_ex2',
        dataUrl: foto2,
        caption: 'Foto 2: Tacho actual desbordado que requiere recambio'
      }
    ]
  };

  document.getElementById('inp-location').value = state.currentReport.location;
  document.getElementById('inp-reporter').value = state.currentReport.reporter;
  document.getElementById('inp-date').value = state.currentReport.date;
  document.getElementById('inp-description').value = state.currentReport.description;
  document.getElementById('inp-solution').value = state.currentReport.solution;

  activatePill('#waste-type-pills', state.currentReport.wasteType);
  activatePill('#urgency-pills', state.currentReport.urgency);

  renderPhotosEditor();
  updateLivePreview();
}

// ==========================================================================
// REPORTES COMUNITARIOS POR DEFECTO (CON COMENTARIOS YA HECHOS)
// ==========================================================================
function getDefaultCommunityPosts() {
  const fotoBotellas = createWasteCanvasPhoto('PLÁSTICOS EN ÁREA VERDE', 'Parque Los Pinos - Esquina Calle 4', '#38bdf8', 'botellas');
  const fotoDesmonte = createWasteCanvasPhoto('DESMONTE Y ESCOMBROS', 'Canal Norte - Sector Puente Peatonal', '#f97316', 'contenedor');
  const fotoColegio = createWasteCanvasPhoto('PUNTO LIMPIO RECUPERADO', 'Colegio San Martín - Puerta Posterior', '#10b981', 'botellas');

  return [
    {
      id: 'post_1',
      location: 'Parque Los Pinos - Esquina con Calle 4',
      reporter: 'Doña Rosa (Vecina Sector 3)',
      date: '05/10/2026',
      wasteType: 'Plásticos y Envases',
      urgency: 'Moderado',
      description: 'Acumulación recurrente de botellas descartables y envases de comida al lado de las bancas. Los perros abren las bolsas por la noche.',
      solution: 'Jornada vecinal este sábado a las 9:00 AM para recoger y colocar un tacho metálico con candado.',
      images: [
        {
          id: 'p1_img1',
          dataUrl: fotoBotellas,
          caption: 'Evidencia: Botellas y vasos esparcidos'
        }
      ],
      comments: [
        {
          id: 'c1',
          author: 'Vecina Rosa',
          text: '¡Vecinos, ya coordiné con la directiva y nos reunimos este sábado a las 9am!',
          time: 'Ayer, 4:15 PM'
        },
        {
          id: 'c2',
          author: 'Carlos (Voluntario joven)',
          text: 'Yo llevaré 10 bolsas de basura grandes y dos rastrillos.',
          time: 'Ayer, 5:30 PM'
        },
        {
          id: 'c3',
          author: 'EcoLíder Comunitario',
          text: 'Excelente iniciativa. Avisaremos a la cuadrilla municipal para que pase a mediodía por las bolsas.',
          time: 'Hoy, 8:20 AM'
        }
      ]
    },
    {
      id: 'post_2',
      location: 'Ribera del Canal Norte - Sector Puente Peatonal',
      reporter: 'Brigada Ambientalista Juvenil',
      date: '04/10/2026',
      wasteType: 'Punto Crítico',
      urgency: 'Urgente',
      description: 'Microbasural clandestino con desmonte de construcción, costales y restos de madera que amenazan con bloquear el canal de drenaje.',
      solution: 'Se requiere maquinaria o camioneta para trasladar el desmonte al relleno autorizado.',
      images: [
        {
          id: 'p2_img1',
          dataUrl: fotoDesmonte,
          caption: 'Evidencia: Escombros cerca al cauce de agua'
        }
      ],
      comments: [
        {
          id: 'c4',
          author: 'Mariana T.',
          text: 'Es peligroso si llueve, el agua se va a desbordar hacia la pista.',
          time: 'Hace 2 días'
        },
        {
          id: 'c5',
          author: 'Ing. Pedro Morales',
          text: 'Ingresé una solicitud formal con las fotos adjuntas para que envíen el camión batea esta semana.',
          time: 'Ayer, 11:00 AM'
        }
      ]
    },
    {
      id: 'post_3',
      location: 'Colegio San Martín - Puerta Posterior',
      reporter: 'Profesor Luis y Alumnos de 4to',
      date: '02/10/2026',
      wasteType: 'Plásticos y Envases',
      urgency: 'Bajo',
      description: 'Instalación exitosa de 3 tachos clasificadores de plástico y papel. Se solicita a los padres no dejar bolsas de basura doméstica en la puerta.',
      solution: 'Monitorear durante la entrada y salida escolar.',
      images: [
        {
          id: 'p3_img1',
          dataUrl: fotoColegio,
          caption: 'Evidencia: Tachos señalizados por los estudiantes'
        }
      ],
      comments: [
        {
          id: 'c6',
          author: 'Mamá de Mateo',
          text: '¡Qué buena iniciativa del colegio! Ya se nota la diferencia en la vereda.',
          time: 'Hace 4 días'
        },
        {
          id: 'c7',
          author: 'Don Jorge (Comerciante)',
          text: 'Los vecinos de enfrente nos comprometemos a cuidar que nadie tire bolsas por la noche.',
          time: 'Hace 3 días'
        }
      ]
    }
  ];
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Canvas procedural para fotos de muestra
 */
function createWasteCanvasPhoto(title, sub, color, type) {
  const canvas = document.createElement('canvas');
  canvas.width = 700;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 700, 480);

  const grad = ctx.createLinearGradient(0, 0, 0, 480);
  grad.addColorStop(0, '#1e293b');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 700, 480);

  ctx.save();
  ctx.translate(350, 210);

  if (type === 'botellas') {
    for (let i = -2; i <= 2; i++) {
      ctx.save();
      ctx.translate(i * 65, (i % 2) * 20);
      ctx.rotate((i * 18 * Math.PI) / 180);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-20, -50, 40, 90, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.fillRect(-10, -70, 20, 20);
      ctx.restore();
    }
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-70, -60);
    ctx.lineTo(70, -60);
    ctx.lineTo(55, 90);
    ctx.lineTo(-55, 90);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 15, 30, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(-25, -75, 20, 0, Math.PI * 2);
    ctx.arc(20, -80, 25, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(0, 380, 700, 100);

  ctx.fillStyle = color;
  ctx.fillRect(0, 376, 700, 4);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(title, 24, 418);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(sub, 24, 448);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('🌿 EVIDENCIA DE CAMPO • RESIDUOS SÓLIDOS', 24, 35);

  return canvas.toDataURL('image/jpeg', 0.85);
}
