(() => {
  const cfg = window.CLINIC_CONFIG || {};
  const isLive = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.DEMO_MODE);
  const supabaseClient = isLive ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  const seed = {
    settings: {
      clinic_name: 'Clinic Website Prototype', doctor_name: 'Demo Doctor Profile', qualification: 'MBBS, MD – General Medicine (Placeholder)',
      hero_intro: 'Prototype clinic website with online appointment scheduling, facilities and educational health content.',
      doctor_bio: 'This is placeholder profile content for development. Replace it with the verified doctor biography before public launch.',
      experience: 'Sample profile', consultation_mode: 'In-clinic', next_availability: 'Testing only',
      address: 'Placeholder – Hyderabad', phone: '+91 90000 00000', email: 'clinic@example.com',
      clinic_hours: 'Mon–Sat: sample hours'
    },
    services: [
      {id:1, icon:'🩺', title:'General Consultation', description:'Evaluation and treatment planning for common adult health concerns.', active:true, display_order:1},
      {id:2, icon:'❤️', title:'Preventive Health', description:'Risk assessment, screening guidance and practical preventive-care planning.', active:true, display_order:2}
    ],
    facilities: [{id:1,icon:'🪑',title:'Comfortable Waiting Area',description:'Sample facility description.',active:true,display_order:1}],
    articles: []
  };

  const $ = id => document.getElementById(id);
  const safe = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const demoGet = (key, fallback) => { try { return JSON.parse(localStorage.getItem(`clinic_${key}`)) ?? fallback; } catch { return fallback; } };

  async function fetchData() {
    if (!isLive) return { settings: demoGet('settings', seed.settings), services: demoGet('services', seed.services), facilities: demoGet('facilities', seed.facilities), articles: demoGet('articles', seed.articles) };
    const [settingsRes, servicesRes, facilitiesRes, articlesRes] = await Promise.all([
      supabaseClient.from('site_settings').select('*').eq('id',1).single(),
      supabaseClient.from('services').select('*').eq('active',true).order('display_order'),
      supabaseClient.from('facilities').select('*').eq('active',true).order('display_order'),
      supabaseClient.from('articles').select('*').eq('published',true).order('published_at',{ascending:false})
    ]);
    if (settingsRes.error) throw settingsRes.error;
    return {settings:settingsRes.data, services:servicesRes.data||[], facilities:facilitiesRes.data||[], articles:articlesRes.data||[]};
  }

  function applySettings(s) {
    $('brandClinicName').textContent=s.clinic_name; $('footerClinicName').textContent=s.clinic_name; $('copyrightClinic').textContent=s.clinic_name;
    $('doctorName').textContent=s.doctor_name; $('doctorQualification').textContent=s.qualification; $('heroIntro').textContent=s.hero_intro; $('doctorBio').textContent=s.doctor_bio;
    $('experienceYears').textContent=s.experience; $('consultationMode').textContent=s.consultation_mode; $('nextAvailability').textContent=s.next_availability;
    $('clinicAddress').textContent=s.address; $('clinicPhone').textContent=s.phone; $('clinicEmail').textContent=s.email; $('clinicHours').textContent=s.clinic_hours;
    document.title=`${s.clinic_name} | Appointments & Health Education`;
  }
  function renderCards(target, rows, type) {
    const active=(rows||[]).filter(x=>x.active!==false).sort((a,b)=>(a.display_order||0)-(b.display_order||0));
    $(target).innerHTML=active.length?active.map(r=>`<article class="card"><div class="${type}-icon">${safe(r.icon||'✚')}</div><h3>${safe(r.title)}</h3><p>${safe(r.description)}</p></article>`).join(''):'<div class="empty">No items published yet.</div>';
  }
  function renderArticles(rows) {
    const published=(rows||[]).filter(a=>a.published!==false); const el=$('articlesGrid');
    el.innerHTML=published.length?published.map(a=>`<article class="card article-card"><div class="article-cover"><span class="article-category">${safe(a.category||'Health')}</span></div><div class="article-body"><h3>${safe(a.title)}</h3><p>${safe(a.excerpt)}</p><button class="btn btn-soft btn-sm article-open" data-id="${safe(a.id)}">Read article →</button></div></article>`).join(''):'<div class="empty">No health articles published yet.</div>';
    el.querySelectorAll('.article-open').forEach(btn=>btn.onclick=()=>{const a=published.find(x=>String(x.id)===String(btn.dataset.id)); if(!a)return; $('modalCategory').textContent=a.category||'Health';$('modalTitle').textContent=a.title;$('modalContent').innerHTML=a.content||`<p>${safe(a.excerpt)}</p>`;$('articleModal').classList.remove('hidden');});
  }

  async function loadBookingRules() {
    const date=$('appointmentDate');
    const today=new Date(); today.setMinutes(today.getMinutes()-today.getTimezoneOffset());
    date.min=today.toISOString().split('T')[0];
    let days=30;
    if(isLive){ const {data,error}=await supabaseClient.rpc('get_booking_rules'); if(!error && data?.length) days=Number(data[0].booking_window_days||30); }
    const max=new Date(today); max.setDate(max.getDate()+days); date.max=max.toISOString().split('T')[0];
  }

  function demoSlots(dateStr){
    if(!dateStr)return[]; const d=new Date(`${dateStr}T00:00:00`); if(d.getDay()===0)return[];
    return ['09:00','09:20','09:40','10:00','10:20','10:40','11:00','11:20','11:40','17:00','17:20','17:40','18:00','18:20','18:40','19:00','19:20','19:40'];
  }
  async function loadSlots(){
    const date=$('appointmentDate').value, slot=$('slot'), help=$('slotHelp');
    slot.disabled=true; slot.innerHTML='<option value="">Loading available times…</option>'; help.textContent='Checking the live clinic schedule…';
    if(!date){slot.innerHTML='<option value="">Select a date first</option>';help.textContent='Times are generated from the doctor\'s live availability and existing bookings.';return;}
    try{
      let slots;
      if(isLive){ const {data,error}=await supabaseClient.rpc('get_available_slots',{p_date:date}); if(error)throw error; slots=(data||[]).map(x=>x.slot); }
      else slots=demoSlots(date);
      if(!slots.length){slot.innerHTML='<option value="">No appointment slots available</option>';help.textContent='Try another date. The clinic may be closed or fully booked.';return;}
      slot.innerHTML='<option value="">Choose an available time</option>'+slots.map(s=>`<option value="${safe(s)}">${safe(s)}</option>`).join(''); slot.disabled=false; help.textContent=`${slots.length} slot${slots.length===1?'':'s'} currently available.`;
    }catch(err){console.error(err);slot.innerHTML='<option value="">Unable to load slots</option>';help.textContent='Please try again or contact the clinic.';}
  }

  async function submitAppointment(e){
    e.preventDefault(); const notice=$('appointmentNotice');
    const args={p_patient_name:$('patientName').value.trim(),p_phone:$('phone').value.trim(),p_email:$('email').value.trim()||null,p_date:$('appointmentDate').value,p_slot:$('slot').value};
    notice.className='notice notice-info'; notice.textContent='Securing your appointment slot…';
    try{
      if(isLive){const {error}=await supabaseClient.rpc('book_appointment',args); if(error)throw error;}
      else { const rows=demoGet('appointments',[]); rows.unshift({id:Date.now(),patient_name:args.p_patient_name,phone:args.p_phone,email:args.p_email,appointment_date:args.p_date,preferred_slot:args.p_slot,status:'pending',created_at:new Date().toISOString()}); localStorage.setItem('clinic_appointments',JSON.stringify(rows)); }
      e.target.reset(); $('slot').disabled=true; $('slot').innerHTML='<option value="">Select a date first</option>';
      notice.className='notice notice-success'; notice.textContent=isLive?'Appointment request received and the selected slot is now reserved pending clinic confirmation.':'Prototype appointment saved in this browser.';
    }catch(err){console.error(err); notice.className='notice notice-error'; notice.textContent=(err.message||'').toLowerCase().includes('slot')?'That slot is no longer available. Please choose another time.':'Could not submit the appointment. Please try again or contact the clinic.'; await loadSlots();}
  }

  async function init(){
    $('year').textContent=new Date().getFullYear(); $('navToggle').onclick=()=>$('navLinks').classList.toggle('open'); $('navLinks').querySelectorAll('a').forEach(a=>a.onclick=()=>$('navLinks').classList.remove('open'));
    $('appointmentForm').addEventListener('submit',submitAppointment); $('appointmentDate').addEventListener('change',loadSlots);
    $('modalClose').onclick=()=>$('articleModal').classList.add('hidden'); $('articleModal').onclick=e=>{if(e.target===$('articleModal'))$('articleModal').classList.add('hidden');};
    await loadBookingRules();
    try{const data=await fetchData();applySettings(data.settings);renderCards('servicesGrid',data.services,'service');renderCards('facilitiesGrid',data.facilities,'facility');renderArticles(data.articles);}catch(err){console.error('Clinic data load failed',err);applySettings(seed.settings);renderCards('servicesGrid',seed.services,'service');renderCards('facilitiesGrid',seed.facilities,'facility');renderArticles(seed.articles);}
  }
  init();
})();
