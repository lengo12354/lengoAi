import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Fetch user's activity history
export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const toolId = searchParams.get('tool_id')

    let query = supabase
      .from('activity_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (toolId) {
      query = query.eq('tool_id', toolId)
    }

    const { data, error } = await query
    if (error) {
      console.error('[Activity History GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ history: data || [] })
  } catch (err: any) {
    console.error('[Activity History GET] Catch:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

// POST: Save a new activity history item
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { tool_id, youtube_url, input_text, data: itemData } = body

    if (!tool_id) {
      return NextResponse.json({ error: 'tool_id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('activity_history')
      .insert({
        user_id: user.id,
        tool_id,
        youtube_url: youtube_url || null,
        input_text: input_text || null,
        data: itemData || {},
      })
      .select()
      .single()

    if (error) {
      console.error('[Activity History POST]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ item: data })
  } catch (err: any) {
    console.error('[Activity History POST] Catch:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

// DELETE: Delete one or all activity history items
export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const toolId = searchParams.get('tool_id')

    if (id === 'all' && toolId) {
      // Delete all items for a specific tool
      const { error } = await supabase
        .from('activity_history')
        .delete()
        .eq('user_id', user.id)
        .eq('tool_id', toolId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (id) {
      // Delete a single item
      const { error } = await supabase
        .from('activity_history')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'id or tool_id parameter required' }, { status: 400 })
  } catch (err: any) {
    console.error('[Activity History DELETE] Catch:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
