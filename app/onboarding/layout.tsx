import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: firmProfile } = await supabase
    .from('firm_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (firmProfile) {
    redirect('/dashboard')
  }

  return <>{children}</>
}