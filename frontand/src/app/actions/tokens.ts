'use server'

import { createClient } from '@/lib/supabase/server'

// 1 Hour = 2000 tokens
// 3600 seconds = 2000 tokens
// 1 second = 2000/3600 = 0.5555... tokens
const TOKENS_PER_SECOND = 2000 / 3600

export async function calculateTokensRequired(durationInSeconds: number) {
  return Math.ceil(durationInSeconds * TOKENS_PER_SECOND)
}

export async function checkAndDeductTokens(durationInSeconds: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized. Please log in.' }
  }

  const tokensRequired = await calculateTokensRequired(durationInSeconds)

  // Fetch current balance
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tokens_balance')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { success: false, error: 'Could not fetch token balance.' }
  }

  if (profile.tokens_balance < tokensRequired) {
    return { 
      success: false, 
      error: `Insufficient tokens. You need ${tokensRequired} tokens but only have ${profile.tokens_balance}.` 
    }
  }

  // Deduct tokens
  const newBalance = profile.tokens_balance - tokensRequired
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ tokens_balance: newBalance })
    .eq('id', user.id)

  if (updateError) {
    return { success: false, error: 'Failed to deduct tokens.' }
  }

  return { success: true, tokensDeducted: tokensRequired, remainingBalance: newBalance }
}

export async function getUserTokens() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('tokens_balance')
    .eq('id', user.id)
    .single()

  return profile?.tokens_balance ?? null
}
