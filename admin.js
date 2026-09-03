(() => {
  const cfg = window.CLINIC_CONFIG || {};
  const isLive = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.DEMO_MODE);
  const client = isLive ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  const $ = id => document.getElementById(id);
  const safe = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const seed = {
    settings:{clinic_name:'Dr. Aarogya Clinic',doctor_name:'Dr. Ananya Rao',qualification:'MBBS, MD • General Medicine',hero_intro:'Consult Dr. Ananya Rao for thoughtful, evidence-informed care. Request an appointment online, explore clinic facilities and read practical health education articles.',doctor_bio:'Dr. Ananya Rao focuses on preventive care, common adult health concerns and long-term condition management. The clinic is designed around clear explanations, appropriate follow-up and respectful patient experience.',experience:'12+ years',consultation_mode:'In-clinic',next_availability:'Today',address:'Road No. 12, Banjara Hills, Hyderabad',phone:'+91 90000 00000',email:'clinic@example.com',clinic_hours:'Mon–Sat: 9 AM–12 PM & 5 PM–8 PM'},
    services:[{id:1,icon:'🩺',title:'General Consultation',description:'Evaluation and treatment planning for common adult health concerns.',active:true,display_order:1},{id:2,icon:'❤️',title:'Preventive Health',description:'Risk assessment, screening guidance and practical preventive-care planning.',active:true,display_order:2},{id:3,icon:'📈',title:'Chronic Care Follow-up',description:'Structured follow-up for long-term conditions and treatment adherence.',active:true,display_order:3}],
    facilities:[{id:1,icon:'🪑',title:'Comfortable Waiting Area',description:'A clean, organised waiting area designed for a smoother clinic visit.',active:true,display_order:1},{id:2,icon:'🧴',title:'Hygiene Protocols',description:'Routine surface hygiene and hand-sanitisation facilities for patients.',active:true,display_order:2},{id:3,icon:'🧾',title:'Digital Appointment Log',description:'Appointment requests are visible to clinic staff in one admin dashboard.',active:true,display_order:3}],
    articles:[{id:1,title:'Blood pressure: what the numbers actually mean',category:'Preventive care',excerpt:'A simple guide to systolic and diastolic readings, home monitoring and when to seek medical advice.',content:'<p>Blood pressure is written as two numbers. The upper number is the pressure when the heart contracts; the lower number is the pressure between beats.</p><p>A single reading does not always tell the whole story.</p>',published:true,published_at:'2026-08-15'}]
  };
  const state = { settings:null, services:[], facilities:[], articles:[], appointments:[], editor:null };

  const demoGet = (key, fallback) => { try { return JSON.parse(localStorage.getItem(`clinic_${key}`)) ?? fallback; } catch { return fallback; } };
  const demoSet = (key, val) => localStorage.setItem(`clinic_${key}`, JSON.stringify(val));

  async function authInit() {
    if (!isLive) { $('demoBanner').classList.remove('hidden'); $('adminView').classList.remove('hidden'); await loadAll(); return; }
    const {data:{session}} = await client.auth.getSession();
    if (session) { $('adminView').classList.remove('hidden'); await loadAll(); }
    else $('loginView').classList.remove('hidden');
  }

  async function login(e) {
    e.preventDefault();
    const box = $('loginNotice'); box.className='notice notice-info'; box.textContent='Signing in…';
    const {error} = await client.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});
    if (error) { box.className='notice notice-error'; box.textContent=error.message; return; }
    $('loginView').classList.add('hidden'); $('adminView').classList.remove('hidden'); await loadAll();
  }

  async function loadAll() {
    if (!isLive) {
      state.settings=demoGet('settings',seed.settings); state.services=demoGet('services',seed.services); state.facilities=demoGet('facilities',seed.facilities); state.articles=demoGet('articles',seed.articles); state.appointments=demoGet('appointments',[]);
    } else {
      const [s,sv,f,a,ap] = await Promise.all([
        client.from('site_settings').select('*').eq('id',1).single(),
        client.from('services').select('*').order('display_order'),
        client.from('facilities').select('*').order('display_order'),
        client.from('articles').select('*').order('published_at',{ascending:false}),
        client.from('appointments').select('*').order('created_at',{ascending:false})
      ]);
      const error = [s,sv,f,a,ap].find(x=>x.error)?.error; if (error) { alert(`Could not load admin data: ${error.message}`); return; }
      state.settings=s.data; state.services=sv.data||[]; state.facilities=f.data||[]; state.articles=a.data||[]; state.appointments=ap.data||[];
    }
    renderAll();
  }

  function renderAll() {
    $('metricPending').textContent=state.appointments.filter(x=>x.status==='pending').length;
    $('metricServices').textContent=state.services.filter(x=>x.active).length;
    $('metricArticles').textContent=state.articles.filter(x=>x.published).length;
    $('metricFacilities').textContent=state.facilities.filter(x=>x.active).length;
    renderAppointments(); renderList('serviceEditor','services'); renderList('facilityEditor','facilities'); renderArticles(); fillSettings();
  }

  function renderAppointments() {
    const rowHtml = (x, actions=true) => `<tr><td><strong>${safe(x.patient_name)}</strong></td><td>${safe(x.phone)}${x.email?`<br><small>${safe(x.email)}</small>`:''}</td><td>${safe(x.appointment_date)}</td><td>${safe(x.preferred_slot)}</td><td><span class="status status-${safe(x.status)}">${safe(x.status)}</span></td>${actions?`<td><select class="appt-status" data-id="${safe(x.id)}"><option ${x.status==='pending'?'selected':''}>pending</option><option ${x.status==='confirmed'?'selected':''}>confirmed</option><option ${x.status==='completed'?'selected':''}>completed</option><option ${x.status==='cancelled'?'selected':''}>cancelled</option></select></td>`:''}</tr>`;
    $('appointmentsTable').innerHTML=state.appointments.length?state.appointments.map(x=>rowHtml(x,true)).join(''):'<tr><td colspan="6" class="empty">No appointment requests yet.</td></tr>';
    $('recentAppointments').innerHTML=state.appointments.length?state.appointments.slice(0,5).map(x=>`<tr><td>${safe(x.patient_name)}</td><td>${safe(x.appointment_date)}</td><td>${safe(x.preferred_slot)}</td><td><span class="status status-${safe(x.status)}">${safe(x.status)}</span></td></tr>`).join(''):'<tr><td colspan="4" class="empty">No appointment requests yet.</td></tr>';
    document.querySelectorAll('.appt-status').forEach(el=>el.addEventListener('change',()=>updateAppointment(el.dataset.id,el.value)));
  }

  async function updateAppointment(id,status) {
    if (!isLive) { const x=state.appointments.find(a=>String(a.id)===String(id)); if(x)x.status=status; demoSet('appointments',state.appointments); renderAll(); return; }
    const {error}=await client.from('appointments').update({status}).eq('id',id); if(error) alert(error.message); else await loadAll();
  }

  function renderList(target,key) {
    const rows=state[key];
    $(target).innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>Order</th><th>Icon</th><th>Title</th><th>Description</th><th>Visible</th><th>Actions</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${safe(x.display_order)}</td><td style="font-size:1.3rem">${safe(x.icon)}</td><td><strong>${safe(x.title)}</strong></td><td>${safe(x.description)}</td><td>${x.active?'Yes':'No'}</td><td><div class="actions"><button class="btn btn-soft btn-sm edit-item" data-key="${key}" data-id="${safe(x.id)}">Edit</button><button class="btn btn-danger btn-sm delete-item" data-key="${key}" data-id="${safe(x.id)}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No items yet.</div>';
    bindRowActions();
  }

  function renderArticles() {
    $('articleEditor').innerHTML=state.articles.length?`<div class="table-wrap"><table><thead><tr><th>Title</th><th>Category</th><th>Published</th><th>Date</th><th>Actions</th></tr></thead><tbody>${state.articles.map(x=>`<tr><td><strong>${safe(x.title)}</strong><br><small>${safe(x.excerpt)}</small></td><td>${safe(x.category)}</td><td>${x.published?'Yes':'No'}</td><td>${safe(x.published_at||'')}</td><td><div class="actions"><button class="btn btn-soft btn-sm edit-item" data-key="articles" data-id="${safe(x.id)}">Edit</button><button class="btn btn-danger btn-sm delete-item" data-key="articles" data-id="${safe(x.id)}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No articles yet.</div>';
    bindRowActions();
  }

  function bindRowActions(){
    document.querySelectorAll('.edit-item').forEach(b=>b.onclick=()=>openEditor(b.dataset.key,b.dataset.id));
    document.querySelectorAll('.delete-item').forEach(b=>b.onclick=()=>deleteItem(b.dataset.key,b.dataset.id));
  }

  function openEditor(key,id=null) {
    const existing=id?state[key].find(x=>String(x.id)===String(id)):null;
    state.editor={key,id}; $('editorModal').classList.remove('hidden');
    if(key==='articles') {
      $('editorEyebrow').textContent='Health Library'; $('editorTitle').textContent=existing?'Edit article':'New article';
      $('editorFields').innerHTML=`<div class="field full"><label>Title</label><input name="title" required value="${safe(existing?.title||'')}"></div><div class="field"><label>Category</label><input name="category" value="${safe(existing?.category||'General health')}"></div><div class="field"><label>Publish date</label><input name="published_at" type="date" value="${safe(existing?.published_at||new Date().toISOString().slice(0,10))}"></div><div class="field full"><label>Short excerpt</label><textarea name="excerpt" rows="3" required>${safe(existing?.excerpt||'')}</textarea></div><div class="field full"><label>Article body</label><textarea name="content" rows="8" required>${safe((existing?.content||'').replace(/<br\s*\/?\s*>/gi,'\n'))}</textarea><small>Basic HTML such as &lt;p&gt;, &lt;strong&gt; and &lt;ul&gt; is supported.</small></div><div class="field full"><label><input type="checkbox" name="published" ${existing?.published!==false?'checked':''}> Published on website</label></div>`;
    } else {
      const singular=key==='services'?'Service':'Facility'; $('editorEyebrow').textContent=singular; $('editorTitle').textContent=existing?`Edit ${singular.toLowerCase()}`:`New ${singular.toLowerCase()}`;
      $('editorFields').innerHTML=`<div class="field"><label>Icon / emoji</label><input name="icon" value="${safe(existing?.icon||'✚')}"></div><div class="field"><label>Display order</label><input name="display_order" type="number" min="1" value="${safe(existing?.display_order||state[key].length+1)}"></div><div class="field full"><label>Title</label><input name="title" required value="${safe(existing?.title||'')}"></div><div class="field full"><label>Description</label><textarea name="description" rows="4" required>${safe(existing?.description||'')}</textarea></div><div class="field full"><label><input type="checkbox" name="active" ${existing?.active!==false?'checked':''}> Visible on website</label></div>`;
    }
  }

  async function saveEditor(e){
    e.preventDefault(); const fd=new FormData(e.target); const {key,id}=state.editor; let payload;
    if(key==='articles') payload={title:fd.get('title').trim(),category:fd.get('category').trim(),published_at:fd.get('published_at'),excerpt:fd.get('excerpt').trim(),content:fd.get('content').trim(),published:fd.get('published')==='on'};
    else payload={icon:fd.get('icon').trim()||'✚',display_order:Number(fd.get('display_order')||1),title:fd.get('title').trim(),description:fd.get('description').trim(),active:fd.get('active')==='on'};
    try {
      if(!isLive){
        if(id){ const idx=state[key].findIndex(x=>String(x.id)===String(id)); state[key][idx]={...state[key][idx],...payload}; }
        else state[key].push({...payload,id:Date.now()}); demoSet(key,state[key]);
      } else {
        const q=id?client.from(key).update(payload).eq('id',id):client.from(key).insert(payload); const {error}=await q; if(error) throw error;
      }
      closeEditor(); await loadAll();
    } catch(err){ $('editorNotice').className='notice notice-error'; $('editorNotice').textContent=err.message; }
  }

  async function deleteItem(key,id){
    if(!confirm('Delete this item?')) return;
    if(!isLive){ state[key]=state[key].filter(x=>String(x.id)!==String(id)); demoSet(key,state[key]); renderAll(); return; }
    const {error}=await client.from(key).delete().eq('id',id); if(error) alert(error.message); else await loadAll();
  }

  function fillSettings(){ const s=state.settings||seed.settings; $('sClinicName').value=s.clinic_name||''; $('sDoctorName').value=s.doctor_name||''; $('sQualification').value=s.qualification||''; $('sHeroIntro').value=s.hero_intro||''; $('sDoctorBio').value=s.doctor_bio||''; $('sExperience').value=s.experience||''; $('sMode').value=s.consultation_mode||''; $('sAvailability').value=s.next_availability||''; $('sAddress').value=s.address||''; $('sPhone').value=s.phone||''; $('sEmail').value=s.email||''; $('sHours').value=s.clinic_hours||''; }

  async function saveSettings(e){
    e.preventDefault(); const payload={id:1,clinic_name:$('sClinicName').value.trim(),doctor_name:$('sDoctorName').value.trim(),qualification:$('sQualification').value.trim(),hero_intro:$('sHeroIntro').value.trim(),doctor_bio:$('sDoctorBio').value.trim(),experience:$('sExperience').value.trim(),consultation_mode:$('sMode').value.trim(),next_availability:$('sAvailability').value.trim(),address:$('sAddress').value.trim(),phone:$('sPhone').value.trim(),email:$('sEmail').value.trim(),clinic_hours:$('sHours').value.trim()};
    const box=$('settingsNotice');
    try { if(!isLive){state.settings=payload;demoSet('settings',payload);} else { const {error}=await client.from('site_settings').upsert(payload);if(error)throw error;} box.className='notice notice-success';box.textContent='Website details saved.'; await loadAll(); } catch(err){box.className='notice notice-error';box.textContent=err.message;}
  }

  function closeEditor(){ $('editorModal').classList.add('hidden'); $('editorNotice').className='hidden'; $('editorForm').reset(); state.editor=null; }
  function switchTab(tab){ document.querySelectorAll('.side-nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab)); document.querySelectorAll('[data-section]').forEach(s=>s.classList.toggle('hidden',s.dataset.section!==tab)); const labels={dashboard:['Overview','Manage the clinic website from one place.'],appointments:['Appointments','Review and update appointment requests.'],services:['Services','Add, edit, reorder or hide clinical services.'],facilities:['Facilities','Show patients what is available at the clinic.'],articles:['Health Library','Publish practical educational articles without touching code.'],settings:['Website details','Update the doctor profile, clinic contact details and homepage text.']}; $('pageTitle').textContent=labels[tab][0];$('pageSubtitle').textContent=labels[tab][1]; }

  document.querySelectorAll('.side-nav button').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.go)));
  $('addServiceBtn').onclick=()=>openEditor('services'); $('addFacilityBtn').onclick=()=>openEditor('facilities'); $('addArticleBtn').onclick=()=>openEditor('articles');
  $('editorClose').onclick=closeEditor; $('editorCancel').onclick=closeEditor; $('editorForm').addEventListener('submit',saveEditor); $('settingsForm').addEventListener('submit',saveSettings);
  $('loginForm').addEventListener('submit',login);
  $('logoutBtn').addEventListener('click',async()=>{if(isLive)await client.auth.signOut();location.reload();});
  authInit();
})();
