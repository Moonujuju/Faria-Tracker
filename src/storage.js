import { supabase } from './supabase.js'

const TABLE = 'tracker_state'
const ROW_ID = 'main'

// Guard to ignore realtime echoes of our own writes
let lastSaveTimestamp = 0
const ECHO_WINDOW_MS = 3000

export async function loadState() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('state')
        .eq('id', ROW_ID)
        .single()

      if (!error && data?.state) {
        return data.state
      }
    } catch (e) {
      console.warn('Supabase load failed, falling back to localStorage', e)
    }
  }

  try {
    const raw = localStorage.getItem('faria-tracker')
    if (raw) return JSON.parse(raw)
  } catch {}

  return null
}

export async function saveState(state) {
  // Mark that we just saved so we can ignore the realtime echo
  lastSaveTimestamp = Date.now()

  try {
    localStorage.setItem('faria-tracker', JSON.stringify(state))
  } catch {}

  if (supabase) {
    try {
      const { error } = await supabase
        .from(TABLE)
        .upsert({ id: ROW_ID, state, updated_at: new Date().toISOString() })

      if (error) console.warn('Supabase save failed:', error.message)
    } catch (e) {
      console.warn('Supabase save failed:', e)
    }
  }
}

export function subscribeToChanges(onUpdate) {
  if (!supabase) return () => {}

  const channel = supabase
    .channel('tracker-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE, filter: `id=eq.${ROW_ID}` },
      (payload) => {
        // Ignore echoes of our own saves
        if (Date.now() - lastSaveTimestamp < ECHO_WINDOW_MS) return
        if (payload.new?.state) {
          onUpdate(payload.new.state)
        }
      }
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}
