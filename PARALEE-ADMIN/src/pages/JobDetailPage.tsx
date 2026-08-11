import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useJob, useStartConversion, useRetryConversion, useFailConversion, useUploadConverted, useGenerateLink, useSendNotification, useAuditLogs, useDeleteJob, useSendEmail, useSendSms } from '../hooks/useJobs';
import { useCalibreConverter } from '../hooks/useCalibreConverter';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Loader2, ArrowLeft, Play, RotateCcw, XCircle, Upload, Link as LinkIcon, Send, User, Mail, Phone, Clock, CheckCircle, X, Wand2, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { open } from '@tauri-apps/plugin-dialog';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);
  
  const { data: job, isLoading, error } = useJob(jobId);
  const { data: auditLogs } = useAuditLogs(jobId);
  
  const startMutation = useStartConversion();
  const retryMutation = useRetryConversion();
  const failMutation = useFailConversion();
  const uploadMutation = useUploadConverted();
  const linkMutation = useGenerateLink();
  const notifyMutation = useSendNotification();
  const deleteMutation = useDeleteJob();
  const emailMutation = useSendEmail();
  const smsMutation = useSendSms();
  const navigate = useNavigate();
  
  const { isConverting, progress, status: conversionStatus, convertToEpub, checkCalibre } = useCalibreConverter();
  
  const [selectedChannel, setSelectedChannel] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [customMessage, setCustomMessage] = useState('');

  const handleStart = async () => {
    try {
      await startMutation.mutateAsync(jobId);
      toast.success('Conversion started');
    } catch (err) {
      toast.error('Failed to start conversion');
    }
  };

  const handleConvert = async () => {
    if (!job?.book) {
      toast.error('No source file available');
      return;
    }
    
    const hasCalibre = await checkCalibre();
    if (!hasCalibre) {
      toast.error('Calibre is not installed. Please install Calibre first.');
      return;
    }
    
    const result = await convertToEpub(job.book, {
      title: job.book_title,
      author: job.author,
      bookId: job.id,
      coverImage: job.cover_image,
    });
    
    if (result.success) {
      toast.success('Conversion complete!');
    }
  };

  const handleRetry = async () => {
    try {
      await retryMutation.mutateAsync(jobId);
      toast.success('Retry initiated');
    } catch (err) {
      toast.error('Failed to retry');
    }
  };

  const handleFail = async () => {
    const errorMessage = prompt('Enter error message:');
    if (!errorMessage) return;
    try {
      await failMutation.mutateAsync({ id: jobId, errorMessage });
      toast.success('Marked as failed');
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const handleUpload = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Ebook', extensions: ['epub', 'mobi', 'pdf'] }],
      });
      
      if (selected) {
        const file = new File([], selected as string);
        await uploadMutation.mutateAsync({ id: jobId, file });
        toast.success('File uploaded');
      }
    } catch (err) {
      toast.error('Failed to upload file');
    }
  };

  const handleGenerateLink = async () => {
    try {
      const result = await linkMutation.mutateAsync({ id: jobId, expiresInHours: 24 });
      await navigator.clipboard.writeText(result.download_url);
      toast.success('Link copied to clipboard');
    } catch (err) {
      toast.error('Failed to generate link');
    }
  };

  const handleNotify = async () => {
    try {
      await notifyMutation.mutateAsync({ id: jobId, channel: selectedChannel, message: customMessage });
      toast.success(`Notification sent via ${selectedChannel}`);
    } catch (err) {
      toast.error('Failed to send notification');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) return;
    try {
      await deleteMutation.mutateAsync(jobId);
      toast.success('Job deleted');
      navigate('/jobs');
    } catch (err) {
      toast.error('Failed to delete job');
    }
  };

  const handleSendEmail = async () => {
    if (!job?.final_copy) {
      toast.error('No converted file available');
      return;
    }
    try {
      const result = await emailMutation.mutateAsync(jobId);
      await navigator.clipboard.writeText(result.download_url);
      toast.success('Email sent! Download link copied to clipboard');
    } catch (err) {
      toast.error('Failed to send email');
    }
  };

  const handleSendSms = async () => {
    if (!job?.users_telephone) {
      toast.error('User has no phone number');
      return;
    }
    try {
      await smsMutation.mutateAsync(jobId);
      toast.success('SMS sent to user');
    } catch (err) {
      toast.error('Failed to send SMS');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center p-12">
        <p className="text-error mb-4">Failed to load job details</p>
        <Link to="/jobs">
          <Button>Back to Jobs</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/jobs">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">{job.book_title || `Job #${job.id}`}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={job.status || 'pending'} />
            <StatusBadge status={job.payment_status || 'pending'} />
          </div>
        </div>
        <Button variant="error" size="sm" onClick={handleDelete} isLoading={deleteMutation.isPending}>
          <Trash2 size={16} className="mr-1" />
          Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Job Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* File Info */}
          <Card title="File Information">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Original File</p>
                <p className="font-medium truncate">{job.book || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Converted File</p>
                <p className="font-medium truncate">{job.final_copy || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">ISBN</p>
                <p className="font-medium">{job.isbn || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Author</p>
                <p className="font-medium">{job.author || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Cover Image</p>
                {job.cover_image ? (
                  <img src={job.cover_image} alt="Cover" className="w-20 h-28 object-cover rounded" />
                ) : (
                  <p className="text-slate-400">-</p>
                )}
              </div>
            </div>
          </Card>

          {/* Conversion Actions */}
          <Card title="Conversion">
            <div className="flex flex-wrap gap-3">
              {job.status === 'paid' && (
                <>
                  <Button onClick={handleStart} isLoading={startMutation.isPending}>
                    <Play size={18} className="mr-2" />
                    Start Processing
                  </Button>
                  {job.book && (
                    <Button onClick={handleConvert} isLoading={isConverting} variant="success">
                      <Wand2 size={18} className="mr-2" />
                      Convert to EPUB
                    </Button>
                  )}
                </>
              )}
              
              {job.status === 'failed' && (
                <Button onClick={handleRetry} isLoading={retryMutation.isPending}>
                  <RotateCcw size={18} className="mr-2" />
                  Retry Conversion
                </Button>
              )}
              
              {job.status === 'processing' && (
                <Button variant="error" onClick={handleFail} isLoading={failMutation.isPending}>
                  <XCircle size={18} className="mr-2" />
                  Mark Failed
                </Button>
              )}
              
              {job.status === 'converted' && (
                <>
                  <Button onClick={handleUpload} isLoading={uploadMutation.isPending}>
                    <Upload size={18} className="mr-2" />
                    Upload Converted File
                  </Button>
                  <Button variant="success" onClick={handleGenerateLink} isLoading={linkMutation.isPending}>
                    <LinkIcon size={18} className="mr-2" />
                    Generate Link
                  </Button>
                </>
              )}
            </div>
            
            {/* Conversion Progress */}
            {isConverting && (
              <div className="mt-4 p-4 bg-slate-100 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="animate-spin" size={16} />
                  <span className="text-sm font-medium">{conversionStatus}</span>
                </div>
                <progress className="progress progress-primary w-full" value={progress} max="100"></progress>
              </div>
            )}
          </Card>

          {/* Send Notification */}
          {(job.status === 'converted' || job.final_copy) && (
            <Card title="Notify User">
              <div className="space-y-4">
                <div className="flex gap-2">
                  {(['email', 'sms', 'whatsapp'] as const).map((channel) => (
                    <button
                      key={channel}
                      className={`btn btn-sm ${selectedChannel === channel ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setSelectedChannel(channel)}
                    >
                      {channel.charAt(0).toUpperCase() + channel.slice(1)}
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="Custom message (optional)"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                />
                <Button onClick={handleNotify} isLoading={notifyMutation.isPending}>
                  <Send size={18} className="mr-2" />
                  Send Notification
                </Button>

                {/* Quick Actions */}
                <div className="divider">Quick Actions</div>
                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    onClick={handleSendEmail} 
                    isLoading={emailMutation.isPending}
                    disabled={!job.final_copy}
                  >
                    <Mail size={16} className="mr-1" />
                    Send Email
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={handleSendSms} 
                    isLoading={smsMutation.isPending}
                    disabled={!job.users_telephone || !job.final_copy}
                  >
                    <MessageSquare size={16} className="mr-1" />
                    Send SMS
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Audit Log */}
          <Card title="Audit Log">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {auditLogs?.logs?.length === 0 ? (
                <p className="text-slate-400 text-sm">No audit logs</p>
              ) : (
                auditLogs?.logs?.map((log: any) => (
                  <div key={log.id} className="flex gap-3 text-sm">
                    <Clock size={14} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="font-medium">{log.action}</p>
                      <p className="text-slate-500">{log.details}</p>
                      <p className="text-xs text-slate-400">
                        {log.admin_name} • {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column - User Info */}
        <div className="space-y-6">
          <Card title="User Information">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User size={18} className="text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Name</p>
                  <p className="font-medium">{job.users_name || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="font-medium">{job.users_email || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Phone</p>
                  <p className="font-medium">{job.users_telephone || '-'}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Status Timeline */}
          <Card title="Timeline">
            <div className="space-y-2">
              {['pending', 'paid', 'queued', 'processing', 'converted', 'link_sent'].map((step, index) => {
                const isActive = job.status === step || (index < 6 && ['paid', 'processing', 'converted'].includes(job.status || ''));
                return (
                  <div key={step} className="flex items-center gap-3">
                    {isActive ? (
                      <CheckCircle size={16} className="text-success" />
                    ) : (
                      <X size={16} className="text-slate-300" />
                    )}
                    <span className={`text-sm ${isActive ? 'font-medium' : 'text-slate-400'}`}>
                      {step.charAt(0).toUpperCase() + step.slice(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
