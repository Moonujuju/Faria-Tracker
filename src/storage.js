import { supabase } from './supabase.js'

const TABLE = 'tracker_state'

let lastSaveTimestamp = 0
const ECHO_WINDOW_MS = 3000

export async function loadState(key = 'main') {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('state')
        .eq('id', key)
        .single()

      if (!error && data?.state) {
        return data.state
      }
    } catch (e) {
      console.warn('Supabase load failed, falling back to localStorage', e)
    }
  }

  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {}

  return null
}

export async function saveState(key = 'main', state) {
  lastSaveTimestamp = Date.now()

  try {
    localStorage.setItem(key, JSON.stringify(state))
  } catch {}

  if (supabase) {
    try {
      const { error } = await supabase
        .from(TABLE)
        .upsert({ id: key, state, updated_at: new Date().toISOString() })

      if (error) console.warn('Supabase save failed:', error.message)
    } catch (e) {
      console.warn('Supabase save failed:', e)
    }
  }
}

export function subscribeToChanges(key = 'main', onUpdate) {
  if (!supabase) return () => {}

  const channel = supabase
    .channel(`tracker-changes-${key}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE, filter: `id=eq.${key}` },
      (payload) => {
        if (Date.now() - lastSaveTimestamp < ECHO_WINDOW_MS) return
        if (payload.new?.state) {
          onUpdate(payload.new.state)
        }
      }
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}
