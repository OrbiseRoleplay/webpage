import { useState } from 'react'
import { authError, supabase, useOnline, type Membership } from '../online/supabase'
import { useStore } from '../store/useStore'
import { Btn, Empty, Field, Panel, Text, confirmAction } from '../ui/kit'
import { Orb } from '../ui/Orb'

export function AccountScreen() {
  const session = useOnline((s) => s.session)
  if (!supabase) return <NotConfigured />
  return session ? <Signed /> : <SignIn />
}

function NotConfigured() {
  return (
    <Panel title="Cuentas no disponibles todavía">
      <p className="text-sm text-ink/80">El modo online aún no está conectado. Puedes seguir creando personajes sin cuenta: se guardan en este dispositivo.</p>
      <p className="mt-2 text-sm text-ink/60">Para activarlo, el administrador rellena <code>.env.local</code> con la URL y la clave pública de Supabase y ejecuta <code>supabase/schema.sql</code>.</p>
    </Panel>
  )
}

type Mode = 'entrar' | 'registro' | 'recuperar'

function SignIn() {
  const toast = useStore((s) => s.toast)
  const [mode, setMode] = useState<Mode>('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Escribe un correo válido.')
    if (mode !== 'recuperar' && password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    if (mode === 'registro' && !name.trim()) return setError('Elige un nombre de jugador.')
    if (mode === 'registro' && !consent) return setError('Debes aceptar la política de privacidad para crear la cuenta.')
    setBusy(true)
    const redirect = location.origin
    const r = mode === 'entrar'
      ? await supabase!.auth.signInWithPassword({ email, password })
      : mode === 'registro'
        ? await supabase!.auth.signUp({ email, password, options: { data: { display_name: name.trim() }, emailRedirectTo: redirect } })
        : await supabase!.auth.resetPasswordForEmail(email, { redirectTo: redirect })
    setBusy(false)
    if (r.error) return setError(authError(r.error))
    if (mode === 'registro' && !('session' in r.data && r.data.session)) setSent('Te hemos enviado un correo para confirmar tu cuenta. Ábrelo y vuelve aquí para entrar.')
    else if (mode === 'recuperar') setSent('Si existe una cuenta con ese correo, te llegará un enlace para cambiar la contraseña.')
    else toast('Sesión iniciada', 'ok')
  }

  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-md flex-col justify-center">
      <Orb className="mx-auto -mb-6 aspect-square w-44" />
      <Panel title={mode === 'entrar' ? 'Iniciar sesión' : mode === 'registro' ? 'Crear cuenta' : 'Recuperar contraseña'}>
        {sent ? <p className="text-sm text-good">{sent}</p> : (
          <form onSubmit={submit} className="space-y-3" noValidate>
            {mode === 'registro' && <Field label="Nombre de jugador"><Text value={name} onChange={setName} placeholder="Como te verán en las campañas" /></Field>}
            <Field label="Correo"><input className="holo-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" /></Field>
            {mode !== 'recuperar' && <Field label="Contraseña">
              <input className="holo-input" type="password" autoComplete={mode === 'registro' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
            </Field>}
            {mode === 'registro' && (
              <label className="flex items-start gap-2 text-sm text-ink/80">
                <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>Tengo 14 años o más (o permiso de mis padres) y acepto que ORBISE guarde mi correo y mi nombre de jugador solo para gestionar mi cuenta y mis partidas. Puedo borrar mi cuenta cuando quiera.</span>
              </label>
            )}
            {error && <p role="alert" className="text-sm text-doom">{error}</p>}
            <Btn type="submit" tone="gold" disabled={busy} className="w-full !py-2.5">
              {busy ? 'Un momento…' : mode === 'entrar' ? 'Iniciar sesión' : mode === 'registro' ? 'Crear cuenta' : 'Enviar enlace'}
            </Btn>
          </form>
        )}
        <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">
          {mode !== 'entrar' && <button className="text-holo hover:underline" onClick={() => { setMode('entrar'); setSent(''); setError('') }}>Ya tengo cuenta</button>}
          {mode !== 'registro' && <button className="text-holo hover:underline" onClick={() => { setMode('registro'); setSent(''); setError('') }}>Crear cuenta</button>}
          {mode === 'entrar' && <button className="text-ink/60 hover:underline" onClick={() => { setMode('recuperar'); setError('') }}>He olvidado mi contraseña</button>}
        </div>
      </Panel>
      <p className="mt-3 text-center text-xs text-ink/45">Sin cuenta puedes seguir creando personajes en este dispositivo. La cuenta sirve para jugar campañas con otras personas.</p>
    </div>
  )
}

const ROLE_LABEL = { gm: 'Game Master', player: 'Jugador' } as const

