interface OtpEmailParams {
  apiKey: string
  from: string
  to: string
  code: string
  lang: 'zh' | 'en'
  siteName: string
}

function templateZh(code: string, siteName: string): { subject: string; html: string; text: string } {
  return {
    subject: `【${siteName}】登录验证码`,
    text: `您的登录验证码是：${code}\n\n验证码 10 分钟内有效。如果不是您本人操作，请忽略此邮件。`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,sans-serif"><div style="max-width:480px;margin:0 auto;padding:32px 24px"><div style="background:#fff;border-radius:12px;padding:32px 24px;text-align:center"><h1 style="margin:0 0 16px;font-size:20px;color:#18181b">${siteName}</h1><p style="margin:0 0 24px;color:#52525b;font-size:14px">您的登录验证码</p><div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#2563eb;background:#eff6ff;border-radius:8px;padding:20px 0;margin:0 0 24px">${code}</div><p style="margin:0 0 8px;color:#71717a;font-size:13px">验证码 10 分钟内有效</p><p style="margin:0;color:#a1a1aa;font-size:12px">如果不是您本人操作，请忽略此邮件</p></div></div></body></html>`,
  }
}

function templateEn(code: string, siteName: string): { subject: string; html: string; text: string } {
  return {
    subject: `[${siteName}] Login Verification Code`,
    text: `Your login verification code is: ${code}\n\nThis code expires in 10 minutes. If you did not request this, please ignore this email.`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,sans-serif"><div style="max-width:480px;margin:0 auto;padding:32px 24px"><div style="background:#fff;border-radius:12px;padding:32px 24px;text-align:center"><h1 style="margin:0 0 16px;font-size:20px;color:#18181b">${siteName}</h1><p style="margin:0 0 24px;color:#52525b;font-size:14px">Your login verification code</p><div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#2563eb;background:#eff6ff;border-radius:8px;padding:20px 0;margin:0 0 24px">${code}</div><p style="margin:0 0 8px;color:#71717a;font-size:13px">This code expires in 10 minutes</p><p style="margin:0;color:#a1a1aa;font-size:12px">If you did not request this, please ignore this email</p></div></div></body></html>`,
  }
}

export async function sendOtpEmail(params: OtpEmailParams): Promise<boolean> {
  const { subject, html, text } = params.lang === 'zh'
    ? templateZh(params.code, params.siteName)
    : templateEn(params.code, params.siteName)

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      subject,
      html,
      text,
    }),
  })

  return resp.ok
}
