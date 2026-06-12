const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwp4U3JBMKChABnPw3nzH6dmlsvoFk3J2dYCdzu66TscNy4CVOpfLWcrtI3XJG5fK0xlw/exec';

/* ── 1. OVERLAY + AUDIO ────────────────────────────────────── */
const overlay = document.getElementById('overlay');
const audio   = document.getElementById('bg-audio');
const pBtn    = document.getElementById('p-btn');
const vinyl   = document.getElementById('vinyl');
const waves   = document.getElementById('waves');
const player  = document.getElementById('player');
let playing   = false;

function tryPlay() {
  audio.volume = 0.65;
  audio.play().then(() => {
    playing = true;
    pBtn.textContent = '⏸';
    vinyl.classList.add('on');
    waves.classList.remove('off');
  }).catch(() => {
    pBtn.textContent = '▶';
    waves.classList.add('off');
  });
}

['click', 'touchend'].forEach(ev => {
  overlay.addEventListener(ev, e => {
    e.preventDefault();
    overlay.classList.add('out');
    player.classList.add('show');
    tryPlay();
  }, { once: true });
});

pBtn.addEventListener('click', () => {
  if (playing) {
    audio.pause();
    playing = false;
    pBtn.textContent = '▶';
    vinyl.classList.remove('on');
    waves.classList.add('off');
  } else {
    tryPlay();
  }
});

/* ── 2. CUENTA REGRESIVA ───────────────────────────────────── */
const WEDDING = new Date('2026-09-18T14:00:00');
const pad = n => String(n).padStart(2, '0');

function tick() {
  const now  = new Date();
  const diff = WEDDING - now;
  if (diff <= 0) {
    ['months','days','hours','minutes','seconds'].forEach(id => {
      document.getElementById(id).textContent = '00';
    });
    return;
  }
  let months = (WEDDING.getFullYear() - now.getFullYear()) * 12
             + (WEDDING.getMonth()    - now.getMonth());
  if (now.getDate() > WEDDING.getDate()) months--;
  months = Math.max(0, months);

  const base = new Date(
    now.getFullYear(), now.getMonth() + months,
    now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()
  );
  const rem = WEDDING - base;

  document.getElementById('months').textContent  = pad(months);
  document.getElementById('days').textContent    = pad(Math.floor(rem / 86400000));
  document.getElementById('hours').textContent   = pad(Math.floor(rem % 86400000 / 3600000));
  document.getElementById('minutes').textContent = pad(Math.floor(rem % 3600000  / 60000));
  document.getElementById('seconds').textContent = pad(Math.floor(rem % 60000    / 1000));
}
tick();
setInterval(tick, 1000);

/* ── 3. CALENDARIO ─────────────────────────────────────────── */
const EVT = {
  title:    'Matrimonio Erica & Emilio',
  location: 'Parroquia San Joaquín y Santa Ana, Rionegro, Antioquia',
  desc:     'Ceremonia: 2:00 PM - Parroquia San Joaquín y Santa Ana, Rionegro\\nRecepción: Club El Prado, La Ceja, Antioquia',
  start:    '20260918T140000',
  end:      '20260919T030000',
};

function ics() {
  return [
    'BEGIN:VCALENDAR','VERSION:2.0','CALSCALE:GREGORIAN','METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${EVT.start}`,`DTEND:${EVT.end}`,
    `SUMMARY:${EVT.title}`,`LOCATION:${EVT.location}`,`DESCRIPTION:${EVT.desc}`,
    'BEGIN:VALARM','TRIGGER:-P1D','ACTION:DISPLAY','DESCRIPTION:¡Mañana es la boda!','END:VALARM',
    'END:VEVENT','END:VCALENDAR'
  ].join('\r\n');
}

function dlICS() {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([ics()], { type: 'text/calendar' })),
    download: 'matrimonio-erica-emilio.ics'
  });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const calToggle = document.getElementById('cal-toggle');
const calDD     = document.getElementById('cal-dropdown');

calToggle.addEventListener('click', e => {
  e.stopPropagation();
  const open = calDD.classList.toggle('open');
  calToggle.setAttribute('aria-expanded', open);
});
document.addEventListener('click', () => calDD.classList.remove('open'));

document.getElementById('cal-google').addEventListener('click', () => {
  window.open(
    'https://calendar.google.com/calendar/r/eventedit?' +
    new URLSearchParams({
      text: EVT.title,
      dates: `${EVT.start}/${EVT.end}`,
      location: EVT.location,
      details: EVT.desc.replace('\\n', '\n')
    }),
    '_blank'
  );
  calDD.classList.remove('open');
});
document.getElementById('cal-apple').addEventListener('click',   () => { dlICS(); calDD.classList.remove('open'); });
document.getElementById('cal-outlook').addEventListener('click', () => { dlICS(); calDD.classList.remove('open'); });

/* ── 4. ÁLBUM — SUBIDA A GOOGLE DRIVE ─────────────────────── */
const photoInput   = document.getElementById('photo-input');
const uploadZone   = document.getElementById('upload-zone');
const uploadList   = document.getElementById('upload-list');
const galleryFrame = document.getElementById('gallery-frame');

