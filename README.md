# Dr. S. Kaushik Anurag — video consultations

Updated on 6 September 2026 with the supplied MBBS qualification, junior residency in Respiratory Medicine, three years of experience, six services, English/Telugu/Hindi and contact details.

- Existing GitHub Pages hosting and Supabase appointment RPCs are retained.
- Call, WhatsApp and email links use the doctor's supplied contact details.
- A successful live booking displays its pending-confirmation status, date/time and a WhatsApp follow-up link. Video joining details are shared by the doctor after confirmation; there is no automatic video-link delivery.
- `doctor-profile.js` publishes the new content immediately over database settings older than 6 September 2026. The first authenticated admin sign-in synchronizes the profile, services and consultation details using the existing admin permissions. Existing content row IDs are reused, excess old content is hidden, and the completion timestamp is written last. Appointment records and availability rules are untouched.
- Subsequent admin edits remain authoritative. No new SQL migration or secret key is required.

---

# Dynamic Doctor Clinic Website

A responsive clinic website + no-code-style admin dashboard designed for a doctor who wants to manage appointments, services, facilities, clinic information and educational articles without editing the site code.

## What is included

- Public clinic homepage
- Doctor profile and clinic information
- Dynamic services and facilities
- Appointment request form
- Health education article library
- Admin dashboard
- Appointment status management
- Add/edit/hide services and facilities
- Add/edit/publish/unpublish articles
- Edit clinic name, doctor bio, address, phone, hours and homepage copy
- Supabase database schema with Row Level Security
- Demo mode that works immediately in the browser using localStorage

## Important architecture

**Frontend / hosting:** plain HTML, CSS and JavaScript. It can be hosted cheaply or free on GitHub Pages, Cloudflare Pages, Netlify, Vercel, etc.

**Dynamic backend:** Supabase (Postgres + Authentication + Row Level Security).

This split keeps the website simple while still giving the doctor a real live admin backend.

## Open the demo now

1. Open `index.html` in a browser.
2. Open `admin.html` in a second tab.
3. Demo mode is enabled in `config.js`.
4. Edit services/articles/details from the admin page and refresh the homepage. The changes will appear because demo mode uses browser localStorage.

Demo mode is only for previewing the interface. It is not a production backend and is not shared across devices.

## Make it live with Supabase

1. Create a free Supabase project.
2. Open **SQL Editor** and run `database/schema.sql`.
3. In **Authentication > Users**, create the doctor/admin account.
4. Copy that user's UUID.
5. In SQL Editor run:
   `insert into public.admin_users (user_id) values ('YOUR-USER-UUID');`
6. In Supabase project settings, copy the **Project URL** and **Publishable/Anon Key**.
7. Open `config.js` and set:

```js
window.CLINIC_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-PUBLISHABLE-OR-ANON-KEY',
  DEMO_MODE: false
};
```

Do **not** place a `service_role` key in browser code.

## Publish it permanently

### Option A — GitHub Pages

1. Create a GitHub repository.
2. Upload the files in this folder to the repository root.
3. In GitHub: **Settings > Pages**.
4. Choose the `main` branch as the publishing source (or use a Pages GitHub Actions workflow).
5. GitHub will provide a public `github.io` URL.
6. Optional: add your own clinic domain in the GitHub Pages settings.

### Option B — Vercel / Netlify / Cloudflare Pages

Upload or connect the same repository. Because this project is static HTML/CSS/JS, no build command is required.

## Suggested production upgrades

Before using the site for real patients:

- Replace all sample doctor/clinic data.
- Add a privacy notice and consent language appropriate to the clinic's jurisdiction.
- Keep this booking form limited to scheduling information; do not use it as an electronic medical record.
- Add CAPTCHA / anti-spam protection for high-traffic deployment.
- Configure a clinic email/SMS notification workflow if required.
- Add automated appointment-slot capacity rules if the clinic needs real-time slot blocking rather than request-and-confirm scheduling.
- Add backups and a written clinic process for who can access appointment data.

## Files

- `index.html` — public website
- `admin.html` — admin dashboard
- `config.js` — backend connection settings
- `assets/styles.css` — all visual styling
- `assets/app.js` — public website data + appointment logic
- `assets/admin.js` — admin CRUD + login logic
- `database/schema.sql` — Supabase tables, RLS policies and sample data

## Data boundary

The starter deliberately does not ask patients to submit symptoms, reports, prescriptions, diagnoses or detailed medical history. It is an appointment/content-management website, not an EHR/EMR.
