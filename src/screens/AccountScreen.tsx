import { useRef, useState } from 'react'
import {
  FILES_BUCKET,
  authError,
  canManageAllFiles,
  canManageRoles,
  canUploadFiles,
  createOnlineCampaign,
  joinOnlineCampaign,
  openCampaignProfile,
  regenerateOnlineInvite,
  supabase,
  useOnline,
  type AppRole,
  type Membership,
  type SharedFileRecord,
} from '../online/supabase'
import { useStore } from '../store/useStore'
import { Btn, Empty, Field, Modal, Panel, Tabs, Text, confirmAction } from '../ui/kit'
import { Orb } from '../ui/Orb'

export function AccountScreen() {
  const session = useOnline((s) => s.session)
  if (!supabase) return <NotConfigured />
  return session ? <Signed /> : <SignIn />
}

function NotConfigured() {
  return (
    <Panel title="Base de datos online no conectada todavía">
      <p className="text-sm text-ink/80">
        El sistema de usuarios, roles (Admin, Master, personalizados) y archivos compartidos está listo en el código, pero falta añadir las variables de conexión de Supabase.
      </p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-ink/70">
        <li>Crea un proyecto gratuito en <strong>supabase.com</strong>.</li>
        <li>Ve a <strong>SQL Editor → New query</strong>, pega el contenido de <code>supabase/schema.sql</code> y pulsa <strong>Run</strong>.</li>
        <li>En <strong>Project Settings → API</strong> copia <code>Project URL</code> y <code>anon public key</code>.</li>
        <li>Añádelas en tu archivo <code>.env.local</code> (o en <strong>Vercel → Environment Variables</strong>) como <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.</li>
      </ol>
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
            {mode === 'registro' && <Field label="Nombre de jugador"><Text value={name} onChange={setName} placeholder="Como te verán en la web y campañas" /></Field>}
            <Field label="Correo"><input className="holo-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" /></Field>
            {mode !== 'recuperar' && <Field label="Contraseña">
              <input className="holo-input" type="password" autoComplete={mode === 'registro' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
            </Field>}
            {mode === 'registro' && (
              <label className="flex items-start gap-2 text-sm text-ink/80">
                <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>Tengo 14 años o más (o permiso de mis padres) y acepto que ORBISE guarde mi correo y mi nombre de jugador solo para gestionar mi cuenta, roles y archivos compartidos. Puedo borrar mi cuenta cuando quiera.</span>
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
      <p className="mt-3 text-center text-xs text-ink/45">El primer usuario registrado recibe automáticamente el rol de Admin.</p>
    </div>
  )
}

const ROLE_LABEL = { gm: 'Game Master', player: 'Jugador' } as const
type AccountTab = 'perfil' | 'archivos' | 'usuarios' | 'roles'

function RoleBadge({ role }: { role: AppRole }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium"
      style={{ borderColor: `${role.color}88`, color: role.color, backgroundColor: `${role.color}14` }}
      title={role.description || role.name}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: role.color }} />
      {role.name}
    </span>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function Signed() {
  const { session, profile, memberships, roles, users, userRoles, files, refresh } = useOnline()
  const toast = useStore((s) => s.toast)
  const [tab, setTab] = useState<AccountTab>('perfil')

  const isRoleManager = canManageRoles(profile, roles, userRoles)
  const myAssignedRoles = roles.filter((r) =>
    userRoles.some((ur) => ur.user_id === session?.user.id && ur.role_id === r.id)
  )

  const run = async (p: PromiseLike<{ error: { message?: string } | null }>, ok: string) => {
    const { error } = await p
    if (error) toast(authError(error), 'danger')
    else { toast(ok, 'ok'); await refresh() }
    return !error
  }

  const tabs: { id: AccountTab; label: string }[] = [
    { id: 'perfil', label: 'Perfil y campañas' },
    { id: 'archivos', label: `Archivos (${files.length})` },
    { id: 'usuarios', label: `Usuarios (${users.length})` },
    { id: 'roles', label: `Roles (${roles.length})` },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
        <Btn tone="ghost" onClick={() => refresh()}>↻ Actualizar</Btn>
      </div>

      {tab === 'perfil' && (
        <ProfileAndCampaignsTab
          profile={profile}
          email={session?.user.email ?? ''}
          uid={session?.user.id ?? ''}
          myRoles={myAssignedRoles}
          memberships={memberships}
          run={run}
        />
      )}

      {tab === 'archivos' && <FilesTab run={run} />}

      {tab === 'usuarios' && <UsersDirectoryTab isRoleManager={isRoleManager} run={run} />}

      {tab === 'roles' && <RolesManagerTab isRoleManager={isRoleManager} run={run} />}
    </div>
  )
}

function ProfileAndCampaignsTab({
  profile,
  email,
  uid,
  myRoles,
  memberships,
  run,
}: {
  profile: { display_name: string; is_admin: boolean } | null
  email: string
  uid: string
  myRoles: AppRole[]
  memberships: Membership[]
  run: (p: PromiseLike<{ error: { message?: string } | null }>, ok: string) => Promise<boolean>
}) {
  const [name, setName] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [code, setCode] = useState('')

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Panel title="Tu cuenta y permisos">
        <p className="text-lg font-medium">{profile?.display_name ?? '…'}</p>
        <p className="text-sm text-ink/55">{email}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {profile?.is_admin && !myRoles.some((r) => r.slug === 'admin') && (
            <span className="rounded-md border border-gold/60 px-2 py-0.5 text-xs text-gold">Administrador</span>
          )}
          {myRoles.map((r) => <RoleBadge key={r.id} role={r} />)}
          {[...new Set(memberships.map((m) => m.role))].map((r) => (
            <span key={r} className="rounded-md border border-holo/40 px-2 py-0.5 text-xs text-holo">{ROLE_LABEL[r]} (Campaña)</span>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <Text value={name} onChange={setName} placeholder="Nuevo nombre de jugador" />
          <Btn
            disabled={!name.trim()}
            onClick={async () => {
              if (await run(supabase!.from('profiles').update({ display_name: name.trim() }).eq('id', uid), 'Nombre cambiado')) {
                setName('')
              }
            }}
          >
            Cambiar
          </Btn>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Btn tone="ghost" onClick={() => supabase!.auth.signOut()}>Cerrar sesión</Btn>
          <Btn
            tone="doom"
            onClick={async () => {
              if (!confirmAction('¿Borrar tu cuenta para siempre? Se eliminan tu perfil, tus archivos subidos y las campañas que creaste. No se puede deshacer.')) return
              if (await run(supabase!.rpc('delete_my_account'), 'Cuenta borrada')) await supabase!.auth.signOut()
            }}
          >
            Borrar mi cuenta
          </Btn>
        </div>
      </Panel>

      <Panel title="Unirse o crear campaña">
        <Field label="Código de invitación">
          <div className="flex gap-2">
            <input
              className="holo-input font-mono tracking-widest uppercase"
              value={code}
              maxLength={8}
              onChange={(e) => setCode(e.target.value)}
              placeholder="K7Q2M9XA"
            />
            <Btn
              disabled={code.trim().length !== 8}
              onClick={async () => {
                if (await run(joinOnlineCampaign(code), '¡Te has unido a la campaña! Configura tu personaje para participar.')) setCode('')
              }}
            >
              Unirme
            </Btn>
          </div>
        </Field>
        <Field label="Nueva campaña (serás su Game Master)" className="mt-4">
          <div className="flex gap-2">
            <Text value={campaignName} onChange={setCampaignName} placeholder="Nombre de la campaña" />
            <Btn
              tone="energy"
              disabled={!campaignName.trim()}
              onClick={async () => {
                if (await run(createOnlineCampaign(campaignName), 'Campaña creada')) setCampaignName('')
              }}
            >
              Crear
            </Btn>
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

function CampaignRow({
  m,
  run,
}: {
  m: Membership
  run: (p: PromiseLike<{ error: { message?: string } | null }>, ok: string) => Promise<boolean>
}) {
  const toast = useStore((s) => s.toast)
  const uid = useOnline((s) => s.session?.user.id)
  const gm = m.role === 'gm'
  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => openCampaignProfile(m.campaign.id)}
          className="truncate font-medium text-left text-holo hover:underline"
        >
          {m.campaign.name}
        </button>
        {m.campaign.paused && <span className="ml-2 text-xs text-gold">En pausa</span>}
        <p className={`text-xs ${gm ? 'text-energy' : 'text-holo'}`}>{ROLE_LABEL[m.role]}</p>
      </div>
      <Btn tone="holo" onClick={() => openCampaignProfile(m.campaign.id)}>Abrir perfil de campaña</Btn>
      {gm && (
        <>
          <span className="font-mono tracking-widest text-gold">{m.campaign.invite_code}</span>
          <Btn tone="ghost" onClick={() => navigator.clipboard.writeText(m.campaign.invite_code).then(() => toast('Código copiado', 'ok'))}>Copiar</Btn>
          <Btn tone="ghost" onClick={() => confirmAction('¿Generar un código nuevo? El actual dejará de funcionar.') && run(regenerateOnlineInvite(m.campaign.id), 'Código nuevo generado')}>Nuevo código</Btn>
        </>
      )}
      {!gm && (
        <Btn tone="doom" onClick={() => confirmAction(`¿Salir de ${m.campaign.name}?`) && run(supabase!.from('campaign_members').delete().eq('campaign_id', m.campaign.id).eq('user_id', uid!), 'Has salido de la campaña')}>Salir</Btn>
      )}
    </li>
  )
}

function FilesTab({
  run,
}: {
  run: (p: PromiseLike<{ error: { message?: string } | null }>, ok: string) => Promise<boolean>
}) {
  const { session, profile, roles, users, userRoles, files, refresh } = useOnline()
  const toast = useStore((s) => s.toast)
  const uid = session?.user.id ?? ''
  const allowedToUpload = canUploadFiles(profile, roles, userRoles)
  const isAllFilesManager = canManageAllFiles(profile, roles, userRoles)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [shareRoleIds, setShareRoleIds] = useState<string[]>([])
  const [shareUserIds, setShareUserIds] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [editingSharesFile, setEditingSharesFile] = useState<SharedFileRecord | null>(null)

  const toggleId = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id]

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile || !uid) return toast('Selecciona un archivo primero', 'warn')
    const cleanTitle = (title.trim() || selectedFile.name).slice(0, 120)
    const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${uid}/${crypto.randomUUID()}-${safeName}`

    setUploading(true)
    const up = await supabase!.storage.from(FILES_BUCKET).upload(storagePath, selectedFile, {
      contentType: selectedFile.type || 'application/octet-stream',
      upsert: false,
    })
    if (up.error) {
      setUploading(false)
      return toast(authError(up.error), 'danger')
    }

    const ins = await supabase!
      .from('shared_files')
      .insert({
        owner_id: uid,
        title: cleanTitle,
        description: description.trim(),
        file_name: selectedFile.name,
        mime_type: selectedFile.type || 'application/octet-stream',
        size_bytes: selectedFile.size,
        storage_path: storagePath,
        is_public: isPublic,
      })
      .select('id')
      .single()

    if (ins.error || !ins.data) {
      await supabase!.storage.from(FILES_BUCKET).remove([storagePath])
      setUploading(false)
      return toast(authError(ins.error), 'danger')
    }

    if (shareRoleIds.length > 0 || shareUserIds.length > 0 || isPublic) {
      await supabase!.rpc('set_file_shares', {
        p_file_id: ins.data.id,
        p_is_public: isPublic,
        p_role_ids: shareRoleIds,
        p_user_ids: shareUserIds,
      })
    }

    setUploading(false)
    setSelectedFile(null)
    setTitle('')
    setDescription('')
    setIsPublic(false)
    setShareRoleIds([])
    setShareUserIds([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    toast('Archivo subido y compartido', 'ok')
    await refresh()
  }

  async function handleDownload(f: SharedFileRecord) {
    const { data, error } = await supabase!.storage.from(FILES_BUCKET).createSignedUrl(f.storage_path, 120, {
      download: f.file_name,
    })
    if (error || !data?.signedUrl) return toast(authError(error), 'danger')
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function handleDelete(f: SharedFileRecord) {
    if (!confirmAction(`¿Eliminar el archivo "${f.title}" permanentemente?`)) return
    await supabase!.storage.from(FILES_BUCKET).remove([f.storage_path])
    await run(supabase!.from('shared_files').delete().eq('id', f.id), 'Archivo eliminado')
  }

  const filteredFiles = files.filter((f) => {
    if (!filterText.trim()) return true
    const q = filterText.toLowerCase()
    return f.title.toLowerCase().includes(q) || f.file_name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
  })

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
      <Panel title="Subir y compartir archivo">
        {!allowedToUpload ? (
          <p className="text-sm text-ink/60">Tu rol actual no tiene habilitado el permiso de subida de archivos.</p>
        ) : (
          <form onSubmit={handleUpload} className="space-y-3">
            <Field label="Archivo (máx. 50 MB)">
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  setSelectedFile(f)
                  if (f && !title.trim()) setTitle(f.name)
                }}
                className="holo-input text-xs file:mr-3 file:rounded-md file:border-0 file:bg-holo/15 file:px-2.5 file:py-1 file:text-xs file:text-holo"
              />
            </Field>

            <Field label="Título del archivo">
              <Text value={title} onChange={setTitle} placeholder="Ej. Mapa de la Ciudadela, Ficha NPC, Documento..." />
            </Field>

            <Field label="Descripción o notas (opcional)">
              <Text area value={description} onChange={setDescription} placeholder="Para qué sirve o quién debe consultarlo" />
            </Field>

            <div className="rounded-lg border border-white/10 bg-black/25 p-3 space-y-3">
              <p className="font-display text-xs text-holo">¿Con quién quieres compartirlo?</p>

              <label className="flex items-center gap-2 text-sm text-ink/85">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                <span>Visible para <strong>todos los usuarios registrados</strong></span>
              </label>

              {!isPublic && (
                <>
                  <div>
                    <p className="mb-1.5 text-xs text-ink/60">Compartir por Roles:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {roles.map((r) => {
                        const active = shareRoleIds.includes(r.id)
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setShareRoleIds(toggleId(shareRoleIds, r.id))}
                            className={`rounded-md border px-2.5 py-1 text-xs transition ${
                              active ? 'bg-holo/20 border-holo text-holo' : 'border-white/15 text-ink/60 hover:text-ink'
                            }`}
                          >
                            {active ? '✓ ' : '+ '}{r.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs text-ink/60">Compartir con Usuarios concretos:</p>
                    <div className="max-h-36 overflow-y-auto rounded border border-white/10 p-2 space-y-1">
                      {users.filter((u) => u.id !== uid).length === 0 && (
                        <p className="text-xs text-ink/45">No hay otros usuarios registrados todavía.</p>
                      )}
                      {users.filter((u) => u.id !== uid).map((u) => (
                        <label key={u.id} className="flex items-center gap-2 text-xs text-ink/80 hover:text-ink">
                          <input
                            type="checkbox"
                            checked={shareUserIds.includes(u.id)}
                            onChange={() => setShareUserIds(toggleId(shareUserIds, u.id))}
                          />
                          <span className="truncate font-medium">{u.display_name}</span>
                          {u.email && <span className="truncate text-ink/45">({u.email})</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <Btn type="submit" tone="gold" disabled={uploading || !selectedFile} className="w-full !py-2">
              {uploading ? 'Subiendo archivo…' : 'Subir y guardar permisos'}
            </Btn>
          </form>
        )}
      </Panel>

      <Panel
        title={`Archivos disponibles (${filteredFiles.length})`}
        actions={<Text value={filterText} onChange={setFilterText} placeholder="Buscar archivo…" />}
      >
        {!filteredFiles.length && <Empty>No hay archivos subidos o compartidos contigo todavía.</Empty>}
        <ul className="divide-y divide-white/10">
          {filteredFiles.map((f) => {
            const owner = users.find((u) => u.id === f.owner_id)
            const canEdit = f.owner_id === uid || isAllFilesManager
            const sharedRoles = roles.filter((r) => f.role_ids.includes(r.id))
            const sharedUsers = users.filter((u) => f.user_ids.includes(u.id))

            return (
              <li key={f.id} className="py-3 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink truncate">{f.title}</p>
                    <p className="text-xs text-ink/50">
                      {f.file_name} · {formatBytes(f.size_bytes)} · Subido por <strong className="text-ink/75">{owner?.display_name ?? 'Usuario'}</strong>
                    </p>
                    {f.description && <p className="mt-1 text-xs text-ink/75">{f.description}</p>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Btn tone="holo" onClick={() => handleDownload(f)}>Descargar / Abrir</Btn>
                    {canEdit && <Btn tone="ghost" onClick={() => setEditingSharesFile(f)}>Permisos</Btn>}
                    {canEdit && <Btn tone="doom" onClick={() => handleDelete(f)}>Borrar</Btn>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-ink/45">Acceso:</span>
                  {f.is_public ? (
                    <span className="rounded border border-good/50 bg-good/10 px-2 py-0.5 text-good">Público (todos los usuarios)</span>
                  ) : (
                    <>
                      {sharedRoles.map((r) => <RoleBadge key={r.id} role={r} />)}
                      {sharedUsers.map((u) => (
                        <span key={u.id} className="rounded border border-holo/40 bg-holo/10 px-2 py-0.5 text-holo">
                          👤 {u.display_name}
                        </span>
                      ))}
                      {sharedRoles.length === 0 && sharedUsers.length === 0 && (
                        <span className="rounded border border-white/15 px-2 py-0.5 text-ink/50">Solo propietario y Admins</span>
                      )}
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </Panel>

      {editingSharesFile && (
        <EditFileSharesModal
          file={editingSharesFile}
          onClose={() => setEditingSharesFile(null)}
          run={run}
        />
      )}
    </div>
  )
}

function EditFileSharesModal({
  file,
  onClose,
  run,
}: {
  file: SharedFileRecord
  onClose: () => void
  run: (p: PromiseLike<{ error: { message?: string } | null }>, ok: string) => Promise<boolean>
}) {
  const { roles, users } = useOnline()
  const [isPublic, setIsPublic] = useState(file.is_public)
  const [roleIds, setRoleIds] = useState<string[]>(file.role_ids)
  const [userIds, setUserIds] = useState<string[]>(file.user_ids)

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id]

  return (
    <Modal open onClose={onClose} title={`Permisos de "${file.title}"`}>
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm text-ink/90">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          <span>Público para todos los usuarios registrados</span>
        </label>

        {!isPublic && (
          <>
            <div>
              <p className="mb-2 text-xs font-display text-holo">Roles con acceso a este archivo</p>
              <div className="flex flex-wrap gap-2">
                {roles.map((r) => {
                  const active = roleIds.includes(r.id)
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRoleIds(toggle(roleIds, r.id))}
                      className={`rounded-md border px-2.5 py-1 text-xs transition ${
                        active ? 'border-holo bg-holo/20 text-holo' : 'border-white/15 text-ink/60 hover:text-ink'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}{r.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-display text-holo">Usuarios concretos con acceso</p>
              <div className="max-h-48 overflow-y-auto rounded border border-white/10 p-2.5 space-y-1.5">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-xs text-ink/85">
                    <input
                      type="checkbox"
                      checked={userIds.includes(u.id)}
                      onChange={() => setUserIds(toggle(userIds, u.id))}
                    />
                    <span className="font-medium">{u.display_name}</span>
                    {u.email && <span className="text-ink/50">({u.email})</span>}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Btn tone="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn
            tone="gold"
            onClick={async () => {
              const ok = await run(
                supabase!.rpc('set_file_shares', {
                  p_file_id: file.id,
                  p_is_public: isPublic,
                  p_role_ids: roleIds,
                  p_user_ids: userIds,
                }),
                'Permisos del archivo actualizados'
              )
              if (ok) onClose()
            }}
          >
            Guardar cambios
          </Btn>
        </div>
      </div>
    </Modal>
  )
}

function UsersDirectoryTab({
  isRoleManager,
  run,
}: {
  isRoleManager: boolean
  run: (p: PromiseLike<{ error: { message?: string } | null }>, ok: string) => Promise<boolean>
}) {
  const { users, roles, userRoles } = useOnline()
  const [query, setQuery] = useState('')

  const filtered = users.filter((u) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return u.display_name.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q)
  })

  return (
    <Panel
      title={`Registro de usuarios (${filtered.length})`}
      actions={<Text value={query} onChange={setQuery} placeholder="Buscar por nombre o correo…" />}
    >
      {!isRoleManager && (
        <p className="mb-3 text-xs text-ink/60">
          Puedes consultar los usuarios registrados y sus roles. Solo los usuarios con permiso de Admin pueden asignar o quitar roles.
        </p>
      )}
      {!filtered.length && <Empty>No se encontraron usuarios.</Empty>}
      <ul className="divide-y divide-white/10">
        {filtered.map((u) => {
          const assignedIds = new Set(userRoles.filter((ur) => ur.user_id === u.id).map((ur) => ur.role_id))
          const assignedRoles = roles.filter((r) => assignedIds.has(r.id))

          return (
            <li key={u.id} className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-ink">
                  {u.display_name}
                  {u.is_admin && <span className="ml-2 rounded border border-gold/60 px-1.5 py-0.5 text-[10px] text-gold">ADMIN</span>}
                </p>
                {u.email && <p className="text-xs text-ink/50">{u.email}</p>}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {isRoleManager ? (
                  roles.map((r) => {
                    const has = assignedIds.has(r.id)
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() =>
                          run(
                            supabase!.rpc('set_user_role', {
                              p_user_id: u.id,
                              p_role_id: r.id,
                              p_assign: !has,
                            }),
                            has ? `Rol ${r.name} retirado de ${u.display_name}` : `Rol ${r.name} asignado a ${u.display_name}`
                          )
                        }
                        className={`rounded-md border px-2 py-1 text-xs transition ${
                          has ? 'font-medium' : 'border-white/15 text-ink/45 hover:text-ink/80'
                        }`}
                        style={has ? { borderColor: r.color, color: r.color, backgroundColor: `${r.color}1a` } : undefined}
                        title={has ? `Quitar rol ${r.name}` : `Asignar rol ${r.name}`}
                      >
                        {has ? '✓ ' : '+ '}{r.name}
                      </button>
                    )
                  })
                ) : (
                  assignedRoles.length > 0
                    ? assignedRoles.map((r) => <RoleBadge key={r.id} role={r} />)
                    : <span className="text-xs text-ink/40">Sin roles</span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function RolesManagerTab({
  isRoleManager,
  run,
}: {
  isRoleManager: boolean
  run: (p: PromiseLike<{ error: { message?: string } | null }>, ok: string) => Promise<boolean>
}) {
  const { roles, userRoles } = useOnline()
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#5DEEFF')
  const [canManageRolesFlag, setCanManageRolesFlag] = useState(false)
  const [canGmFlag, setCanGmFlag] = useState(false)
  const [canUploadFlag, setCanUploadFlag] = useState(true)
  const [canManageAllFilesFlag, setCanManageAllFilesFlag] = useState(false)

  function loadRoleIntoForm(r: AppRole) {
    setSlug(r.slug)
    setName(r.name)
    setDescription(r.description)
    setColor(r.color)
    setCanManageRolesFlag(r.can_manage_roles)
    setCanGmFlag(r.can_gm)
    setCanUploadFlag(r.can_upload)
    setCanManageAllFilesFlag(r.can_manage_all_files)
  }

  function resetForm() {
    setSlug('')
    setName('')
    setDescription('')
    setColor('#5DEEFF')
    setCanManageRolesFlag(false)
    setCanGmFlag(false)
    setCanUploadFlag(true)
    setCanManageAllFilesFlag(false)
  }

  async function saveRole(e: React.FormEvent) {
    e.preventDefault()
    const cleanSlug = (slug.trim() || name.trim()).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
    if (cleanSlug.length < 2 || !name.trim()) return
    const ok = await run(
      supabase!.rpc('upsert_role', {
        p_slug: cleanSlug,
        p_name: name.trim(),
        p_description: description.trim(),
        p_color: color,
        p_can_manage_roles: canManageRolesFlag,
        p_can_gm: canGmFlag,
        p_can_upload: canUploadFlag,
        p_can_manage_all_files: canManageAllFilesFlag,
      }),
      `Rol "${name.trim()}" guardado`
    )
    if (ok) resetForm()
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
      <Panel title="Crear o editar rol">
        {!isRoleManager ? (
          <p className="text-sm text-ink/60">Solo los usuarios con permiso de Admin pueden crear o modificar roles.</p>
        ) : (
          <form onSubmit={saveRole} className="space-y-3">
            <Field label="Nombre del rol (ej. Master, Lorekeeper, VIP…)">
              <Text
                value={name}
                onChange={(v) => {
                  setName(v)
                  if (!slug) setSlug(v.toLowerCase().replace(/[^a-z0-9_-]+/g, '-'))
                }}
                placeholder="Nombre visible"
              />
            </Field>

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Field label="Identificador único (slug)">
                <Text value={slug} onChange={setSlug} placeholder="ej. master-auxiliar" />
              </Field>
              <Field label="Color">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded border border-white/15 bg-black/40 p-1"
                />
              </Field>
            </div>

            <Field label="Descripción">
              <Text value={description} onChange={setDescription} placeholder="Qué funciones o acceso tiene este rol" />
            </Field>

            <div className="rounded-lg border border-white/10 bg-black/25 p-3 space-y-2 text-xs">
              <p className="font-display text-holo">Permisos del rol:</p>
              <label className="flex items-center gap-2 text-ink/85">
                <input type="checkbox" checked={canUploadFlag} onChange={(e) => setCanUploadFlag(e.target.checked)} />
                <span>Puede subir y compartir archivos</span>
              </label>
              <label className="flex items-center gap-2 text-ink/85">
                <input type="checkbox" checked={canGmFlag} onChange={(e) => setCanGmFlag(e.target.checked)} />
                <span>Permisos de Master / Director de juego</span>
              </label>
              <label className="flex items-center gap-2 text-ink/85">
                <input type="checkbox" checked={canManageAllFilesFlag} onChange={(e) => setCanManageAllFilesFlag(e.target.checked)} />
                <span>Puede gestionar y moderar todos los archivos subidos</span>
              </label>
              <label className="flex items-center gap-2 text-ink/85">
                <input type="checkbox" checked={canManageRolesFlag} onChange={(e) => setCanManageRolesFlag(e.target.checked)} />
                <span>Puede crear roles y asignarlos a otros usuarios (Admin)</span>
              </label>
            </div>

            <div className="flex gap-2">
              <Btn type="submit" tone="gold" disabled={!name.trim()} className="flex-1">Guardar rol</Btn>
              <Btn type="button" tone="ghost" onClick={resetForm}>Limpiar</Btn>
            </div>
          </form>
        )}
      </Panel>

      <Panel title={`Roles del sistema y personalizados (${roles.length})`}>
        <ul className="divide-y divide-white/10">
          {roles.map((r) => {
            const count = userRoles.filter((ur) => ur.role_id === r.id).length
            return (
              <li key={r.id} className="py-3 flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <RoleBadge role={r} />
                    <span className="font-mono text-xs text-ink/45">#{r.slug}</span>
                    {r.is_system && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-ink/70">Sistema</span>}
                    <span className="text-xs text-ink/50">· {count} usuario(s)</span>
                  </div>
                  {r.description && <p className="text-xs text-ink/70">{r.description}</p>}
                  <div className="flex flex-wrap gap-1.5 pt-0.5 text-[11px] text-ink/55">
                    {r.can_manage_roles && <span className="rounded border border-gold/40 px-1.5 py-0.5 text-gold">Gestiona roles y usuarios</span>}
                    {r.can_gm && <span className="rounded border border-energy/40 px-1.5 py-0.5 text-energy">Permiso Master</span>}
                    {r.can_upload && <span className="rounded border border-holo/40 px-1.5 py-0.5 text-holo">Sube archivos</span>}
                    {r.can_manage_all_files && <span className="rounded border border-good/40 px-1.5 py-0.5 text-good">Modera archivos</span>}
                  </div>
                </div>

                {isRoleManager && (
                  <div className="flex gap-1.5">
                    <Btn tone="ghost" onClick={() => loadRoleIntoForm(r)}>Editar</Btn>
                    {!r.is_system && (
                      <Btn
                        tone="doom"
                        onClick={() =>
                          confirmAction(`¿Eliminar el rol "${r.name}"?`) &&
                          run(supabase!.rpc('delete_role', { p_role_id: r.id }), 'Rol eliminado')
                        }
                      >
                        Eliminar
                      </Btn>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </Panel>
    </div>
  )
}
