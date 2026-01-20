import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface RequestBody {
  email: string
  user_uuid: string
  nickname: string
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { email, user_uuid, nickname } = (await req.json()) as RequestBody

    if (!email || !user_uuid) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const recoveryCode = crypto.randomUUID().split('-')[0].toUpperCase()
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { error: dbError } = await supabase.from('sf_recovery_codes').upsert(
      {
        email: email.toLowerCase(),
        code: recoveryCode,
        user_uuid,
        expires_at: new Date(expiresAt).toISOString(),
      },
      { onConflict: 'email' }
    )

    if (dbError) {
      console.error('Database error:', dbError)
      return new Response(JSON.stringify({ error: 'Failed to save recovery code' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SenseFlow <noreply@senseflow.ai>',
        to: email,
        subject: '您的 SenseFlow 账户恢复码',
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4f46e5;">SenseFlow 账户恢复</h2>
            <p>您好 <strong>${nickname || '用户'}</strong>，</p>
            <p>您正在请求恢复 SenseFlow 账户。以下是您的恢复码：</p>
            
            <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; letter-spacing: 8px; font-family: monospace; font-weight: bold; color: #4f46e5;">
                ${recoveryCode}
              </span>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              此验证码 <strong>24小时内有效</strong>。请在新设备的 SenseFlow 中输入此验证码来恢复您的账户。
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            
            <p style="color: #9ca3af; font-size: 12px;">
              如果您没有请求此验证码，请忽略此邮件。
            </p>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Resend error:', errorData)
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
