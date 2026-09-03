(() => {
  const cfg = window.CLINIC_CONFIG || {};
  const isLive = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.DEMO_MODE);
  const supabaseClient = isLive ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  const seed = {
    settings: {
      clinic_name: 'Dr. Aarogya Clinic', doctor_name: 'Dr. Ananya Rao', qualification: 'MBBS, MD • General Medicine',
      hero_intro: 'Consult Dr. Ananya Rao for thoughtful, evidence-informed care. Request an appointment online, explore clinic facilities and read practical health education articles.',
      doctor_bio: 'Dr. Ananya Rao focuses on preventive care, common adult health concerns and long-term condition management. The clinic is designed around clear explanations, appropriate follow-up and respectful patient experience.',
      experience: '12+ years', consultation_mode: 'In-clinic', next_availability: 'Today',
      address: 'Road No. 12, Banjara Hills, Hyderabad', phone: '+91 90000 00000', email: 'clinic@example.com',
      clinic_hours: 'Mon–Sat: 9 AM–12 PM & 5 PM–8 PM'
    },
    services: [
      {id:1, icon:'🩺', title:'General Consultation', description:'Evaluation and treatment planning for common adult health concerns.', active:true, display_order:1},
      {id:2, icon:'❤️', title:'Preventive Health', description:'Risk assessment, screening guidance and practical preventive-care planning.', active:true, display_order:2},
      {id:3, icon:'📈', title:'Chronic Care Follow-up', description:'Structured follow-up for long-term conditions and treatment adherence.', active:true, display_order:3},
      {id:4, icon:'🧪', title:'Report Review', description:'Clinical interpretation of previously ordered routine laboratory reports.', active:true, display_order:4},
      {id:5, icon:'💉', title:'Vaccination Guidance', description:'Age-appropriate vaccination counselling and scheduling guidance.', active:true, display_order:5},
      {id:6, icon:'🌿', title:'Lifestyle Counselling', description:'Simple, sustainable conversations around sleep, activity and nutrition habits.', active:true, display_order:6}
    ],
    facilities: [
      {id:1, icon:'🪑', title:'Comfortable Waiting Area', description:'A clean, organised waiting area designed for a smoother clinic visit.', active:true, display_order:1},
      {id:2, icon:'🧴', title:'Hygiene Protocols', description:'Routine surface hygiene and hand-sanitisation facilities for patients.', active:true, display_order:2},
      {id:3, icon:'🧾', title:'Digital Appointment Log', description:'Appointment requests are visible to clinic staff in one admin dashboard.', active:true, display_order:3}
    ],
    articles: [
      {id:1, title:'Blood pressure: what the numbers actually mean', category:'Preventive care', excerpt:'A simple guide to systolic and diastolic readings, home monitoring and when to seek medical advice.', content:'<p>Blood pressure is written as two numbers. The upper number is the pressure when the heart contracts; the lower number is the pressure between beats.</p><p>A single reading does not always tell the whole story. Clinicians often look at repeated measurements, the way they were taken and your wider health context.</p><p>If you are monitoring at home, sit quietly before measuring, keep your arm supported and use a validated cuff that fits properly. Discuss consistently abnormal readings with a qualified clinician.</p><p><strong>Important:</strong> sudden severe symptoms such as chest pain, severe breathlessness, fainting or neurological symptoms require urgent medical attention.</p>', published:true, published_at:'2026-08-15'},
      {id:2, title:'How to prepare for a routine doctor visit', category:'Clinic guide', excerpt:'Five practical steps that can make a short consultation more useful for both patient and doctor.', content:'<p>Bring a concise list of your current medicines, allergies and the key question you want answered. If you have recent test reports, keep them organised by date.</p><p>For recurring symptoms, note when they started, what makes them better or worse, and whether they affect sleep, work or daily activity.</p><p>A focused summary helps the clinician spend more time understanding and discussing the plan.</p>', published:true, published_at:'2026-08-22'},
      {id:3, title:'Preventive health is more than an annual test package', category:'Prevention', excerpt:'Why prevention usually combines risk assessment, vaccines, screening, lifestyle and appropriate follow-up.', content:'<p>Good preventive care is personalised. Screening tests are useful when they match your age, health history and risk factors.</p><p>Vaccinations, tobacco avoidance, sleep, movement, nutrition, mental wellbeing and timely follow-up all contribute to prevention.</p><p>Ask your clinician which screening and preventive steps are actually relevant for you rather than assuming that more tests are always better.</p>', published:true, published_at:'2026-08-29'}
    ]
  };

  const $ = (id) => document.getElementById(id);
  const safe = (value) => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function demoGet(key, fallback) {
    const raw = localStorage.getItem(`clinic_${key}`);
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  }
  function demoSet(key, value) { localStorage.setItem(`clinic_${key}`, JSON.stringify(value)); }

  async function fetchData() {
    if (!isLive) return {
      settings: demoGet('settings', seed.settings),
      services: demoGet('services', seed.services),
      facilities: demoGet('facilities', seed.facilities),
      articles: demoGet('articles', seed.articles)
    };
    const [settingsRes, servicesRes, facilitiesRes, articlesRes] = await Promise.all([
      supabaseClient.from('site_settings').select('*').eq('id', 1).single(),
      supabaseClient.from('services').select('*').eq('active', true).order('display_order'),
      supabaseClient.from('facilities').select('*').eq('active', true).order('display_order'),
      supabaseClient.from('articles').select('*').eq('published', true).order('published_at', {ascending:false})
    ]);
    if (settingsRes.error) throw settingsRes.error;
    return { settings: settingsRes.data, services: servicesRes.data || [], facilities: facilitiesRes.data || [], articles: articlesRes.data || [] };
  }

  function applySettings(s) {
    $('brandClinicName').textContent = s.clinic_name;
    $('footerClinicName').textContent = s.clinic_name;
    $('copyrightClinic').textContent = s.clinic_name;
    $('doctorName').textContent = s.doctor_name;
    $('doctorQualification').textContent = s.qualification;
    $('heroIntro').textContent = s.hero_intro;
    $('doctorBio').textContent = s.doctor_bio;
    $('experienceYears').textContent = s.experience;
    $('consultationMode').textContent = s.consultation_mode;
    $('nextAvailability').textContent = s.next_availability;
    $('clinicAddress').textContent = s.address;
    $('clinicPhone').textContent = s.phone;
    $('clinicEmail').textContent = s.email;
    $('clinicHours').textContent = s.clinic_hours;
    document.title = `${s.clinic_name} | Appointments & Health Education`;
  }

  function renderCards(target, rows, type) {
    const el = $(target);
    const activeRows = (rows || []).filter(x => x.active !== false).sort((a,b)=>(a.display_order||0)-(b.display_order||0));
    el.innerHTML = activeRows.length ? activeRows.map(row => `
      <article class="card">
        <div class="${type}-icon">${safe(row.icon || '✚')}</div>
        <h3>${safe(row.title)}</h3>
        <p>${safe(row.description)}</p>
      </article>`).join('') : '<div class="empty">No items published yet.</div>';
  }

  function renderArticles(rows) {
    const published = (rows || []).filter(a => a.published !== false);
    const el = $('articlesGrid');
    el.innerHTML = published.length ? published.map(a => `
      <article class="card article-card">
        <div class="article-cover"><span class="article-category">${safe(a.category || 'Health')}</span></div>
        <div class="article-body">
          <h3>${safe(a.title)}</h3>
          <p>${safe(a.excerpt)}</p>
          <button class="btn btn-soft btn-sm article-open" data-id="${safe(a.id)}">Read article →</button>
        </div>
      </article>`).join('') : '<div class="empty">No health articles published yet.</div>';
    el.querySelectorAll('.article-open').forEach(btn => btn.addEventListener('click', () => {
      const article = published.find(a => String(a.id) === String(btn.dataset.id));
      if (!article) return;
      $('modalCategory').textContent = article.category || 'Health';
      $('modalTitle').textContent = article.title;
      $('modalContent').innerHTML = article.content || `<p>${safe(article.excerpt)}</p>`;
      $('articleModal').classList.remove('hidden');
    }));
  }

  async function submitAppointment(e) {
    e.preventDefault();
    const notice = $('appointmentNotice');
    const payload = {
      patient_name: $('patientName').value.trim(), phone: $('phone').value.trim(), email: $('email').value.trim() || null,
      appointment_date: $('appointmentDate').value, preferred_slot: $('slot').value, status: 'pending', created_at: new Date().toISOString()
    };
    notice.className = 'notice notice-info'; notice.textContent = 'Submitting your request…';
    try {
      if (isLive) {
        const { error } = await supabaseClient.from('appointments').insert(payload);
        if (error) throw error;
      } else {
        const rows = demoGet('appointments', []);
        rows.unshift({...payload, id: crypto.randomUUID ? crypto.randomUUID() : Date.now()});
        demoSet('appointments', rows);
      }
      e.target.reset();
      notice.className = 'notice notice-success';
      notice.textContent = isLive ? 'Appointment request received. The clinic can now review it from the admin dashboard.' : 'Demo appointment saved in this browser. Connect Supabase to make bookings live across devices.';
    } catch (err) {
      console.error(err);
      notice.className = 'notice notice-error'; notice.textContent = 'Could not submit the appointment. Please contact the clinic directly.';
    }
  }

  async function init() {
    $('year').textContent = new Date().getFullYear();
    const dateInput = $('appointmentDate');
    const today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    dateInput.min = today.toISOString().split('T')[0];
    $('navToggle').addEventListener('click', () => $('navLinks').classList.toggle('open'));
    $('navLinks').querySelectorAll('a').forEach(a => a.addEventListener('click', () => $('navLinks').classList.remove('open')));
    $('appointmentForm').addEventListener('submit', submitAppointment);
    $('modalClose').addEventListener('click', () => $('articleModal').classList.add('hidden'));
    $('articleModal').addEventListener('click', e => { if (e.target === $('articleModal')) $('articleModal').classList.add('hidden'); });
    try {
      const data = await fetchData();
      applySettings(data.settings);
      renderCards('servicesGrid', data.services, 'service');
      renderCards('facilitiesGrid', data.facilities, 'facility');
      renderArticles(data.articles);
    } catch (err) {
      console.error('Clinic data load failed', err);
      applySettings(seed.settings); renderCards('servicesGrid', seed.services, 'service'); renderCards('facilitiesGrid', seed.facilities, 'facility'); renderArticles(seed.articles);
    }
  }
  init();
})();
