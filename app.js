(() => {
  const cfg = window.CLINIC_CONFIG || {};
  const hasSupabaseSdk = Boolean(window.supabase && typeof window.supabase.createClient === 'function');
  const isLive = Boolean(hasSupabaseSdk && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.DEMO_MODE);
  const supabaseClient = isLive ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  const $ = id => document.getElementById(id);
  const safe = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const demoGet = (key, fallback) => { try { return JSON.parse(localStorage.getItem(`clinic_${key}`)) ?? fallback; } catch { return fallback; } };
  let currentSettings = null;

  const seed = {
    settings: {
      clinic_name:'Dr. S. Kaushik Anurag', doctor_name:'Dr. S. Kaushik Anurag', qualification:'Professional details managed from the admin dashboard',
      hero_intro:'Request an appointment with Dr. S. Kaushik Anurag, review consultation information and access medical learning resources.',
      doctor_bio:'Dr. S. Kaushik Anurag provides appointment-based consultations with an emphasis on clear communication, appropriate follow-up and a respectful patient experience.',
      experience:'Doctor profile', consultation_mode:'Appointment-based', next_availability:'Check slots',
      address:'', phone:'+91 90000 00000', whatsapp:'+91 90000 00000', email:'clinic@example.com', clinic_hours:'Mon–Sat: sample hours',
      venue_note:'Consultation venue details are shared after appointment confirmation.'
    },
    services:[{id:1,icon:'🩺',title:'General Consultation',description:'Sample consultation service for prototype use.',active:true,display_order:1}],
    facilities:[{id:1,icon:'📅',title:'Appointment-based consultation',description:'Choose a live available slot online.',active:true,display_order:1},{id:2,icon:'📍',title:'Venue after confirmation',description:'Consultation location and instructions are shared after review.',active:true,display_order:2},{id:3,icon:'💬',title:'Direct contact',description:'Call or WhatsApp for appointment-related questions.',active:true,display_order:3}],
    articles:[]
  };

  function digits(v){ return String(v||'').replace(/\D/g,''); }
  function tel(v){ const raw=String(v||'').trim(); return raw ? `tel:${raw.replace(/\s/g,'')}` : '#'; }
  function wa(v,msg=''){ const n=digits(v); return n ? `https://wa.me/${n}${msg?`?text=${encodeURIComponent(msg)}`:''}` : '#'; }
  function prettyDate(v){ if(!v)return '—'; return new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric'}).format(new Date(`${v}T00:00:00`)); }

  async function fetchData(){
    if(!isLive) return {settings:demoGet('settings',seed.settings),services:demoGet('services',seed.services),facilities:demoGet('facilities',seed.facilities),articles:demoGet('articles',seed.articles)};
    const [s,sv,f,a]=await Promise.all([
      supabaseClient.from('site_settings').select('*').eq('id',1).single(),
      supabaseClient.from('services').select('*').eq('active',true).order('display_order'),
      supabaseClient.from('facilities').select('*').eq('active',true).order('display_order'),
      supabaseClient.from('articles').select('*').eq('published',true).order('published_at',{ascending:false})
    ]);
    if(s.error) throw s.error;
    return {settings:s.data,services:sv.data||[],facilities:f.data||[],articles:a.data||[]};
  }

  function applySettings(s){
    s={...seed.settings,...(s||{})}; currentSettings=s;
    $('brandClinicName').textContent=s.clinic_name; $('footerClinicName').textContent=s.clinic_name; $('copyrightClinic').textContent=s.clinic_name;
    $('doctorName').textContent=s.doctor_name; $('doctorQualification').textContent=s.qualification; $('heroIntro').textContent=s.hero_intro; $('doctorBio').textContent=s.doctor_bio;
    $('experienceYears').textContent=s.experience; $('consultationMode').textContent=s.consultation_mode; $('nextAvailability').textContent=s.next_availability;
    $('venueNote').textContent=s.venue_note||seed.settings.venue_note; $('clinicPhone').textContent=s.phone||'—'; $('clinicWhatsapp').textContent=s.whatsapp||s.phone||'—'; $('clinicEmail').textContent=s.email||'—'; $('clinicHours').textContent=s.clinic_hours||'By appointment';
    const callHref=tel(s.phone), whatsappHref=wa(s.whatsapp||s.phone,'Hello, I have a question about an appointment.');
    ['callBtn','mobileCallBtn','clinicPhoneLink'].forEach(id=>{if($(id))$(id).href=callHref;});
    ['whatsappBtn','mobileWhatsappBtn','clinicWhatsappLink'].forEach(id=>{if($(id))$(id).href=whatsappHref;});
    document.title=`${s.clinic_name} | Appointments & Health Education`;
  }

  function renderCards(target,rows,type){const active=(rows||[]).filter(x=>x.active!==false).sort((a,b)=>(a.display_order||0)-(b.display_order||0));$(target).innerHTML=active.length?active.map(r=>`<article class="card"><div class="${type}-icon">${safe(r.icon||'✚')}</div><h3>${safe(r.title)}</h3><p>${safe(r.description)}</p></article>`).join(''):'<div class="empty">No items published yet.</div>';}
  function renderArticles(rows){const published=(rows||[]).filter(a=>a.published!==false),el=$('articlesGrid');el.innerHTML=published.length?published.map(a=>`<article class="card article-card"><div class="article-cover"><span class="article-category">${safe(a.category||'Health')}</span></div><div class="article-body"><h3>${safe(a.title)}</h3><p>${safe(a.excerpt)}</p><button class="btn btn-soft btn-sm article-open" data-id="${safe(a.id)}">Read article →</button></div></article>`).join(''):'<div class="empty">No health articles published yet.</div>';el.querySelectorAll('.article-open').forEach(btn=>btn.onclick=()=>{const a=published.find(x=>String(x.id)===String(btn.dataset.id));if(!a)return;$('modalCategory').textContent=a.category||'Health';$('modalTitle').textContent=a.title;$('modalContent').innerHTML=a.content||`<p>${safe(a.excerpt)}</p>`;$('articleModal').classList.remove('hidden');});}

  async function loadBookingRules(){const date=$('appointmentDate');const today=new Date();today.setMinutes(today.getMinutes()-today.getTimezoneOffset());date.min=today.toISOString().split('T')[0];let days=30;if(isLive){const {data,error}=await supabaseClient.rpc('get_booking_rules');if(!error&&data?.length)days=Number(data[0].booking_window_days||30);}const max=new Date(today);max.setDate(max.getDate()+days);date.max=max.toISOString().split('T')[0];}
  function demoSlots(dateStr){if(!dateStr)return[];const d=new Date(`${dateStr}T00:00:00`);if(d.getDay()===0)return[];return ['09:00','09:20','09:40','10:00','10:20','10:40','11:00','11:20','11:40','17:00','17:20','17:40','18:00','18:20','18:40','19:00','19:20','19:40'];}
  async function loadSlots(){const date=$('appointmentDate').value,slot=$('slot'),help=$('slotHelp');slot.disabled=true;slot.innerHTML='<option value="">Loading available times…</option>';help.textContent='Checking the live schedule…';if(!date){slot.innerHTML='<option value="">Select a date first</option>';help.textContent='Times are generated from the doctor\'s live availability and existing bookings.';return;}try{let slots;if(isLive){const {data,error}=await supabaseClient.rpc('get_available_slots',{p_date:date});if(error)throw error;slots=(data||[]).map(x=>x.slot);}else slots=demoSlots(date);if(!slots.length){slot.innerHTML='<option value="">No appointment slots available</option>';help.textContent='Try another date. The doctor may be unavailable or fully booked.';return;}slot.innerHTML='<option value="">Choose an available time</option>'+slots.map(s=>`<option value="${safe(s)}">${safe(s)}</option>`).join('');slot.disabled=false;help.textContent=`${slots.length} slot${slots.length===1?'':'s'} currently available.`;}catch(err){console.error(err);slot.innerHTML='<option value="">Unable to load slots</option>';help.textContent='Please try again or contact the doctor.';}}

  function showConfirmation(id,snapshot){
    const ref=String(id||Date.now()).replace(/-/g,'').slice(0,8).toUpperCase();
    $('confirmRef').textContent=ref; $('confirmDate').textContent=prettyDate(snapshot.date); $('confirmTime').textContent=snapshot.slot; $('confirmVenue').textContent=currentSettings?.venue_note||seed.settings.venue_note;
    const message=`Hello, I submitted appointment request ${ref} for ${prettyDate(snapshot.date)} at ${snapshot.slot}.`;
    $('confirmWhatsapp').href=wa(currentSettings?.whatsapp||currentSettings?.phone,message); $('confirmCall').href=tel(currentSettings?.phone);
    $('bookingModal').classList.remove('hidden');
  }

  async function submitAppointment(e){
    e.preventDefault(); const notice=$('appointmentNotice');
    if($('website').value){ notice.className='notice notice-success'; notice.textContent='Appointment request received.'; return; }
    if(!$('privacyConsent').checked){ notice.className='notice notice-error'; notice.textContent='Please accept the privacy consent before submitting.'; return; }
    const snapshot={name:$('patientName').value.trim(),phone:$('phone').value.trim(),email:$('email').value.trim()||null,date:$('appointmentDate').value,slot:$('slot').value};
    const args={p_patient_name:snapshot.name,p_phone:snapshot.phone,p_email:snapshot.email,p_date:snapshot.date,p_slot:snapshot.slot,p_privacy_consent:true};
    notice.className='notice notice-info';notice.textContent='Securing your appointment slot…';
    try{
      let bookingId;
      if(isLive){const {data,error}=await supabaseClient.rpc('book_appointment',args);if(error)throw error;bookingId=data;}
      else{bookingId=crypto.randomUUID?crypto.randomUUID():String(Date.now());const rows=demoGet('appointments',[]);rows.unshift({id:bookingId,patient_name:snapshot.name,phone:snapshot.phone,email:snapshot.email,appointment_date:snapshot.date,preferred_slot:snapshot.slot,status:'pending',privacy_consent_at:new Date().toISOString(),created_at:new Date().toISOString()});localStorage.setItem('clinic_appointments',JSON.stringify(rows));}
      e.target.reset();$('slot').disabled=true;$('slot').innerHTML='<option value="">Select a date first</option>';$('slotHelp').textContent='Times are generated from the doctor\'s live availability and existing bookings.';
      notice.className='notice notice-success';notice.textContent='Appointment request received. Your selected slot is reserved pending review.';showConfirmation(bookingId,snapshot);
    }catch(err){console.error(err);const m=(err.message||'').toLowerCase();notice.className='notice notice-error';notice.textContent=m.includes('too many')?'Too many recent booking requests from this phone number. Please contact the doctor directly.':m.includes('slot')?'That slot is no longer available. Please choose another time.':m.includes('consent')?'Privacy consent is required.':'Could not submit the appointment. Please try again or contact the doctor.';await loadSlots();}
  }

  async function init(){
    $('year').textContent=new Date().getFullYear();$('navToggle').onclick=()=>$('navLinks').classList.toggle('open');$('navLinks').querySelectorAll('a').forEach(a=>a.onclick=()=>$('navLinks').classList.remove('open'));
    $('appointmentForm').addEventListener('submit',submitAppointment);$('appointmentDate').addEventListener('change',loadSlots);$('bookingClose').onclick=()=>$('bookingModal').classList.add('hidden');$('bookingModal').onclick=e=>{if(e.target===$('bookingModal'))$('bookingModal').classList.add('hidden');};
    $('modalClose').onclick=()=>$('articleModal').classList.add('hidden');$('articleModal').onclick=e=>{if(e.target===$('articleModal'))$('articleModal').classList.add('hidden');};
    await loadBookingRules();
    try{const data=await fetchData();applySettings(data.settings);renderCards('servicesGrid',data.services,'service');renderCards('facilitiesGrid',data.facilities,'facility');renderArticles(data.articles);}catch(err){console.error('Doctor website data load failed',err);applySettings(seed.settings);renderCards('servicesGrid',seed.services,'service');renderCards('facilitiesGrid',seed.facilities,'facility');renderArticles(seed.articles);}
  }
  init();
})();
