import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isResponse } from '@/lib/admin-auth'
import { isUploadKind, objectPath, UPLOAD_RULES, validateDeclared } from '@/lib/books/uploads'

// Step 1 of an admin upload: validate what the browser says it will upload, then hand back a signed
// upload URL for a random path. The browser uploads directly to storage (no size limit from the function).
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (isResponse(auth)) return auth
  const b = await req.json().catch(() => ({}))
  if (!isUploadKind(b.kind) || typeof b.bookId !== 'string' || !/^[0-9a-f-]{36}$/i.test(b.bookId)) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  const problem = validateDeclared(b.kind, String(b.filename || ''), Number(b.size), String(b.contentType || ''))
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const { data: book } = await auth.db.from('books').select('id').eq('id', b.bookId).maybeSingle()
  if (!book) return NextResponse.json({ error: 'Save the book first, then upload files' }, { status: 404 })

  const path = objectPath(b.bookId, b.kind, String(b.filename))
  const bucket = UPLOAD_RULES[b.kind as keyof typeof UPLOAD_RULES].bucket
  const { data, error } = await auth.db.storage.from(bucket).createSignedUploadUrl(path)
  if (error || !data) return NextResponse.json({ error: error?.message || 'Could not prepare the upload' }, { status: 500 })
  return NextResponse.json({ bucket, path, token: data.token, signedUrl: data.signedUrl })
}
