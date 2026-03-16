'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  GitBranch,
  Plus,
  Inbox,
  Send,
  Paperclip,
  CheckCircle2,
  XCircle,
  BookMarked,
  Clock,
  X,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { WorkflowRequestWithProfiles, Profile } from '@/lib/types/database.types';

// ─── Constants ───────────────────────────────────────────────────────────────

const ACTION_OPTIONS = [
  'Please review and approve',
  'Please sign off',
  'Please provide feedback',
  'Please acknowledge receipt',
  'For your information',
  'Please take action',
];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:  { label: 'Pending',  color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',  icon: Clock        },
  approved: { label: 'Approved', color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200',icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-700',    bg: 'bg-red-50 border-red-200',       icon: XCircle      },
  noted:    { label: 'Noted',    color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',     icon: BookMarked   },
};

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? 'policy-documents';
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [inbox, setInbox] = useState<WorkflowRequestWithProfiles[]>([]);
  const [sent, setSent] = useState<WorkflowRequestWithProfiles[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState('inbox');

  // action dialog state
  const [actionTarget, setActionTarget] = useState<WorkflowRequestWithProfiles | null>(null);
  const [actionType, setActionType] = useState<'approved' | 'rejected' | 'noted' | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [actioning, setActioning] = useState(false);

  const loadData = useCallback(async () => {
    const stored = localStorage.getItem('demo_user');
    if (!stored) return;
    const user: Profile = JSON.parse(stored);
    setCurrentUser(user);

    const supabase = createClient();
    setLoading(true);

    const [
      { data: inboxRaw },
      { data: sentRaw },
      { data: allUsers },
    ] = await Promise.all([
      supabase
        .from('workflow_requests')
        .select('*')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('workflow_requests')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
    ]);

    const profileMap: Record<string, Profile> = Object.fromEntries(
      (allUsers ?? []).map((p) => [p.id, p])
    );

    const enrich = (rows: any[]): WorkflowRequestWithProfiles[] =>
      rows.map((r) => ({
        ...r,
        creator: profileMap[r.created_by],
        assignee: profileMap[r.assigned_to],
      }));

    setInbox(enrich(inboxRaw ?? []));
    setSent(enrich(sentRaw ?? []));
    setUsers((allUsers ?? []).filter((u) => u.id !== user.id));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAction = async () => {
    if (!actionTarget || !actionType || !currentUser) return;
    setActioning(true);
    const supabase = createClient();
    await supabase
      .from('workflow_requests')
      .update({
        status: actionType,
        recipient_comment: actionComment.trim() || null,
        actioned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', actionTarget.id);

    setActionTarget(null);
    setActionType(null);
    setActionComment('');
    setActioning(false);
    loadData();
  };

  const pendingInboxCount = inbox.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-[#0F6E56]" />
            Workflow Requests
          </h1>
          <p className="text-sm text-muted-foreground">
            Create requests, assign them to colleagues, and track responses
          </p>
        </div>
        <Button
          className="bg-[#0F6E56] hover:bg-[#085041] gap-2 shadow-lg shadow-[#0F6E56]/20"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4" /> New Request
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <Inbox className="w-4 h-4" />
            Inbox
            {pendingInboxCount > 0 && (
              <span className="bg-[#0F6E56] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {pendingInboxCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Sent
          </TabsTrigger>
        </TabsList>

        {/* Inbox Tab */}
        <TabsContent value="inbox" className="mt-4">
          {loading ? (
            <LoadingSkeleton />
          ) : inbox.length === 0 ? (
            <EmptyState icon={Inbox} title="Your inbox is empty" sub="Requests sent to you will appear here." />
          ) : (
            <div className="space-y-3">
              {inbox.map((req) => (
                <InboxCard
                  key={req.id}
                  req={req}
                  onAction={(type) => {
                    setActionTarget(req);
                    setActionType(type);
                    setActionComment('');
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sent Tab */}
        <TabsContent value="sent" className="mt-4">
          {loading ? (
            <LoadingSkeleton />
          ) : sent.length === 0 ? (
            <EmptyState icon={Send} title="No requests sent yet" sub="Create a new request to get started." />
          ) : (
            <div className="space-y-3">
              {sent.map((req) => (
                <SentCard key={req.id} req={req} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      {showCreate && (
        <CreateRequestDialog
          users={users}
          currentUserId={currentUser?.id ?? ''}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadData(); setActiveTab('sent'); }}
        />
      )}

      {/* Action Dialog */}
      {actionTarget && actionType && (
        <Dialog open onOpenChange={() => { setActionTarget(null); setActionType(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {actionType === 'approved' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {actionType === 'rejected' && <XCircle className="w-5 h-5 text-red-600" />}
                {actionType === 'noted'    && <BookMarked className="w-5 h-5 text-blue-600" />}
                {actionType === 'approved' ? 'Approve Request'
                  : actionType === 'rejected' ? 'Reject Request'
                  : 'Mark as Noted'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p className="font-medium text-foreground">{actionTarget.title}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{actionTarget.action_requested}</p>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5">
                  Comment <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder="Add a comment for the sender..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => { setActionTarget(null); setActionType(null); }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAction}
                  disabled={actioning}
                  className={cn(
                    actionType === 'approved' && 'bg-emerald-600 hover:bg-emerald-700',
                    actionType === 'rejected' && 'bg-red-600 hover:bg-red-700',
                    actionType === 'noted'    && 'bg-blue-600 hover:bg-blue-700',
                  )}
                >
                  {actioning ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  ) : null}
                  Confirm
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── InboxCard ────────────────────────────────────────────────────────────────

function InboxCard({
  req,
  onAction,
}: {
  req: WorkflowRequestWithProfiles;
  onAction: (type: 'approved' | 'rejected' | 'noted') => void;
}) {
  const cfg = STATUS_CFG[req.status] ?? STATUS_CFG.pending;
  const Icon = cfg.icon;
  const isPending = req.status === 'pending';

  return (
    <Card className={cn('border transition-shadow hover:shadow-sm', isPending && 'border-amber-200')}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Sender avatar */}
          <div className="w-9 h-9 rounded-full bg-[#0F6E56]/15 text-[#0F6E56] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
            {getInitials(req.creator?.full_name ?? '??')}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm leading-tight">{req.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  From <span className="font-medium text-foreground">{req.creator?.full_name}</span>
                  {' · '}{formatDate(req.created_at)}
                </p>
              </div>
              <span className={cn('flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border shrink-0', cfg.bg, cfg.color)}>
                <Icon className="w-3 h-3" />
                {cfg.label}
              </span>
            </div>

            {/* Action requested */}
            <div className="mt-2 text-xs bg-muted/60 rounded-md px-3 py-2 text-muted-foreground">
              <span className="font-medium text-foreground">Requested: </span>{req.action_requested}
            </div>

            {/* Description */}
            {req.description && (
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{req.description}</p>
            )}

            {/* Attachment */}
            {req.attachment_url && (
              <a
                href={req.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#0F6E56] hover:underline"
              >
                <Paperclip className="w-3 h-3" />
                View Attachment
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {/* Recipient comment (if actioned) */}
            {req.recipient_comment && (
              <div className="mt-2 text-xs border-l-2 border-border pl-2 text-muted-foreground italic">
                Your response: "{req.recipient_comment}"
              </div>
            )}

            {/* Actions */}
            {isPending && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1"
                  onClick={() => onAction('approved')}
                >
                  <CheckCircle2 className="w-3 h-3" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 gap-1"
                  onClick={() => onAction('noted')}
                >
                  <BookMarked className="w-3 h-3" /> Note
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1"
                  onClick={() => onAction('rejected')}
                >
                  <XCircle className="w-3 h-3" /> Reject
                </Button>
              </div>
            )}

            {/* Actioned at */}
            {req.actioned_at && (
              <p className="mt-2 text-[10px] text-muted-foreground/60">
                Actioned {formatDate(req.actioned_at)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── SentCard ─────────────────────────────────────────────────────────────────

function SentCard({ req }: { req: WorkflowRequestWithProfiles }) {
  const cfg = STATUS_CFG[req.status] ?? STATUS_CFG.pending;
  const Icon = cfg.icon;

  return (
    <Card className="border hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Assignee avatar */}
          <div className="w-9 h-9 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
            {getInitials(req.assignee?.full_name ?? '??')}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm leading-tight">{req.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sent to <span className="font-medium text-foreground">{req.assignee?.full_name}</span>
                  {' · '}{formatDate(req.created_at)}
                </p>
              </div>
              <span className={cn('flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border shrink-0', cfg.bg, cfg.color)}>
                <Icon className="w-3 h-3" />
                {cfg.label}
              </span>
            </div>

            {/* Action requested */}
            <div className="mt-2 text-xs bg-muted/60 rounded-md px-3 py-2 text-muted-foreground">
              <span className="font-medium text-foreground">Requested: </span>{req.action_requested}
            </div>

            {/* Description */}
            {req.description && (
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{req.description}</p>
            )}

            {/* Attachment */}
            {req.attachment_url && (
              <a
                href={req.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#0F6E56] hover:underline"
              >
                <Paperclip className="w-3 h-3" />
                View Attachment
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {/* Recipient's response */}
            {req.recipient_comment && (
              <div className="mt-2 p-2 rounded-md bg-muted/60 text-xs">
                <p className="font-medium text-foreground mb-0.5">{req.assignee?.full_name} responded:</p>
                <p className="text-muted-foreground italic">"{req.recipient_comment}"</p>
              </div>
            )}

            {req.actioned_at && (
              <p className="mt-1.5 text-[10px] text-muted-foreground/60">
                Responded {formatDate(req.actioned_at)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── CreateRequestDialog ──────────────────────────────────────────────────────

function CreateRequestDialog({
  users,
  currentUserId,
  onClose,
  onCreated,
}: {
  users: Profile[];
  currentUserId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [actionRequested, setActionRequested] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const assignedUser = users.find((u) => u.id === assignedTo);

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!actionRequested) { setError('Please select the action you want performed.'); return; }
    if (!assignedTo) { setError('Please select who to send this to.'); return; }

    setError('');
    setSaving(true);
    const supabase = createClient();
    let attachmentUrl: string | null = null;

    if (file) {
      const ext = file.name.split('.').pop();
      const path = `${currentUserId}/wr-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (upErr) { setError(`Upload failed: ${upErr.message}`); setSaving(false); return; }
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
      attachmentUrl = signed?.signedUrl ?? null;
    }

    const { error: insertErr } = await supabase.from('workflow_requests').insert({
      title: title.trim(),
      description: description.trim() || null,
      action_requested: actionRequested,
      attachment_url: attachmentUrl,
      created_by: currentUserId,
      assigned_to: assignedTo,
      status: 'pending',
    });

    if (insertErr) { setError(`Failed to create request: ${insertErr.message}`); setSaving(false); return; }
    onCreated();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-[#0F6E56]" />
            New Workflow Request
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <Label className="text-sm font-medium mb-1.5">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q2 Budget Approval Request"
              disabled={saving}
            />
          </div>

          {/* Action Requested */}
          <div>
            <Label className="text-sm font-medium mb-1.5">
              Action Requested <span className="text-red-500">*</span>
            </Label>
            <Select value={actionRequested} onValueChange={setActionRequested} disabled={saving}>
              <SelectTrigger className="h-10 w-full">
                {actionRequested || <span className="text-muted-foreground text-sm">Select action type</span>}
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt} label={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Send To */}
          <div>
            <Label className="text-sm font-medium mb-1.5">
              Send To <span className="text-red-500">*</span>
            </Label>
            <Select value={assignedTo} onValueChange={setAssignedTo} disabled={saving}>
              <SelectTrigger className="h-10 w-full">
                {assignedUser
                  ? `${assignedUser.full_name}`
                  : <span className="text-muted-foreground text-sm">Select recipient</span>
                }
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id} label={u.full_name}>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#0F6E56]/15 text-[#0F6E56] text-[9px] font-bold flex items-center justify-center shrink-0">
                        {getInitials(u.full_name)}
                      </div>
                      <span>{u.full_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm font-medium mb-1.5">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional context or instructions..."
              rows={3}
              disabled={saving}
            />
          </div>

          {/* Attachment */}
          <div>
            <Label className="text-sm font-medium mb-1.5">
              Attachment <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            {file ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5">
                <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate text-sm">{file.name}</span>
                <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}>
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            ) : (
              <Input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f && f.size > MAX_FILE_BYTES) { setError('File exceeds 10 MB limit.'); e.target.value = ''; return; }
                  setFile(f);
                }}
                className="h-10 cursor-pointer"
                disabled={saving}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-1 border-t border-border">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-[#0F6E56] hover:bg-[#085041]"
            >
              {saving
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                : <Send className="w-4 h-4 mr-2" />
              }
              Send Request
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="w-9 h-9 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
                <div className="h-8 bg-muted rounded animate-pulse w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div className="py-16 text-center">
      <Icon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}
