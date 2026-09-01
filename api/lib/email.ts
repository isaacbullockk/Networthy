/**
 * Transactional email via Resend (https://resend.com).
 *
 * Setup (production):
 *   1. resend.com → add domain networthy.nl → paste the DKIM records into
 *      Namecheap Advanced DNS (subdomain records, no conflict with the site)
 *   2. Railway variables: RESEND_API_KEY, EMAIL_FROM, ADMIN_ALERT_EMAIL,
 *      APP_ORIGIN (https://networthy.nl)
 *
 * Without RESEND_API_KEY the module logs instead of sending — dev keeps
 * working, and password-reset links appear in the server log.
 *
 * Every send is fire-and-forget: email never blocks or fails a request.
 */

const RESEND_API = "https://api.resend.com/emails";

type Locale = "en" | "nl" | "ar";

function from() {
  return process.env.EMAIL_FROM || "NetWorthy <no-reply@networthy.nl>";
}
export function adminAlertAddress() {
  return process.env.ADMIN_ALERT_EMAIL || "isaac@networthy.app";
}
export function appOrigin() {
  return (process.env.APP_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
}

async function send(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email] no RESEND_API_KEY — would send to ${to}: ${subject}\n${text}`);
    return false;
  }
  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: from(), to: [to], subject, html, text }),
    });
    if (!res.ok) console.error(`[email] Resend ${res.status}:`, await res.text());
    return res.ok;
  } catch (err) {
    console.error("[email] send failed:", err);
    return false;
  }
}

/* ---------- Branded shell ---------- */

function shell(body: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f7f4ef;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="text-align:center;padding:8px 0 24px">
      <span style="font-size:26px;font-weight:700;color:#1c1917">Net<span style="color:#ea580c">Worthy</span></span>
    </div>
    <div style="background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
      ${body}
    </div>
    <p style="text-align:center;color:#a8a29e;font-size:12px;padding-top:24px">
      Everybody has a talent — connect with it.
    </p>
  </div></body></html>`;
}

function button(url: string, label: string): string {
  return `<p style="text-align:center;margin:28px 0 8px">
    <a href="${url}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 32px;border-radius:12px">${label}</a>
  </p>`;
}

/* ---------- Templates ---------- */

