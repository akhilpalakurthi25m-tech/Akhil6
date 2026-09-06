/* Published profile. Older database content is upgraded through authenticated admin access. */
(() => {
  const publishedAt = '2026-09-06T00:00:00.000Z';
  const settings = {
    clinic_name: 'Dr. S. Kaushik Anurag',
    doctor_name: 'Dr. S. Kaushik Anurag',
    qualification: 'MBBS • Junior Resident in Respiratory Medicine',
    hero_intro: 'Video consultations with Dr. S. Kaushik Anurag, MBBS, for general health, diabetes, hypertension, fever, preventive health, and diet and lifestyle guidance.',
    doctor_bio: 'Dr. S. Kaushik Anurag, MBBS, has three years of experience and is a Junior Resident in Respiratory Medicine. He offers video consultations for everyday health concerns, diabetes, hypertension, fever, preventive health, and diet and lifestyle guidance. Consultations are available in English, Telugu and Hindi.',
    experience: '3 years',
    consultation_mode: 'Video consultation',
    next_availability: 'View slots',
    address: 'Video consultation. Joining details will be shared after appointment confirmation.',
    phone: '+91 96667 91525',
    email: 'Kaushikanuragsadula@gmail.com',
    clinic_hours: 'By appointment — select a date to view available slots.',
    updated_at: publishedAt
  };
  const services = [
    {id:1, icon:'🩺', title:'General Health Workup', description:'Discuss your overall health, current concerns and appropriate next steps through a video consultation.', active:true, display_order:1},
    {id:2, icon:'📊', title:'Diabetes Care', description:'Consultations and follow-up for diabetes, including discussion of monitoring and everyday health habits.', active:true, display_order:2},
    {id:3, icon:'❤️', title:'Hypertension Care', description:'Consultations for high blood pressure, monitoring and ongoing care.', active:true, display_order:3},
    {id:4, icon:'🌡️', title:'Fever Consultation', description:'Discuss fever and related concerns, with guidance on appropriate next steps.', active:true, display_order:4},
    {id:5, icon:'🛡️', title:'Preventive Health', description:'Discuss health risks, screening needs and practical preventive-care measures.', active:true, display_order:5},
    {id:6, icon:'🥗', title:'Diet & Lifestyle Guidance', description:'Advice on food choices, eating habits and lifestyle changes suited to your health needs.', active:true, display_order:6}
  ];
  const facilities = [
    {id:1, icon:'📹', title:'Video Consultations', description:'Consult remotely by video. Joining details will be shared after your appointment is confirmed.', active:true, display_order:1},
    {id:2, icon:'💬', title:'English, Telugu & Hindi', description:'Speak with the doctor in your preferred language during the consultation.', active:true, display_order:2},
    {id:3, icon:'📅', title:'Appointments & Follow-up', description:'Choose an available slot online. Call or WhatsApp the doctor for appointment-related questions.', active:true, display_order:3}
  ];
  const needsSync = data => !data?.updated_at || !(Date.parse(data.updated_at) >= Date.parse(publishedAt));
  const savedAt = () => new Date(Math.max(Date.now(), Date.parse(publishedAt))).toISOString();
  function resolve(data) {
    if (needsSync(data?.settings)) {
      return {...data, settings:{...data?.settings, ...settings}, services, facilities};
    }
    return {...data, settings:{...settings, ...data.settings}};
  }
  async function sync(client, data) {
    if (!needsSync(data.settings)) return false;
    const permission = await client.rpc('is_admin');
    if (permission.error || permission.data !== true) throw new Error('Sign in with the doctor/admin account to save the updated profile.');
    async function syncRows(table, defaults, existing) {
      const rows = [...(existing || [])].sort((a,b) => (a.display_order || 0) - (b.display_order || 0) || Number(a.id) - Number(b.id));
      const replacements = [], additions = [];
      defaults.forEach(({id, ...value}, i) => {
        if (rows[i]) replacements.push({...value, id:rows[i].id});
        else additions.push(value);
      });
      if (replacements.length) {
        const {error} = await client.from(table).upsert(replacements);
        if (error) throw error;
      }
      if (additions.length) {
        const {error} = await client.from(table).insert(additions);
        if (error) throw error;
      }
      const surplus = rows.slice(defaults.length).map(row => row.id);
      if (surplus.length) {
        const {error} = await client.from(table).update({active:false}).in('id', surplus);
        if (error) throw error;
      }
    }
    await syncRows('services', services, data.services);
    await syncRows('facilities', facilities, data.facilities);
    // Mark completion last: visitors use the published profile until every content write succeeds.
    const {error} = await client.from('site_settings').upsert({id:1, ...settings, updated_at:savedAt()});
    if (error) throw error;
    return true;
  }
  window.DOCTOR_PROFILE = {publishedAt, settings, services, facilities, needsSync, savedAt, resolve, sync};
})();
