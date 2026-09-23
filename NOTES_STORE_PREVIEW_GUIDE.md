# Dr. Kaushik Learning — Notes Store Preview

This package changes the public website from consultation-first to notes-store-first while preserving the existing Supabase appointment function and the existing admin dashboard.

## What this preview contains

- Medical-blue visual identity with restrained clinical design elements
- Store-first homepage
- Subject navigation
- Searchable and filterable catalogue
- One real free product: IV Fluids notes
- Clearly labelled coming-soon examples
- Individual product-detail layout
- My Library design preview
- Separate video-consultation page using the existing booking function
- Updated privacy-page appearance

Razorpay, student authentication and paid-file delivery are deliberately not active in this package.

## Safe preview deployment

1. Keep the existing production website unchanged.
2. In GitHub, create a branch named 'notes-store-v1' from the current 'main' branch.
3. Upload these new or replacement files from this package:
   - 'index.html'
   - 'learning.html'
   - 'product.html'
   - 'appointment.html'
   - 'library.html'
   - 'privacy.html'
   - 'app.js'
   - 'catalogue.js'
   - 'store.css'
4. Do not delete or replace:
   - 'config.js'
   - 'admin.html'
   - 'admin.js'
   - 'styles.css'
   - the doctor portrait files
   - 'IV_Fluids_Physiology_and_Protocols.pdf'
5. Commit the changes to 'notes-store-v1'.
6. Open the Vercel Preview URL created for that branch.
7. Do not merge the branch until the checklist below passes.

No new Supabase SQL is required for this visual preview.

## Preview checklist

- Homepage loads in medical-blue branding.
- Notes Store opens and filters work.
- Searching “ABG” displays only the ABG example.
- The IV Fluids product page opens its free PDF.
- Coming-soon products cannot be purchased.
- My Library clearly displays preview status rather than a false login.
- The doctor’s approved portrait appears in the author section.
- Appointment date and live times load.
- A test appointment appears in the existing admin dashboard.
- Mobile navigation, Browse Notes and Consultation buttons work.

## Important product-content rule

The seven coming-soon titles are layout examples. Replace them only with titles and descriptions approved by the author. Do not publish page counts, prices, ratings, reviews or clinical claims until they are verified.

Use 'PRODUCT_CATALOGUE_TEMPLATE.csv' to prepare the 20–25-product inventory. Once the visual design is approved, the next phase will move this information into Supabase and add product-management controls to the admin dashboard.