const L = {
  reset: {
    en: {
      subject: "Reset your NetWorthy password",
      title: "Reset your password",
      body: "Someone (hopefully you) asked for a password reset for this account. The link works for 1 hour and can be used once.",
      cta: "Choose a new password",
      ignore: "Didn't ask for this? You can ignore this email — your password stays the same.",
    },
    nl: {
      subject: "Reset je NetWorthy-wachtwoord",
      title: "Wachtwoord resetten",
      body: "Iemand (hopelijk jij) heeft een wachtwoord-reset aangevraagd voor dit account. De link werkt 1 uur en is eenmalig.",
      cta: "Kies een nieuw wachtwoord",
      ignore: "Niet aangevraagd? Dan kun je deze e-mail negeren — je wachtwoord blijft hetzelfde.",
    },
    ar: {
      subject: "إعادة تعيين كلمة مرور NetWorthy",
      title: "إعادة تعيين كلمة المرور",
      body: "طلب شخص ما (نأمل أن تكون أنت) إعادة تعيين كلمة المرور لهذا الحساب. يعمل الرابط لمدة ساعة واحدة ويُستخدم مرة واحدة.",
      cta: "اختر كلمة مرور جديدة",
      ignore: "لم تطلب هذا؟ يمكنك تجاهل هذه الرسالة — ستبقى كلمة مرورك كما هي.",
    },
  },
  verify: {
    en: {
      subject: "Confirm your NetWorthy email address",
      title: "One click to confirm it's you.",
      body: "Welcome to NetWorthy. Confirm this email address to activate your account — the link works for 24 hours and can be used once.",
      cta: "Confirm my email",
      ignore: "Didn't create an account? You can ignore this email.",
    },
    nl: {
      subject: "Bevestig je NetWorthy-e-mailadres",
      title: "Eén klik om te bevestigen dat jij het bent.",
      body: "Welkom bij NetWorthy. Bevestig dit e-mailadres om je account te activeren — de link werkt 24 uur en is eenmalig.",
      cta: "Bevestig mijn e-mail",
      ignore: "Geen account aangemaakt? Dan kun je deze e-mail negeren.",
    },
    ar: {
      subject: "أكّد عنوان بريدك الإلكتروني في NetWorthy",
      title: "نقرة واحدة للتأكيد أنه أنت.",
      body: "مرحباً بك في NetWorthy. أكّد هذا البريد الإلكتروني لتفعيل حسابك — يعمل الرابط لمدة 24 ساعة ويُستخدم مرة واحدة.",
      cta: "تأكيد بريدي الإلكتروني",
      ignore: "لم تنشئ حساباً؟ يمكنك تجاهل هذه الرسالة.",
    },
  },
  connection: {
    en: {
      subject: "An employer wants to connect with you on NetWorthy",
      title: "Someone noticed your talent.",
      body: "wants to connect with you. Your name and story stay private until you accept — you decide. Open your portal to accept or decline.",
      cta: "Review the request",
    },
    nl: {
      subject: "Een werkgever wil met je verbinden op NetWorthy",
      title: "Iemand heeft jouw talent gezien.",
      body: "wil met je verbinden. Je naam en verhaal blijven privé tot je accepteert — jij beslist. Open je portaal om te accepteren of te weigeren.",
      cta: "Bekijk het verzoek",
    },
    ar: {
      subject: "صاحب عمل يريد التواصل معك عبر NetWorthy",
      title: "شخص ما لاحظ موهبتك.",
      body: "يريد التواصل معك. يبقى اسمك وقصتك خاصين حتى تقبل — القرار لك. افتح بوابتك للقبول أو الرفض.",
      cta: "راجع الطلب",
    },
  },
  approved: {
    en: {
      subject: "You're approved — welcome to the NetWorthy pool",      title: "You're in.",
      body: "Your recruiter account has been personally approved. The pool is open: verified skills, real stories, people worth meeting.",
      cta: "Discover talent",
    },
    nl: {
      subject: "Je bent goedgekeurd — welkom bij NetWorthy",
      title: "Je bent binnen.",
      body: "Je recruiter-account is persoonlijk goedgekeurd. De pool is open: getoetste skills, echte verhalen, mensen die je wilt ontmoeten.",
      cta: "Ontdek talent",
    },
    ar: {
      subject: "تمت الموافقة — أهلاً بك في NetWorthy",
      title: "تمت الموافقة على حسابك.",
      body: "تمت الموافقة على حساب التوظيف الخاص بك شخصياً. المنصة مفتوحة: مهارات موثقة وقصص حقيقية وأشخاص يستحقون اللقاء.",
      cta: "اكتشف المواهب",
    },
  },
  assessor: {
    en: {
      subject: "You're invited as a NetWorthy assessor",
      title: "You hold the trust charter.",
      body: "You've been invited to verify talents' skills as an independent assessor. Sign in with the temporary password below and change it after your first login.",
      cta: "Sign in",
    },
    nl: {
      subject: "Je bent uitgenodigd als NetWorthy-assessor",
      title: "Jij draagt de trust charter.",
      body: "Je bent uitgenodigd om de skills van talenten te toetsen als onafhankelijk assessor. Log in met het tijdelijke wachtwoord hieronder en wijzig het na je eerste login.",
      cta: "Inloggen",
    },
    ar: {
      subject: "دعوة لتكون مقيّماً في NetWorthy",
      title: "أنت تحمل ميثاق الثقة.",
      body: "تمت دعوتك للتحقق من مهارات المواهب كمقيّم مستقل. سجّل الدخول بكلمة المرور المؤقتة أدناه وغيّرها بعد أول تسجيل دخول.",
      cta: "تسجيل الدخول",
    },
  },
} as const;

function localeOf(l: string | null | undefined): Locale {
  return l === "nl" || l === "ar" ? l : "en";
}

