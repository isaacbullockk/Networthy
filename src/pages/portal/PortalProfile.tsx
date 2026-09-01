import { useEffect, useState } from 'react'
import { Quote, Sparkles, CheckCircle2, Save, MapPin, Languages, Pencil, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/providers/trpc'
import Avatar from '@/components/Avatar'
import VideoIntroRecorder from '@/components/VideoIntroRecorder'
import { TALENT_ROLES, type TalentRole } from '@contracts/roles'

export default function PortalProfile() {
  const { t } = useTranslation()
  const utils = trpc.useUtils()
  const { data: profile, isLoading } = trpc.talents.mine.useQuery()
  const updateMut = trpc.talents.updateProfile.useMutation({
    onSuccess: () => {
      utils.talents.mine.invalidate()
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    },
  })

  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<{ role: TalentRole | ''; name: string; origin: string; yearsInNL: string; languages: string; tagline: string; story: string; lookingFor: string; availability: string }>({ role: '', name: '', origin: '', yearsInNL: '', languages: '', tagline: '', story: '', lookingFor: '', availability: '' })

  useEffect(() => {
    if (profile) {
      setForm({
        role: profile.role as TalentRole,
        name: profile.name,
        origin: profile.origin,
        yearsInNL: String(profile.yearsInNL),
        languages: profile.languages.join(', '),
        tagline: profile.tagline,
        story: profile.story,
        lookingFor: profile.lookingFor,
        availability: profile.availability,
      })
    }
  }, [profile])

  if (isLoading || !profile) {
    return <div className="mx-auto max-w-3xl px-4 py-24 text-center text-muted-foreground">{t('portal.profile.loading')}</div>
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-primary">{t('portal.profile.title')}</div>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Your profile is your voice.
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            This is what recruiters see — not a CV. Tell it like it is.
          </p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            <Pencil className="h-4 w-4" /> Edit my story
          </button>
        ) : (
          <button
            onClick={() => setEditing(false)}
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" /> Cancel
          </button>
        )}
      </div>

      {/* Header */}
      <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className={`h-24 bg-gradient-to-r ${profile.gradient} texture-dots`} />
        <div className="flex flex-wrap items-end gap-4 px-6 pb-6 sm:px-8">
          <div className="-mt-10 rounded-3xl border-4 border-card shadow-lg">
            <Avatar name={profile.name} gradient={profile.gradient} size="lg" />
          </div>
          <div className="pb-1">
            <h2 className="font-display text-2xl font-semibold">{profile.name}</h2>
            {editing ? (
              <select value={form.role} onChange={set('role')} className="mt-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary">
                {TALENT_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            ) : (
              <div className="font-medium text-primary">{profile.role}</div>
            )}
          </div>
          <div className="ms-auto flex flex-wrap gap-x-5 gap-y-1 pb-1 text-sm text-muted-foreground">
            {editing ? (
              <div className="flex flex-wrap items-center gap-3">
                <input value={form.name} onChange={set('name')} placeholder={t('portal.profile.name')} className="w-40 rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary" />
                <input value={form.origin} onChange={set('origin')} placeholder={t('portal.profile.origin')} className="w-32 rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary" />
                <input value={form.yearsInNL} onChange={set('yearsInNL')} type="number" min="0" max="80" placeholder={t('portal.profile.yearsInNL')} className="w-24 rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary" />
                <input value={form.languages} onChange={set('languages')} placeholder={t('portal.profile.languages')} className="w-52 rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary" />
              </div>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {profile.origin} · {profile.yearsInNL} yrs in NL</span>
                <span className="inline-flex items-center gap-1.5"><Languages className="h-4 w-4" /> {profile.languages.join(' · ')}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Video introduction — the distance killer */}
      <div className="mt-6">
        <VideoIntroRecorder talentId={profile.id} />
      </div>

      {/* Tagline */}
      <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <Quote className="h-5 w-5 text-primary" />
          <h3 className="font-display text-xl font-semibold">{t('portal.profile.tagline')}</h3>
        </div>
        {editing ? (
          <textarea rows={2} value={form.tagline} onChange={set('tagline')}
            className="mt-3 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
        ) : (
          <p className="mt-3 font-display text-xl italic leading-snug text-foreground/85">“{profile.tagline}”</p>
        )}
      </div>

      {/* Story */}
      <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-display text-xl font-semibold">{t('portal.profile.title')}</h3>
        </div>
        {editing ? (
          <textarea rows={7} value={form.story} onChange={set('story')}
            className="mt-3 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm leading-relaxed outline-none focus:border-primary" />
        ) : (
          <p className="mt-3 leading-relaxed text-foreground/85">{profile.story}</p>
        )}
      </div>

      {/* Looking for + availability */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-display text-lg font-semibold">{t('portal.profile.lookingFor')}</h3>
          {editing ? (
            <textarea rows={3} value={form.lookingFor} onChange={set('lookingFor')}
              className="mt-3 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{profile.lookingFor}</p>
          )}
        </div>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-display text-lg font-semibold">{t('portal.profile.availability')}</h3>
          {editing ? (
            <input value={form.availability} onChange={set('availability')}
              className="mt-3 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{profile.availability}</p>
          )}
        </div>
      </div>

      {/* Traits & skills (read-only, coach-assessed) */}
      <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h3 className="font-display text-lg font-semibold">{t('portal.profile.traitsSkills')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">Assessed with your NetWorthy coach — update them together at your next session.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.traits.map((t) => (
            <span key={t} className="rounded-full bg-muted px-3.5 py-1.5 text-sm font-medium text-foreground/75">{t}</span>
          ))}
          {profile.skills.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-accent" /> {s}
            </span>
          ))}
        </div>
      </div>

      {editing && (
        <div className="sticky bottom-6 mt-6 flex items-center gap-3 rounded-3xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur">
          <button
            onClick={() =>
              form.role &&
              updateMut.mutate({
                tagline: form.tagline,
                story: form.story,
                lookingFor: form.lookingFor,
                availability: form.availability,
                role: form.role,
                name: form.name.trim() || undefined,
                origin: form.origin.trim(),
                yearsInNL: Math.max(0, Math.min(80, parseInt(form.yearsInNL, 10) || 0)),
                languages: form.languages.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10),
              })
            }
            disabled={updateMut.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
          >
            <Save className="h-4.5 w-4.5" /> {updateMut.isPending ? t('portal.profile.saving') : t('portal.profile.save')}
          </button>
          <span className="text-sm text-muted-foreground">{t('portal.profile.immediateNote')}</span>
        </div>
      )}
      {saved && !editing && (
        <div className="mt-6 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-4.5 w-4.5" /> Your story is updated — recruiters now see the latest version.
        </div>
      )}
    </div>
  )
}
