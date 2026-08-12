import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsForm from './SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: firmProfile } = await supabase
    .from('firm_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return <SettingsForm firmProfile={firmProfile} />
}