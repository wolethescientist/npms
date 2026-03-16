'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Send, Paperclip, X, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? 'policy-documents';
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/webp',
];

type SaveStatus = 'idle' | 'uploading' | 'saving' | 'done' | 'error';

export default function NewPolicyPage() {
  const router = useRouter();

  // form fields
  const [title, setTitle] = useState('');
  const [mdaId, setMdaId] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [mdaList, setMdaList] = useState<{ id: string; code: string; name: string }[]>([]);

  useEffect(() => {
    createClient()
      .from('mdas')
      .select('id, code, name')
      .order('code')
      .then(({ data }) => { if (data) setMdaList(data); });
  }, []);

  // ui state
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const saving = status === 'uploading' || status === 'saving';

  /* ── file picker ─────────────────────────────────────────── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    if (!picked) return;

    if (!ALLOWED_TYPES.includes(picked.type)) {
      setErrorMsg('Unsupported file type. Please upload PDF, DOCX, PNG, or JPEG.');
      e.target.value = '';
      return;
    }
    if (picked.size > MAX_FILE_BYTES) {
      setErrorMsg('File exceeds 10 MB limit.');
      e.target.value = '';
      return;
    }

    setErrorMsg('');
    setFile(picked);
  };

  const clearFile = () => {
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  /* ── submit ──────────────────────────────────────────────── */
  const handleSave = async (action: 'save' | 'submit') => {
    if (!title.trim()) {
      setErrorMsg('Policy title is required.');
      return;
    }
    if (!mdaId) {
      setErrorMsg('Please select a Ministry / Department / Agency.');
      return;
    }

    setErrorMsg('');
    setStatus('idle');

    // Get current user from localStorage (JWT session)
    const raw = localStorage.getItem('demo_user');
    if (!raw) {
      setErrorMsg('You must be signed in to create a policy.');
      return;
    }
    const currentUser = JSON.parse(raw);

    const supabase = createClient();
    let attachmentUrl: string | null = null;

    // 1. upload attachment if one was chosen
    if (file) {
      setStatus('uploading');
      const ext = file.name.split('.').pop();
      const path = `${currentUser.id}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false });

      if (uploadErr) {
        setStatus('error');
        setErrorMsg(`Upload failed: ${uploadErr.message}`);
        return;
      }

      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 365);

      attachmentUrl = signed?.signedUrl ?? null;
    }

    // 2. insert policy row
    setStatus('saving');
    const { data: inserted, error: insertErr } = await supabase
      .from('policies')
      .insert({
        title: title.trim(),
        body: body.trim() || null,
        mda_id: mdaId,
        owner_id: currentUser.id,
        status: 'draft',
        attachment_url: attachmentUrl,
        version: 1,
      })
      .select('id')
      .single();

    if (insertErr || !inserted) {
      setStatus('error');
      setErrorMsg(`Could not save policy: ${insertErr?.message ?? 'Unknown error'}`);
      return;
    }

    // [NEW: create workflow steps on submit]
    if (action === 'submit') {
      const { submitForReview } = await import('@/lib/actions/workflow');
      const { error: wfErr } = await submitForReview(inserted.id, currentUser.id);
      if (wfErr) {
        setStatus('error');
        setErrorMsg(`Policy saved but workflow failed: ${wfErr}`);
        return;
      }
    }
    // [END NEW]

    setStatus('done');
    setTimeout(() => router.push('/policies'), 800);
  };

  /* ── render ──────────────────────────────────────────────── */
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2 text-muted-foreground hover:text-foreground">
          <Link href="/policies">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Policies
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Create New Policy</h1>
        <p className="text-sm text-muted-foreground">
          Draft a new policy document. You can save as draft and submit for review later.
        </p>
      </div>

      {/* error / success banners */}
      {errorMsg && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}
      {status === 'done' && (
        <div className="flex items-center gap-2.5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Policy saved! Redirecting…
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Policy Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* title */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium mb-1.5">
              Policy Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. National Digital Literacy Framework"
              className="h-11"
              disabled={saving}
            />
          </div>

          {/* MDA */}
          <div>
            <Label htmlFor="mda" className="text-sm font-medium mb-1.5">
              Ministry / Department / Agency <span className="text-red-500">*</span>
            </Label>
            <Select value={mdaId} onValueChange={(v) => setMdaId(v ?? '')} disabled={saving}>
              <SelectTrigger id="mda" className="h-11">
                {mdaId
                  ? (() => { const m = mdaList.find((x) => x.id === mdaId); return m ? `${m.code} — ${m.name}` : mdaId; })()
                  : <span className="text-muted-foreground text-sm">Select MDA</span>
                }
              </SelectTrigger>
              <SelectContent>
                {mdaList.map((m) => (
                  <SelectItem key={m.id} value={m.id} label={`${m.code} — ${m.name}`}>
                    {m.code} — {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* body */}
          <div>
            <Label htmlFor="body" className="text-sm font-medium mb-1.5">
              Policy Document Body
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              In the full version, this will be a rich-text editor. For the MVP demo, use plain text.
            </p>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter the policy document content here..."
              rows={14}
              className="resize-y min-h-[200px]"
              disabled={saving}
            />
          </div>

          {/* attachment */}
          <div>
            <Label htmlFor="attachment" className="text-sm font-medium mb-1.5">
              Attachment (optional)
            </Label>

            {file ? (
              /* file chosen – show chip */
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3">
                <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  onClick={clearFile}
                  disabled={saving}
                  className="ml-1 rounded p-0.5 hover:bg-muted disabled:opacity-50"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <>
                <Input
                  id="attachment"
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileChange}
                  className="h-11 cursor-pointer"
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, or image. Max 10 MB.</p>
              </>
            )}

            {/* upload progress label */}
            {status === 'uploading' && (
              <p className="mt-2 text-xs text-muted-foreground animate-pulse">
                Uploading attachment…
              </p>
            )}
            {status === 'saving' && (
              <p className="mt-2 text-xs text-muted-foreground animate-pulse">
                Saving policy…
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 justify-end pb-8">
        <Button variant="outline" onClick={() => router.push('/policies')} disabled={saving}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={() => handleSave('save')} disabled={saving}>
          {saving ? (
            <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save as Draft
        </Button>
        <Button
          className="bg-[#0F6E56] hover:bg-[#085041] shadow-lg shadow-[#0F6E56]/20"
          onClick={() => handleSave('submit')}
          disabled={saving}
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Save &amp; Submit for Review
        </Button>
      </div>
    </div>
  );
}