/** Password reset link — in the recipient's own language. */
export function sendPasswordReset(to: string, name: string, token: string, locale: string | null): void {
  const t = L.reset[localeOf(locale)];
  const url = `${appOrigin()}/reset-password?token=${token}`;
  const html = shell(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#1c1917">${t.title}</h1>
    <p style="color:#44403c;line-height:1.6;margin:0">Hi ${name},</p>
    <p style="color:#44403c;line-height:1.6">${t.body}</p>
    ${button(url, t.cta)}
    <p style="color:#78716c;font-size:13px;line-height:1.6;margin-top:24px;word-break:break-all">
      ${url}
    </p>
    <p style="color:#78716c;font-size:13px;line-height:1.6;margin-top:24px">${t.ignore}</p>`);
  void send(to, t.subject, html, `${t.title}\n\n${t.body}\n\n${url}\n\n${t.ignore}`);
}

/** Recruiter approved → welcome to the pool. */
export function sendRecruiterApproved(to: string, name: string, locale: string | null): void {
  const t = L.approved[localeOf(locale)];
  const url = `${appOrigin()}/discover`;
  const html = shell(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#1c1917">${t.title}</h1>
    <p style="color:#44403c;line-height:1.6;margin:0">Hi ${name},</p>
    <p style="color:#44403c;line-height:1.6">${t.body}</p>
    ${button(url, t.cta)}`);
  void send(to, t.subject, html, `${t.title}\n\n${t.body}\n\n${url}`);
}

/** Assessor invite — includes the temporary password. */
export function sendAssessorInvite(to: string, name: string, tempPassword: string, locale: string | null): void {
  const t = L.assessor[localeOf(locale)];
  const url = `${appOrigin()}/login`;
  const html = shell(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#1c1917">${t.title}</h1>
    <p style="color:#44403c;line-height:1.6;margin:0">Hi ${name},</p>
    <p style="color:#44403c;line-height:1.6">${t.body}</p>
    <p style="background:#f5f5f4;border-radius:12px;padding:16px;font-family:monospace;font-size:15px;text-align:center;letter-spacing:.5px">${tempPassword}</p>
    ${button(url, t.cta)}`);
  void send(to, t.subject, html, `${t.title}\n\n${t.body}\n\n${tempPassword}\n\n${url}`);
}

/** Email verification at signup — in the recipient's own language. */
export function sendVerificationEmail(to: string, name: string, token: string, locale: string | null): void {
  const t = L.verify[localeOf(locale)];
  const url = `${appOrigin()}/verify-email?token=${token}`;
  const html = shell(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#1c1917">${t.title}</h1>
    <p style="color:#44403c;line-height:1.6;margin:0">Hi ${name},</p>
    <p style="color:#44403c;line-height:1.6">${t.body}</p>
    ${button(url, t.cta)}
    <p style="color:#78716c;font-size:13px;line-height:1.6;margin-top:24px;word-break:break-all">
      ${url}
    </p>
    <p style="color:#78716c;font-size:13px;line-height:1.6;margin-top:24px">${t.ignore}</p>`);
  void send(to, t.subject, html, `${t.title}\n\n${t.body}\n\n${url}\n\n${t.ignore}`);
}

/** Connection request → the talent decides. Identity stays locked. */
export function sendConnectionRequest(
  to: string,
  talentName: string,
  company: string,
  locale: string | null
): void {
  const t = L.connection[localeOf(locale)];
  const url = `${appOrigin()}/portal`;
  const html = shell(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#1c1917">${t.title}</h1>
    <p style="color:#44403c;line-height:1.6;margin:0">Hi ${talentName},</p>
    <p style="color:#44403c;line-height:1.6"><strong>${company}</strong> ${t.body}</p>
    ${button(url, t.cta)}`);
  void send(to, t.subject, html, `${t.title}\n\n${company} ${t.body}\n\n${url}`);
}

/** Admin alert: a recruiter applied and waits in the trust gate. */export function sendAdminRecruiterApplied(name: string, company: string | null, email: string): void {
  const subject = `New recruiter application: ${name}${company ? ` (${company})` : ""}`;
  const url = `${appOrigin()}/admin`;
  const html = shell(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#1c1917">A recruiter is waiting for review</h1>
    <p style="color:#44403c;line-height:1.6">
      <strong>${name}</strong>${company ? ` from <strong>${company}</strong>` : ""} (${email})
      just applied. The talents' trust is the product — review and approve when it checks out.
    </p>
    ${button(url, "Open the trust gate")}`);
  void send(adminAlertAddress(), subject, html, `${name} (${company ?? "no company"}, ${email}) applied.\n\nReview: ${url}`);
}
