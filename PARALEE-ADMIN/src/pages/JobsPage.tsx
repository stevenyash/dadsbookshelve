import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useJobs, useStartConversion, useRetryConversion, useFailConversion, useDeleteJob, useSendEmail, useSendSms, useGenerateLink, useUpdateJob } from '../hooks/useJobs';
import { useCalibreConverter } from '../hooks/useCalibreConverter';
import { CardSimple } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Loader2, Search, Play, RotateCcw, XCircle, FileText, Eye, Wand2, Mail, Phone, Link2, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

const statusTabs = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'paid', label: 'Paid' },
  { key: 'processing', label: 'Processing' },
  { key: 'converted', label: 'Converted' },
  { key: 'completed', label: 'Completed' },
  { key: 'link_sent', label: 'Link Sent' },
  { key: 'failed', label: 'Failed' },
];

export default function JobsPage() {
  const [activeTab, setActiveTab] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [convertingId, setConvertingId] = useState<number | null>(null);
  
  const { data, isLoading, error, refetch } = useJobs({ status: activeTab, search, page, limit: 20 });
  const startMutation = useStartConversion();
  const retryMutation = useRetryConversion();
  const failMutation = useFailConversion();
  const deleteMutation = useDeleteJob();
  const sendEmailMutation = useSendEmail();
  const sendSmsMutation = useSendSms();
  const generateLinkMutation = useGenerateLink();
  const updateMutation = useUpdateJob();
  const { convertToEpub, checkCalibre } = useCalibreConverter();

  const [editingJob, setEditingJob] = useState<any>(null);
  const [editForm, setEditForm] = useState({ book_title: '', author: '', isbn: '', status: '' });

  const handleStart = async (id: number) => {
    try {
      await startMutation.mutateAsync(id);
      toast.success('Processing started');
    } catch (err) {
      toast.error('Failed to start');
    }
  };

  const handleConvert = async (job: any) => {
    if (!job.book) {
      toast.error('No source file available');
      return;
    }

    const hasCalibre = await checkCalibre();
    if (!hasCalibre) {
      toast.error('Calibre is not installed');
      return;
    }

    setConvertingId(job.id);
    
    const result = await convertToEpub(job.book, {
      title: job.book_title,
      author: job.author,
      bookId: job.id,
      coverImage: job.cover_image,
    });
    
    setConvertingId(null);
    
    if (result.success) {
      toast.success('Conversion complete!');
      refetch();
    }
  };

  const handleRetry = async (id: number) => {
    try {
      await retryMutation.mutateAsync(id);
      toast.success('Retry initiated');
    } catch (err) {
      toast.error('Failed to retry');
    }
  };

  const handleFail = async (id: number) => {
    const errorMessage = prompt('Enter error message:');
    if (!errorMessage) return;
    try {
      await failMutation.mutateAsync({ id, errorMessage });
      toast.success('Job marked as failed');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleSendEmail = async (id: number) => {
    if (!confirm('Send download link to user via email?')) return;
    try {
      const result = await sendEmailMutation.mutateAsync(id);
      toast.success(`Email sent to ${result.sent_to}`);
    } catch (err) {
      toast.error('Failed to send email');
    }
  };

  const handleSendSms = async (job: any) => {
    if (!job.users_telephone) {
      toast.error('User has no phone number');
      return;
    }
    if (!confirm(`Send SMS to ${job.users_telephone}?`)) return;
    try {
      const result = await sendSmsMutation.mutateAsync(job.id);
      toast.success(`SMS sent to ${result.sent_to}`);
    } catch (err) {
      toast.error('Failed to send SMS');
    }
  };

  const handleGenerateLink = async (id: number) => {
    try {
      const result = await generateLinkMutation.mutateAsync({ id, expiresInHours: 24 });
      await navigator.clipboard.writeText(result.download_url);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      toast.error('Failed to generate link');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Job deleted');
    } catch (err) {
      toast.error('Failed to delete job');
    }
  };

  const handleEdit = (job: any) => {
    setEditingJob(job);
    setEditForm({
      book_title: job.book_title || '',
      author: job.author || '',
      isbn: job.isbn || '',
      status: job.status || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingJob) return;
    try {
      await updateMutation.mutateAsync({ id: editingJob.id, data: editForm });
      toast.success('Job updated');
      setEditingJob(null);
      refetch();
    } catch (err) {
      toast.error('Failed to update job');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Conversion Jobs</h1>
          <p className="text-slate-500">Manage ebook conversion queue</p>
        </div>
      </div>

      <CardSimple className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by title, author, or user..."
                className="input input-bordered w-full pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardSimple>

      <div className="tabs tabs-boxed bg-base-100 p-1 w-fit">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <CardSimple className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-error">Failed to load jobs</p>
          </div>
        ) : data?.jobs?.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500">No jobs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Book Title</th>
                  <th>Author</th>
                  <th>User</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.jobs?.map((job: any) => (
                  <tr key={job.id} className="hover">
                    <td>{job.id}</td>
                    <td className="font-medium">{job.book_title || '-'}</td>
                    <td>{job.author || '-'}</td>
                    <td>{job.users_name || '-'}</td>
                    <td>
                      <StatusBadge status={job.payment_status || 'pending'} />
                    </td>
                    <td>
                      <StatusBadge status={job.status || 'pending'} />
                    </td>
                    <td className="text-sm text-slate-500">{job.date_uploaded || '-'}</td>
                    <td>
                      <div className="flex gap-1">
                        <Link to={`/jobs/${job.id}`}>
                          <Button size="sm" variant="ghost" title="View">
                            <Eye size={16} />
                          </Button>
                        </Link>
                        
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          title="Edit"
                          onClick={() => handleEdit(job)}
                        >
                          <Edit2 size={16} />
                        </Button>
                        
                        {(job.status === 'paid' || job.status === 'processing' || job.status === 'failed') && job.book && (
                          <Button 
                            size="sm" 
                            variant="success" 
                            title="Convert to EPUB"
                            onClick={() => handleConvert(job)}
                            isLoading={convertingId === job.id}
                            disabled={convertingId !== null}
                          >
                            <Wand2 size={14} className="mr-1" />
                            Convert
                          </Button>
                        )}
                        
                        {job.status === 'paid' && (
                          <Button 
                            size="sm" 
                            variant="primary" 
                            title="Start Processing"
                            onClick={() => handleStart(job.id)}
                            isLoading={startMutation.isPending}
                          >
                            <Play size={16} />
                          </Button>
                        )}
                        
                        {job.status === 'failed' && (
                          <Button 
                            size="sm" 
                            variant="warning" 
                            title="Retry"
                            onClick={() => handleRetry(job.id)}
                            isLoading={retryMutation.isPending}
                          >
                            <RotateCcw size={16} />
                          </Button>
                        )}
                        
                        {job.status === 'processing' && (
                          <Button 
                            size="sm" 
                            variant="error" 
                            title="Mark Failed"
                            onClick={() => handleFail(job.id)}
                            isLoading={failMutation.isPending}
                          >
                            <XCircle size={16} />
                          </Button>
                        )}

                        {job.status === 'converted' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="info" 
                              title="Generate Download Link"
                              onClick={() => handleGenerateLink(job.id)}
                              isLoading={generateLinkMutation.isPending}
                            >
                              <Link2 size={16} />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="primary" 
                              title="Send Email"
                              onClick={() => handleSendEmail(job.id)}
                              isLoading={sendEmailMutation.isPending}
                              disabled={!job.users_email}
                            >
                              <Mail size={16} />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              title="Send SMS"
                              onClick={() => handleSendSms(job)}
                              isLoading={sendSmsMutation.isPending}
                              disabled={!job.users_telephone}
                            >
                              <Phone size={16} />
                            </Button>
                          </>
                        )}

                        <Button 
                          size="sm" 
                          variant="ghost" 
                          title="Delete"
                          onClick={() => handleDelete(job.id)}
                          isLoading={deleteMutation.isPending}
                          className="hover:text-error"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardSimple>

      {/* Edit Modal */}
      {editingJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-base-100 p-6 rounded-lg w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4">Edit Job #{editingJob.id}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-500">Book Title</label>
                <Input
                  value={editForm.book_title}
                  onChange={(e) => setEditForm({ ...editForm, book_title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-slate-500">Author</label>
                <Input
                  value={editForm.author}
                  onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-slate-500">ISBN</label>
                <Input
                  value={editForm.isbn}
                  onChange={(e) => setEditForm({ ...editForm, isbn: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-slate-500">Status</label>
                <select
                  className="select select-bordered w-full"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="">Select status</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="processing">Processing</option>
                  <option value="converted">Converted</option>
                  <option value="failed">Failed</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="ghost" onClick={() => setEditingJob(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} isLoading={updateMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {data?.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-slate-500">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page === data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}