function Signed() {
  const { session, profile, memberships, refresh } = useOnline()
  const toast = useStore((s) => s.toast)
  const [name, setName] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [code, setCode] = useState('')
  const run = async (p: PromiseLike<{ error: { message?: string } | null }>, ok: string) => {
    const { error } = await p
    if (error) toast(authError(error), 'danger')
    else { toast(ok, 'ok'); await refresh() }
    return !error
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Panel title="Tu cuenta">
        <p className="text-lg">{profile?.display_name ?? '…'}</p>
        <p className="text-sm text-ink/55">{session?.user.email}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {profile?.is_admin && <span className="rounded-md border border-gold/60 px-2 py-0.5 text-gold">Administrador</span>}
          {[...new Set(memberships.map((m) => m.role))].map((r) => <span key={r} className="rounded-md border border-holo/40 px-2 py-0.5 text-holo">{ROLE_LABEL[r]}</span>)}
        </div>
        <div className="mt-4 flex gap-2">
          <Text value={name} onChange={setName} placeholder="Nuevo nombre de jugador" />
          <Btn disabled={!name.trim()} onClick={async () => { if (await run(supabase!.from('profiles').update({ display_name: name.trim() }).eq('id', session!.user.id), 'Nombre cambiado')) setName('') }}>Cambiar</Btn>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn tone="ghost" onClick={() => supabase!.auth.signOut()}>Cerrar sesión</Btn>
          <Btn tone="doom" onClick={async () => {
            if (!confirmAction('¿Borrar tu cuenta para siempre? Se eliminan tu perfil, tus membresías y las campañas que creaste. No se puede deshacer.')) return
            if (await run(supabase!.rpc('delete_my_account'), 'Cuenta borrada')) await supabase!.auth.signOut()
          }}>Borrar mi cuenta</Btn>
        </div>
      </Panel>

      <Panel title="Unirse o crear">
        <Field label="Código de invitación">
          <div className="flex gap-2">
            <input className="holo-input font-mono tracking-widest uppercase" value={code} maxLength={8} onChange={(e) => setCode(e.target.value)} placeholder="K7Q2M9XA" />
            <Btn disabled={code.trim().length !== 8} onClick={async () => { if (await run(supabase!.rpc('join_campaign', { p_code: code }), 'Te has unido como jugador')) setCode('') }}>Unirme</Btn>
          </div>
        </Field>
        <Field label="Nueva campaña (serás su Game Master)" className="mt-4">
          <div className="flex gap-2">
            <Text value={campaignName} onChange={setCampaignName} placeholder="Nombre de la campaña" />
            <Btn tone="energy" disabled={!campaignName.trim()} onClick={async () => { if (await run(supabase!.rpc('create_campaign', { p_name: campaignName }), 'Campaña creada')) setCampaignName('') }}>Crear</Btn>
          </div>
        </Field>
      </Panel>

      <Panel title={`Tus campañas (${memberships.length})`} className="md:col-span-2">
        {!memberships.length && <Empty>Únete con un código o crea tu primera campaña.</Empty>}
        <ul className="divide-y divide-white/5">
          {memberships.map((m) => <CampaignRow key={m.campaign.id} m={m} run={run} />)}
        </ul>
      </Panel>
    </div>
  )
}

function CampaignRow({ m, run }: { m: Membership; run: (p: PromiseLike<{ error: { message?: string } | null }>, ok: string) => Promise<boolean> }) {
  const toast = useStore((s) => s.toast)
  const uid = useOnline((s) => s.session?.user.id)
  const gm = m.role === 'gm'
  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate">{m.campaign.name}{m.campaign.paused && <span className="ml-2 text-xs text-gold">En pausa</span>}</p>
        <p className={`text-xs ${gm ? 'text-energy' : 'text-holo'}`}>{ROLE_LABEL[m.role]}</p>
      </div>
      {gm && <>
        <span className="font-mono tracking-widest text-gold">{m.campaign.invite_code}</span>
        <Btn tone="ghost" onClick={() => navigator.clipboard.writeText(m.campaign.invite_code).then(() => toast('Código copiado', 'ok'))}>Copiar</Btn>
        <Btn tone="ghost" onClick={() => confirmAction('¿Generar un código nuevo? El actual dejará de funcionar.') && run(supabase!.rpc('regenerate_invite', { p_campaign: m.campaign.id }), 'Código nuevo generado')}>Nuevo código</Btn>
      </>}
      {!gm && <Btn tone="doom" onClick={() => confirmAction(`¿Salir de ${m.campaign.name}?`) && run(supabase!.from('campaign_members').delete().eq('campaign_id', m.campaign.id).eq('user_id', uid!), 'Has salido de la campaña')}>Salir</Btn>}
    </li>
  )
}
