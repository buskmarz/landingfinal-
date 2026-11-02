# Rewards self-service, 2026-11-02

Prepared from GitHub main f95244af3bdc2f8e7d7aade32f6ddd1d5f614738 in an
independent checkout. Existing home, menu, Coffee Lab, FREAK and POS preserved.

New visitors start at Join. Name, phone, email and privacy acceptance are the
required inputs. Birthday is collapsed and optional; marketing is opt-in.
After sending email, identity fields collapse and only code/actions remain.
Errors preserve input. Resend has a 60-second client cooldown plus server
quotas. The phone is not verified; email verification remains mandatory.

The existing Wallet buttons use the real authenticated portal API. Generating
a pass has a timeout and suppresses referrer transmission. Wallet navigation
is not proof of installation. Existing same-tab session restoration remains.

Legacy unlinked profiles can upload their original .pkpass after verifying
email. The coordinated backend authenticates its private token and matching
customer and adds only the enrollment identity. No QR/folio-only claiming.
Without the original pass or previous verified email, support is still needed;
the site explains this without exposing balances or making duplicate profiles.

Publish backend first, then this landing through GitHub PR/main/automatic
Netlify build. No manual deployment. No new subscription or SMS service.
Email service retains its existing 40-code rolling 24-hour quota, read-only
verified in production; this is not unlimited free
delivery.

Chromium/WebKit isolated tests cover desktop/tablet/mobile registration,
international phone, optional birthday, consent, OTP errors, cooldown, Wallet
failure/retry, restored sessions and file-based recovery. No actual messages,
customers, financial transactions or Wallet installations are produced by
these fixtures. Live delivery and physical iPhone installation need separate
authorized acceptance testing.
