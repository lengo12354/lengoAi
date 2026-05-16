'use server'

import { createClient } from '@/lib/supabase/server'

// 1 Hour = 3000 tokens
// 3600 seconds = 3000 tokens
// 1 second = 3000/3600 = 0.8333... tokens
const TOKENS_PER_SECOND = 3000 / 3600

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

export async function deductFixedTokens(amount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized. Please log in.' }
  }

  // Fetch current balance
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tokens_balance')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { success: false, error: 'Could not fetch token balance.' }
  }

  if (profile.tokens_balance < amount) {
    return { 
      success: false, 
      error: `Insufficient tokens. You need ${amount} tokens but only have ${profile.tokens_balance}.` 
    }
  }

  // Deduct tokens
  const newBalance = profile.tokens_balance - amount
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ tokens_balance: newBalance })
    .eq('id', user.id)

  if (updateError) {
    return { success: false, error: 'Failed to deduct tokens.' }
  }

  return { success: true, tokensDeducted: amount, remainingBalance: newBalance }
}

// Called after signup to create profile with 200 free tokens if not already exists
export async function initUserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false }

  // Check if profile already exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, tokens_balance')
    .eq('id', user.id)
    .single()

  // If profile exists and already has tokens, skip (returning user)
  if (existing && existing.tokens_balance > 0) {
    return { success: true, alreadyExists: true }
  }

  // If profile exists but has 0 tokens (created by DB trigger), give them 200
  if (existing && existing.tokens_balance === 0) {
    const { error } = await supabase
      .from('profiles')
      .update({ tokens_balance: 200 })
      .eq('id', user.id)

    if (error) return { success: false, error: error.message }
    return { success: true, alreadyExists: true, tokensGranted: true }
  }

  // No profile at all — create new one with 200 free tokens
  const { error } = await supabase
    .from('profiles')
    .insert({ id: user.id, tokens_balance: 200 })

  if (error) return { success: false, error: error.message }

  return { success: true, alreadyExists: false }
}