uploadZone.addEventListener('dragover',  e => { e.preventDefault(); uploadZone.classList.add('drag'); });
uploadZone.addEventListener('dragleave', ()  => uploadZone.classList.remove('drag'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag');
  processFiles([...e.dataTransfer.files].filter(f => f.type.startsWith('image/')));
});
photoInput.addEventListener('change', () => {
  processFiles([...photoInput.files]);
  photoInput.value = '';
});
document.getElementById('gallery-reload').addEventListener('click', () => {
  const src = galleryFrame.src;
  galleryFrame.src = '';
  galleryFrame.src = src;
});

async function processFiles(files) {
  for (const file of files) {
    const item = addUploadItem(file.name);
    try {
      const b64 = await toBase64(file);
      // mode:'no-cors' evita errores CORS/502 con Google Apps Script
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          type: 'photo',
          filename: file.name.replace(/\.[^.]+$/, '.jpg'),
          mimeType: 'image/jpeg',
          data: b64
        })
      });
      setUploadStatus(item, 'ok', '✓ Subida');
    } catch (err) {
      setUploadStatus(item, 'err', 'Sin conexión. Intenta de nuevo.');
    }
  }
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1600;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else       { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82).split(',')[1]);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function addUploadItem(name) {
  const div = document.createElement('div');
  div.className = 'up-item';
  div.innerHTML = `<span class="up-name">${name}</span><span class="up-status loading">Subiendo…</span>`;
  uploadList.appendChild(div);
  uploadList.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return div;
}

function setUploadStatus(item, type, text) {
  const s = item.querySelector('.up-status');
  s.textContent = text;
  s.className   = 'up-status ' + type;
}

/* ── 5. RSVP — GOOGLE SHEETS ───────────────────────────────── */
const form    = document.getElementById('rsvp-form');
const formMsg = document.getElementById('form-msg');
const submit  = document.getElementById('rsvp-submit');

form.addEventListener('submit', async e => {
  e.preventDefault();
  const attend = form.querySelector('input[name=attend]:checked')?.value;
  const name   = document.getElementById('rsvp-name').value.trim();
  if (!attend) { showFormMsg('Selecciona si asistirás.', 'err'); return; }
  if (!name)   { showFormMsg('Por favor escribe tu nombre.', 'err'); return; }

  submit.disabled = true;
  submit.textContent = 'Enviando...';
  try {
    // mode:'no-cors' evita CORS/502 con Google Apps Script
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        attend, name,
        count: document.getElementById('rsvp-count').value,
        msg:   document.getElementById('rsvp-msg').value.trim(),
        song:  document.getElementById('rsvp-song').value.trim()
      })
    });
    submit.textContent = '¡Enviado! ♡';
    const msgs = {
      ambos:     `¡Gracias ${name}! Te esperamos en la parroquia y en el Club El Prado.`,
      ceremonia: `¡Gracias ${name}! Te esperamos en la Parroquia San Joaquín y Santa Ana.`,
      recepcion: `¡Gracias ${name}! Te esperamos en el Club El Prado, La Ceja.`,
      no:        `Gracias ${name} por avisarnos. ¡Los extrañaremos!`,
    };
    showFormMsg(msgs[attend] ?? `¡Gracias ${name}! Te esperamos con alegría.`, 'ok');
    form.reset();
  } catch {
    submit.disabled = false;
    submit.textContent = 'Confirmar';
    showFormMsg('Sin conexión. Intenta de nuevo.', 'err');
  }
});

function showFormMsg(text, type) {
  formMsg.textContent = text;
  formMsg.className   = 'form-msg ' + type;
}

/* ── 6. COPIAR DATOS BANCARIOS ─────────────────────────────── */
const copyBtn = document.getElementById('copy-bank');
if (copyBtn) {
  copyBtn.addEventListener('click', () => {
    const datos = 'Banco: Bancolombia\nCuenta: 000-000000-00\nNombre: Erica & Emilio';
    navigator.clipboard?.writeText(datos).then(() => {
      const orig = copyBtn.textContent;
      copyBtn.textContent = '¡Copiado!';
      setTimeout(() => { copyBtn.textContent = orig; }, 2000);
    });
  });
}

/* ── 7. REVEAL AL HACER SCROLL ─────────────────────────────── */
const io = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('active'); io.unobserve(en.target); }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* ── 8. PARALLAX ───────────────────────────────────────────── */
window.addEventListener('scroll', () => {
  const s = window.pageYOffset;
  document.querySelector('.watercolor-1').style.transform = `translateY(${s * .08}px)`;
  document.querySelector('.watercolor-2').style.transform = `translateY(${s * .05}px)`;
}, { passive: true });

/* ── 9. LOADER ─────────────────────────────────────────────── */
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('loader');
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 1000);
  }, 1500);
});

document.addEventListener('DOMContentLoaded', () => {
  const btnTransferencia = document.getElementById('btn-transferencia');
  const modalTransferencia = document.getElementById('modal-transferencia');
  const closeModal = document.getElementById('close-modal');

  // Verifica que los elementos existan antes de añadir eventos
  if (btnTransferencia && modalTransferencia && closeModal) {
    
    // Abrir el modal
    btnTransferencia.addEventListener('click', (e) => {
      e.preventDefault(); // Evita que la página salte hacia arriba
      modalTransferencia.classList.add('active');
    });

    // Cerrar el modal con la X
    closeModal.addEventListener('click', () => {
      modalTransferencia.classList.remove('active');
    });

    // Cerrar el modal al hacer clic en el fondo oscuro
    window.addEventListener('click', (e) => {
      if (e.target === modalTransferencia) {
        modalTransferencia.classList.remove('active');
      }
    });
  }
});