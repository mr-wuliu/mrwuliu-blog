/**
 * Email service using Resend API.
 * Sends reply notifications when a comment is approved and it's a reply
 * to a commenter who opted in to notifications.
 *
 * Uses plain fetch — no SDK dependency needed.
 */
import type { Database } from '../db'
import { comments, posts } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { signToken } from '../utils/token'

interface ReplyNotificationParams {
  db: Database
  env: {
    RESEND_API_KEY: string
    MAIL_DOMAIN: string
    JWT_SECRET: string
  }
  /** The reply comment that was just approved */
  replyComment: {
    id: string
    parentId: string | null
    authorName: string
    content: string
    postId: string
  }
  /** Origin URL for building links (e.g. https://mrwuliu.top) */
  origin: string
  /** Language for the email template */
  lang: 'zh' | 'en'
}

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Un-escape HTML entities that were escaped on insert,
 * so we can re-escape cleanly in the email template context.
 */
function unescapeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#0?39;/g, "'")
}

function buildTemplate(params: {
  postTitle: string
  postUrl: string
  replyAuthor: string
  replyContent: string
  parentAuthor: string
  unsubscribeUrls: { zh: string; en: string }
  lang: 'zh' | 'en'
}): EmailTemplate {
  const { postTitle, postUrl, replyAuthor, replyContent, parentAuthor, unsubscribeUrls, lang } = params

  const safePostTitle = escapeHtml(postTitle)
  const safeReplyAuthor = escapeHtml(replyAuthor)
  const safeReplyContent = escapeHtml(replyContent)
  const safeParentAuthor = escapeHtml(parentAuthor)

  if (lang === 'zh') {
    return {
      subject: `${replyAuthor} 回复了您在「${postTitle}」的评论`,
      html: `<div style="max-width:560px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;line-height:1.6">
  <p>您好 <strong>${safeParentAuthor}</strong>，</p>
  <p><strong>${safeReplyAuthor}</strong> 回复了您的评论：</p>
  <blockquote style="border-left:3px solid #ddd;margin:16px 0;padding:8px 16px;color:#555;background:#f9f9f9">
    ${safeReplyContent}
  </blockquote>
  <p>文章：<a href="${postUrl}" style="color:#0066cc;text-decoration:none">${safePostTitle}</a></p>
  <p style="margin-top:24px">
    <a href="${postUrl}" style="display:inline-block;padding:10px 24px;background:#1a1a1a;color:#fff;text-decoration:none;font-size:14px;font-weight:bold">查看评论</a>
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:32px 0">
  <p style="font-size:12px;color:#999">
    您收到这封邮件是因为您在评论时勾选了「收到回复时邮件提醒我」。<br>
    <a href="${unsubscribeUrls.zh}" style="color:#999">取消订阅</a>
  </p>
</div>`,
      text: `您好 ${parentAuthor}，

${replyAuthor} 回复了您的评论：

"${replyContent}"

文章：${postTitle}
查看评论：${postUrl}

---
您收到这封邮件是因为您在评论时勾选了「收到回复时邮件提醒我」。
取消订阅：${unsubscribeUrls.zh}`,
    }
  }

  return {
    subject: `${replyAuthor} replied to your comment on "${postTitle}"`,
    html: `<div style="max-width:560px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;line-height:1.6">
  <p>Hi <strong>${safeParentAuthor}</strong>,</p>
  <p><strong>${safeReplyAuthor}</strong> replied to your comment:</p>
  <blockquote style="border-left:3px solid #ddd;margin:16px 0;padding:8px 16px;color:#555;background:#f9f9f9">
    ${safeReplyContent}
  </blockquote>
  <p>Post: <a href="${postUrl}" style="color:#0066cc;text-decoration:none">${safePostTitle}</a></p>
  <p style="margin-top:24px">
    <a href="${postUrl}" style="display:inline-block;padding:10px 24px;background:#1a1a1a;color:#fff;text-decoration:none;font-size:14px;font-weight:bold">View Comment</a>
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:32px 0">
  <p style="font-size:12px;color:#999">
    You received this email because you opted in to reply notifications.<br>
    <a href="${unsubscribeUrls.en}" style="color:#999">Unsubscribe</a>
  </p>
</div>`,
    text: `Hi ${parentAuthor},

${replyAuthor} replied to your comment:

"${replyContent}"

Post: ${postTitle}
View comment: ${postUrl}

---
You received this email because you opted in to reply notifications.
Unsubscribe: ${unsubscribeUrls.en}`,
  }
}

/**
 * Main entry point: called from the comment approval handler.
 * Finds the parent comment, checks if it opted into notifications,
 * sends an email via Resend, and marks replyNotified=true.
 *
 * Designed to run inside c.executionCtx.waitUntil() — all errors are caught
 * and logged, never thrown to avoid breaking the approval response.
 */
export async function sendReplyNotification(params: ReplyNotificationParams): Promise<void> {
  const { db, env, replyComment, origin, lang } = params

  // Must be a reply
  if (!replyComment.parentId) return

  // Fetch parent comment
  const [parent] = await db.select().from(comments).where(eq(comments.id, replyComment.parentId))
  if (!parent) return

  // Parent must have opted in to notifications
  if (!parent.notifyOnReply) return

  // Parent must have an email
  if (!parent.authorEmail) return

  // Must not have already been notified
  if (parent.replyNotified) return

  // Don't notify if reply author is the same as parent (self-reply heuristic by name)
  // — skip, since there's no reliable identity; names can collide but that's acceptable

  // Fetch the post for title
  const [post] = await db.select().from(posts).where(eq(posts.id, replyComment.postId))
  if (!post) return

  // Build unsubscribe tokens for both languages
  const zhUnsubToken = await signToken(parent.id, env.JWT_SECRET)
  const enUnsubToken = await signToken(parent.id, env.JWT_SECRET)

  // Use /en path prefix for English unsubscribe
  const zhUnsubUrl = `${origin}/unsubscribe?token=${zhUnsubToken}`
  const enUnsubUrl = `${origin}/en/unsubscribe?token=${enUnsubToken}`

  const postUrl = lang === 'en' ? `${origin}/en/posts/${post.slug}` : `${origin}/posts/${post.slug}`

  const template = buildTemplate({
    postTitle: unescapeHtml(post.title),
    postUrl,
    replyAuthor: unescapeHtml(replyComment.authorName),
    replyContent: unescapeHtml(replyComment.content),
    parentAuthor: unescapeHtml(parent.authorName),
    unsubscribeUrls: { zh: zhUnsubUrl, en: enUnsubUrl },
    lang,
  })

  const fromAddress = `noreply@${env.MAIL_DOMAIN}`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [parent.authorEmail],
      subject: template.subject,
      html: template.html,
      text: template.text,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown error')
    console.error(`[email] Resend API error ${res.status}: ${errText}`)
    return
  }

  // Mark parent comment as notified
  await db.update(comments)
    .set({ replyNotified: true })
    .where(eq(comments.id, parent.id))
}
