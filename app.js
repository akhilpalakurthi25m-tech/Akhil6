(() => {
  const cfg = window.CLINIC_CONFIG || {};
  const isLive = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.DEMO_MODE);
  const supabaseClient = isLive ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  const profile = window.DOCTOR_PROFILE;
  const seed = {settings:profile.settings, services:profile.services, facilities:profile.facilities, articles:[]};
  let currentSettings = profile.settings;

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
    currentSettings = s;
    $('brandClinicName').textContent=s.clinic_name; $('footerClinicName').textContent=s.clinic_name; $('copyrightClinic').textContent=s.clinic_name;
    $('doctorName').textContent=s.doctor_name; $('doctorQualification').textContent=s.qualification; $('heroIntro').textContent=s.hero_intro; $('doctorBio').textContent=s.doctor_bio;
    $('experienceYears').textContent=s.experience; $('consultationMode').textContent=s.consultation_mode; $('nextAvailability').textContent=s.next_availability;
    $('clinicAddress').textContent=s.address; $('clinicPhone').textContent=s.phone; $('clinicEmail').textContent=s.email; $('clinicHours').textContent=s.clinic_hours;
    const phone = String(s.phone || '').replace(/[^+0-9]/g, '');
    const digits = phone.replace(/\D/g, '');
    const whatsappNumber = digits.length === 10 ? `91${digits}` : digits;
    ['callBtn','mobileCallBtn','clinicPhoneLink'].forEach(id => $(id).href = `tel:${phone}`);
    ['whatsappBtn','mobileWhatsappBtn'].forEach(id => $(id).href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hello ${s.doctor_name}, I have a question about a video consultation.`)}`);
    $('clinicEmailLink').href = `mailto:${s.email}`;
    document.title=`${s.clinic_name}, MBBS | Video Consultations`;
    document.querySelector('meta[name="description"]').content = s.hero_intro;
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
    slot.disabled=true; slot.innerHTML='<option value="">Loading available times…</option>'; help.textContent='Checking the live consultation schedule…';
    if(!date){slot.innerHTML='<option value="">Select a date first</option>';help.textContent='Times are generated from the doctor\'s live availability and existing bookings.';return;}
    try{
      let slots;
      if(isLive){ const {data,error}=await supabaseClient.rpc('get_available_slots',{p_date:date}); if(error)throw error; slots=(data||[]).map(x=>x.slot); }
      else slots=demoSlots(date);
      if(!slots.length){slot.innerHTML='<option value="">No appointment slots available</option>';help.textContent='Try another date. The doctor may be unavailable or fully booked.';return;}
      slot.innerHTML='<option value="">Choose an available time</option>'+slots.map(s=>`<option value="${safe(s)}">${safe(s)}</option>`).join(''); slot.disabled=false; help.textContent=`${slots.length} slot${slots.length===1?'':'s'} currently available.`;
    }catch(err){console.error(err);slot.innerHTML='<option value="">Unable to load slots</option>';help.textContent='Please try again or contact the doctor.';}
  }

  async function submitAppointment(e){
    e.preventDefault(); const notice=$('appointmentNotice');
    const args={p_patient_name:$('patientName').value.trim(),p_phone:$('phone').value.trim(),p_email:$('email').value.trim()||null,p_date:$('appointmentDate').value,p_slot:$('slot').value};
    notice.className='notice notice-info'; notice.textContent='Securing your appointment slot…';
    const submitButton=e.target.querySelector('button[type="submit"]');
    submitButton.disabled=true;
    try{
      let bookingId;
      if(isLive){const {data,error}=await supabaseClient.rpc('book_appointment',args); if(error)throw error; bookingId=data;}
      else { const rows=demoGet('appointments',[]); rows.unshift({id:Date.now(),patient_name:args.p_patient_name,phone:args.p_phone,email:args.p_email,appointment_date:args.p_date,preferred_slot:args.p_slot,status:'pending',created_at:new Date().toISOString()}); localStorage.setItem('clinic_appointments',JSON.stringify(rows)); }
      e.target.reset(); $('slot').disabled=true; $('slot').innerHTML='<option value="">Select a date first</option>';
      notice.className='notice notice-success';
      const dateLabel=new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric'}).format(new Date(`${args.p_date}T00:00:00`));
      const reference=typeof bookingId==='string'?bookingId.replace(/-/g,'').slice(0,8).toUpperCase():'';
      const message=`Hello, I submitted a video consultation request${reference?` (reference ${reference})`:''} for ${dateLabel} at ${args.p_slot}.`;
      const phone=String(currentSettings.phone||'').replace(/\D/g,'');
      const whatsappNumber=phone.length===10?`91${phone}`:phone;
      notice.innerHTML=isLive?`<strong>Video consultation request received.</strong><p>Your slot for ${safe(dateLabel)} at ${safe(args.p_slot)} is reserved, pending the doctor's confirmation.</p>${reference?`<p>Booking reference: <strong>${safe(reference)}</strong></p>`:''}<p>Video joining details will be shared after confirmation.</p><a class="btn btn-outline btn-sm" href="https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}" target="_blank" rel="noopener">Follow up on WhatsApp</a>`:'Demo appointment saved in this browser. No appointment has been sent to the doctor.';
    }catch(err){console.error(err); notice.className='notice notice-error'; notice.textContent=(err.message||'').toLowerCase().includes('slot')?'That slot is no longer available. Please choose another time.':'Could not submit the appointment. Please try again or contact the doctor.'; await loadSlots();}finally{submitButton.disabled=false;}
  }

  async function init(){
    $('year').textContent=new Date().getFullYear(); $('navToggle').onclick=()=>{const open=$('navLinks').classList.toggle('open');$('navToggle').setAttribute('aria-expanded',String(open));}; $('navLinks').querySelectorAll('a').forEach(a=>a.onclick=()=>{$('navLinks').classList.remove('open');$('navToggle').setAttribute('aria-expanded','false');});
    $('appointmentForm').addEventListener('submit',submitAppointment); $('appointmentDate').addEventListener('change',loadSlots);
    $('modalClose').onclick=()=>$('articleModal').classList.add('hidden'); $('articleModal').onclick=e=>{if(e.target===$('articleModal'))$('articleModal').classList.add('hidden');};
    applySettings(seed.settings);renderCards('servicesGrid',seed.services,'service');renderCards('facilitiesGrid',seed.facilities,'facility');
    await loadBookingRules().catch(error=>console.error('Availability rules could not load',error));
    try{const data=profile.resolve(await fetchData());applySettings(data.settings);renderCards('servicesGrid',data.services,'service');renderCards('facilitiesGrid',data.facilities,'facility');renderArticles(data.articles);}catch(err){console.error('Clinic data load failed',err);applySettings(seed.settings);renderCards('servicesGrid',seed.services,'service');renderCards('facilitiesGrid',seed.facilities,'facility');renderArticles(seed.articles);}
  }
  init();
})();
