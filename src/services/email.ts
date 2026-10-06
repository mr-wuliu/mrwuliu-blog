/**
 * Email service using Resend API.
 * Sends reply notifications when a comment is approved and it's a reply
 * to a commenter who opted in to notifications.
 *
 * Uses plain fetch — no SDK dependency needed.
 */
import type { Database } from '../db'
import { comments, posts, users } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { commentText } from '../utils/html'
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

  // Registered users are governed by their current users.notifyOnReply setting;
  // visitors (and deleted users) by the comment's stored flag.
  if (parent.userId) {
    const [parentUser] = await db
      .select({ notifyOnReply: users.notifyOnReply })
      .from(users)
      .where(eq(users.id, parent.userId))
    if (parentUser && !parentUser.notifyOnReply) return
  }

  // Parent must have an email
  if (!parent.authorEmail) return

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
    postTitle: lang === 'en' && post.titleEn ? post.titleEn : post.title,
    postUrl,
    replyAuthor: replyComment.authorName,
    replyContent: commentText(replyComment.content),
    parentAuthor: parent.authorName,
    unsubscribeUrls: { zh: zhUnsubUrl, en: enUnsubUrl },
    lang,
  })

  const fromAddress = `noreply@${env.MAIL_DOMAIN}`

  const claimed = await db.update(comments).set({ replyNotified: true })
    .where(and(eq(comments.id, replyComment.id), eq(comments.status, 'approved'), eq(comments.replyNotified, false)))
    .returning({ id: comments.id })
  if (claimed.length === 0) return

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `comment-reply-${replyComment.id}`,
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
      throw new Error(`Resend HTTP ${res.status}`)
    }

  } catch (error) {
    await db.update(comments).set({ replyNotified: false }).where(eq(comments.id, replyComment.id))
    console.error('[email] notification failed', error)
  }
}
