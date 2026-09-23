(() => {
  const cfg = window.CLINIC_CONFIG || {};
  const products = Array.isArray(window.MED_NOTES_PRODUCTS) ? window.MED_NOTES_PRODUCTS : [];
  const hasSupabaseSdk = Boolean(window.supabase && typeof window.supabase.createClient === 'function');
  const isLive = Boolean(hasSupabaseSdk && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.DEMO_MODE);
  const supabaseClient = isLive ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  const $ = id => document.getElementById(id);
  const safe = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const defaults = {
    doctor_name: 'Dr. S. Kaushik Anurag',
    qualification: 'MBBS · Junior Resident in Respiratory Medicine',
    phone: '+91 90000 00000',
    whatsapp: '+91 90000 00000',
    clinic_hours: 'By appointment',
    venue_note: 'Video-consultation and joining details are shared after appointment confirmation.'
  };
  let currentSettings = defaults;

  function digits(value) { return String(value || '').replace(/\D/g, ''); }
  function tel(value) { const raw = String(value || '').trim(); return raw ? `tel:${raw.replace(/\s/g, '')}` : '#'; }
  function wa(value, message = '') { const number = digits(value); return number ? `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}` : '#'; }
  function prettyDate(value) { return value ? new Intl.DateTimeFormat('en-IN', {day:'numeric', month:'short', year:'numeric'}).format(new Date(`${value}T00:00:00`)) : '—'; }
  function normalizeSlot(value) { const match = String(value || '').trim().match(/^([01]\d|2[0-3]):([0-5]\d)/); return match ? `${match[1]}:${match[2]}` : ''; }
  function statusLabel(product) { return product.status === 'available' ? (product.price === 0 ? 'Free resource' : 'Available') : 'Coming soon'; }
  function priceLabel(product) { return product.status !== 'available' ? 'Price to be confirmed' : product.price === 0 ? 'Free' : `₹${Number(product.price).toLocaleString('en-IN')}`; }

  function setupCommonUi() {
    const year = $('year');
    if (year) year.textContent = new Date().getFullYear();
    const toggle = $('navToggle');
    const links = $('navLinks');
    if (toggle && links) {
      toggle.addEventListener('click', () => links.classList.toggle('open'));
      links.querySelectorAll('a').forEach(link => link.addEventListener('click', () => links.classList.remove('open')));
    }
  }

  function productCard(product) {
    const detailUrl = `product.html?id=${encodeURIComponent(product.id)}`;
    const access = product.status === 'available' ? 'Open resource' : 'View preview';
    return `
      <article class="product-card">
        <a class="product-cover-mini tone-${safe(product.tone || 'blue')}" href="${detailUrl}" aria-label="View ${safe(product.title)}">
          <span class="product-status">${safe(statusLabel(product))}</span>
          <span class="product-symbol">${safe(product.symbol || 'PDF')}</span>
          <strong>${safe(product.shortTitle || product.title)}</strong>
          <small>${safe(product.format || 'PDF notes')}</small>
        </a>
        <div class="product-card-body">
          <div class="product-subject">${safe(product.subject)}</div>
          <h3><a href="${detailUrl}">${safe(product.title)}</a></h3>
          <p>${safe(product.description)}</p>
          <div class="product-meta-row">
            <div class="product-price"><strong>${safe(priceLabel(product))}</strong><span>${product.pages ? `${safe(product.pages)} pages` : 'Details pending approval'}</span></div>
            <a class="product-link" href="${detailUrl}">${access} →</a>
          </div>
        </div>
      </article>`;
  }

  function renderFeaturedProducts() {
    const grid = $('featuredProducts');
    if (!grid) return;
    grid.innerHTML = products.slice(0, 4).map(productCard).join('');
  }

  function setupCatalogue() {
    const grid = $('catalogueGrid');
    if (!grid) return;
    const search = $('catalogueSearch');
    const filters = $('categoryFilters');
    const params = new URLSearchParams(location.search);
    let activeCategory = params.get('category') || 'All';
    if (!['All','Free','Medicine','Respiratory','Diagnostics','Emergency','Pharmacology'].includes(activeCategory)) activeCategory = 'All';

    function render() {
      const query = String(search?.value || '').trim().toLowerCase();
      const filtered = products.filter(product => {
        const categoryMatch = activeCategory === 'All'
          || (activeCategory === 'Free' && product.status === 'available' && product.price === 0)
          || product.category === activeCategory;
        const text = [product.title, product.shortTitle, product.subject, product.category, product.description].join(' ').toLowerCase();
        return categoryMatch && (!query || text.includes(query));
      });
      grid.innerHTML = filtered.length ? filtered.map(productCard).join('') : '<div class="empty-catalogue"><strong>No matching notes found.</strong><br>Try another keyword or subject filter.</div>';
      if ($('catalogueCount')) $('catalogueCount').textContent = filtered.length;
    }

    if (filters) {
      filters.querySelectorAll('.filter-btn').forEach(button => {
        button.classList.toggle('active', button.dataset.category === activeCategory);
        button.addEventListener('click', () => {
          activeCategory = button.dataset.category;
          filters.querySelectorAll('.filter-btn').forEach(item => item.classList.toggle('active', item === button));
          render();
        });
      });
    }
    if (search) search.addEventListener('input', render);
    render();
  }

  function setupProductPage() {
    if (!$('detailTitle')) return;
    const id = new URLSearchParams(location.search).get('id') || 'iv-fluids';
    const product = products.find(item => item.id === id) || products[0];
    if (!product) return;
    document.title = `${product.title} | Dr. Kaushik Learning`;
    $('breadcrumbProduct').textContent = product.shortTitle || product.title;
    $('detailStatus').textContent = statusLabel(product);
    $('detailTitle').textContent = product.title;
    $('detailDescription').textContent = product.description;
    $('detailShortTitle').textContent = product.shortTitle || product.title;
    $('detailCoverSubject').textContent = product.subject;
    $('detailSymbol').textContent = product.symbol || 'PDF';
    $('detailAuthor').textContent = product.author || defaults.doctor_name;
    $('detailCover').className = `detail-cover tone-${product.tone || 'blue'}`;
    $('detailChips').innerHTML = [product.subject, product.language, product.format, product.pages ? `${product.pages} pages` : null].filter(Boolean).map(item => `<span>${safe(item)}</span>`).join('');

    const defaultHighlights = ['Final contents will be published after clinical review', 'Page count and edition date will be confirmed', 'A sample preview will be provided before purchase'];
    const defaultAudience = ['Medical learners seeking concise revision', 'Readers who prefer structured tables', 'Students comparing resources before purchase'];
    $('detailHighlights').innerHTML = (product.highlights || defaultHighlights).map(item => `<li>${safe(item)}</li>`).join('');
    $('detailAudience').innerHTML = (product.audience || defaultAudience).map(item => `<li>${safe(item)}</li>`).join('');
    $('purchasePrice').textContent = priceLabel(product);
    $('purchaseCopy').textContent = product.status === 'available'
      ? 'This free resource can be opened immediately. Paid checkout is not required.'
      : 'This title demonstrates the planned catalogue layout. It is not yet available for purchase.';
    $('metaFormat').textContent = product.format || 'PDF notes';
    $('metaPages').textContent = product.pages ? `${product.pages} pages` : 'To be confirmed';
    $('metaLanguage').textContent = product.language || 'English';
    $('metaEdition').textContent = product.edition || 'Planned';
    const action = $('productAction');
    if (product.status === 'available' && product.file) {
      action.textContent = 'Open free PDF →';
      action.href = product.file;
      action.target = '_blank';
      action.rel = 'noopener';
      $('purchaseNote').textContent = 'Free educational resource. No account or payment is required.';
    } else {
      action.textContent = 'Coming soon';
      action.href = '#';
      action.className = 'store-btn store-btn-disabled';
      action.setAttribute('aria-disabled', 'true');
      action.addEventListener('click', event => event.preventDefault());
      $('purchaseNote').textContent = 'Payments are intentionally disabled in this design preview.';
    }
  }

  async function loadPublicSettings() {
    if (!isLive) return defaults;
    const { data, error } = await supabaseClient.from('site_settings').select('*').eq('id', 1).single();
    if (error) throw error;
    return {...defaults, ...(data || {})};
  }

  function applyPublicSettings(settings) {
    currentSettings = {...defaults, ...(settings || {})};
    if ($('doctorName')) $('doctorName').textContent = currentSettings.doctor_name;
    if ($('doctorQualification')) $('doctorQualification').textContent = currentSettings.qualification;
    if ($('clinicPhone')) $('clinicPhone').textContent = currentSettings.phone || '—';
    if ($('clinicWhatsapp')) $('clinicWhatsapp').textContent = currentSettings.whatsapp || currentSettings.phone || '—';
    if ($('clinicHours')) $('clinicHours').textContent = currentSettings.clinic_hours || 'By appointment';
  }

  async function loadBookingRules() {
    const date = $('appointmentDate');
    if (!date) return;
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    date.min = today.toISOString().split('T')[0];
    let days = 30;
    if (isLive) {
      const { data, error } = await supabaseClient.rpc('get_booking_rules');
      if (!error && data?.length) days = Number(data[0].booking_window_days || 30);
    }
    const maximum = new Date(today);
    maximum.setDate(maximum.getDate() + days);
    date.max = maximum.toISOString().split('T')[0];
  }

  function demoSlots(dateString) {
    if (!dateString) return [];
    const date = new Date(`${dateString}T00:00:00`);
    if (date.getDay() === 0) return [];
    return ['09:00','09:20','09:40','10:00','10:20','10:40','11:00','11:20','11:40','17:00','17:20','17:40','18:00','18:20','18:40','19:00','19:20','19:40'];
  }

  async function loadSlots() {
    const date = $('appointmentDate')?.value;
    const slot = $('slot');
    const help = $('slotHelp');
    if (!slot || !help) return;
    slot.disabled = true;
    slot.innerHTML = '<option value="">Loading available times…</option>';
    help.textContent = 'Checking the live schedule…';
    if (!date) {
      slot.innerHTML = '<option value="">Select a date first</option>';
      help.textContent = 'Times are generated from the doctor’s live availability and existing bookings.';
      return;
    }
    try {
      let available;
      if (isLive) {
        const { data, error } = await supabaseClient.rpc('get_available_slots', {p_date: date});
        if (error) throw error;
        available = [...new Set((data || []).map(item => normalizeSlot(item.slot)).filter(Boolean))];
      } else {
        available = demoSlots(date);
      }
      if (!available.length) {
        slot.innerHTML = '<option value="">No appointment times available</option>';
        help.textContent = 'Try another date. The doctor may be unavailable or fully booked.';
        return;
      }
      slot.innerHTML = '<option value="">Choose an available time</option>' + available.map(time => `<option value="${safe(time)}">${safe(time)}</option>`).join('');
      slot.disabled = false;
      help.textContent = `${available.length} time${available.length === 1 ? '' : 's'} currently available.`;
    } catch (error) {
      console.error(error);
      slot.innerHTML = '<option value="">Unable to load times</option>';
      help.textContent = 'Please try again or contact the doctor.';
    }
  }

  function showConfirmation(id, snapshot) {
    const reference = String(id || Date.now()).replace(/-/g, '').slice(0, 8).toUpperCase();
    $('confirmRef').textContent = reference;
    $('confirmDate').textContent = prettyDate(snapshot.date);
    $('confirmTime').textContent = snapshot.slot;
    $('confirmVenue').textContent = currentSettings.venue_note || defaults.venue_note;
    const message = `Hello, I submitted appointment request ${reference} for ${prettyDate(snapshot.date)} at ${snapshot.slot}.`;
    $('confirmWhatsapp').href = wa(currentSettings.whatsapp || currentSettings.phone, message);
    $('confirmCall').href = tel(currentSettings.phone);
    $('bookingModal').classList.remove('hidden');
  }

  async function submitAppointment(event) {
    event.preventDefault();
    const notice = $('appointmentNotice');
    if ($('website').value) {
      notice.className = 'notice notice-success';
      notice.textContent = 'Appointment request received.';
      return;
    }
    if (!$('privacyConsent').checked) {
      notice.className = 'notice notice-error';
      notice.textContent = 'Please accept the privacy consent before submitting.';
      return;
    }
    const snapshot = {
      name: $('patientName').value.trim(),
      phone: $('phone').value.trim(),
      email: $('email').value.trim() || null,
      date: $('appointmentDate').value,
      slot: normalizeSlot($('slot').value)
    };
    const args = {p_patient_name:snapshot.name, p_phone:snapshot.phone, p_email:snapshot.email, p_date:snapshot.date, p_slot:snapshot.slot, p_privacy_consent:true};
    notice.className = 'notice notice-info';
    notice.textContent = 'Securing your appointment time…';
    try {
      let bookingId;
      if (isLive) {
        const { data, error } = await supabaseClient.rpc('book_appointment', args);
        if (error) throw error;
        bookingId = data;
      } else {
        bookingId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
        const rows = JSON.parse(localStorage.getItem('clinic_appointments') || '[]');
        rows.unshift({id:bookingId, patient_name:snapshot.name, phone:snapshot.phone, email:snapshot.email, appointment_date:snapshot.date, preferred_slot:snapshot.slot, status:'pending', privacy_consent_at:new Date().toISOString(), created_at:new Date().toISOString()});
        localStorage.setItem('clinic_appointments', JSON.stringify(rows));
      }
      event.target.reset();
      $('slot').disabled = true;
      $('slot').innerHTML = '<option value="">Select a date first</option>';
      $('slotHelp').textContent = 'Times are generated from the doctor’s live availability and existing bookings.';
      notice.className = 'notice notice-success';
      notice.textContent = 'Appointment request received. Your selected time is reserved pending review.';
      showConfirmation(bookingId, snapshot);
    } catch (error) {
      console.error(error);
      const message = [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(' ').toLowerCase();
      notice.className = 'notice notice-error';
      if (message.includes('too many recent')) notice.textContent = 'Too many recent booking requests from this phone number. Please contact the doctor directly.';
      else if (message.includes('appointment slot is no longer available') || message.includes('duplicate key') || message.includes('23505')) notice.textContent = 'That time is no longer available. Please choose another.';
      else if (message.includes('invalid appointment time') || message.includes('invalid appointment slot')) notice.textContent = 'The selected appointment time is invalid. Please refresh and choose another.';
      else if (message.includes('schema cache') || message.includes('could not find the function') || message.includes('pgrst202')) notice.textContent = 'The booking service needs a database update. Please contact the administrator.';
      else if (message.includes('consent')) notice.textContent = 'Privacy consent is required.';
      else notice.textContent = 'Could not submit the appointment. Please try again or contact the doctor.';
      await loadSlots();
    }
  }

  async function setupAppointment() {
    const form = $('appointmentForm');
    if (!form) return;
    await loadBookingRules();
    $('appointmentDate').addEventListener('change', loadSlots);
    form.addEventListener('submit', submitAppointment);
    $('bookingClose').addEventListener('click', () => $('bookingModal').classList.add('hidden'));
    $('bookingModal').addEventListener('click', event => {
      if (event.target === $('bookingModal')) $('bookingModal').classList.add('hidden');
    });
  }

  async function init() {
    setupCommonUi();
    renderFeaturedProducts();
    setupCatalogue();
    setupProductPage();
    try {
      applyPublicSettings(await loadPublicSettings());
    } catch (error) {
      console.error('Public settings could not be loaded.', error);
      applyPublicSettings(defaults);
    }
    await setupAppointment();
  }

  init();
})();
