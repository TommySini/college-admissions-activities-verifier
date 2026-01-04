'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type OrganizationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface Organization {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  leadership?: string | null;
  presidentName?: string | null;
  isSchoolClub: boolean;
  contactEmail?: string | null;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
}

const statusStyles: Record<OrganizationStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700 border border-amber-200',
  APPROVED: 'bg-green-100 text-green-700 border border-green-200',
  REJECTED: 'bg-red-100 text-red-700 border border-red-200',
};

export default function OrganizationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    leadership: '',
    presidentName: '',
    isSchoolClub: 'yes',
    contactEmail: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [router, status]);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (session.user.role === 'admin') {
      router.push('/admin');
    }
  }, [router, session]);

  const fetchMyOrganizations = async () => {
    const response = await fetch('/api/organizations');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load your organizations');
    }

    setOrganizations(data.organizations || []);
  };

  useEffect(() => {
    if (!session) {
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        await fetchMyOrganizations();
      } catch (err) {
        console.error('Error loading organizations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load page data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [session]);

  useEffect(() => {
    if (session?.user?.email) {
      setFormData((prev) => ({
        ...prev,
        contactEmail: prev.contactEmail || session.user?.email || '',
      }));
    }
  }, [session?.user?.email]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      leadership: '',
      presidentName: '',
      isSchoolClub: 'yes',
      contactEmail: session?.user?.email || '',
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!formData.name.trim()) {
      setFormError('Organization name is required.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          category: formData.category.trim() || undefined,
          leadership: formData.leadership.trim() || undefined,
          presidentName: formData.presidentName.trim() || undefined,
          isSchoolClub: formData.isSchoolClub === 'yes',
          contactEmail: formData.contactEmail.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormError(data.error || 'Failed to submit organization.');
        return;
      }

      setSuccessMessage(
        'Organization submitted for approval. An administrator will review it shortly.'
      );
      resetForm();
      try {
        await fetchMyOrganizations();
      } catch (refreshError) {
        console.error('Error refreshing organizations:', refreshError);
        setError("Submission received, but we couldn't refresh your submissions. Please reload.");
      }
    } catch (err) {
      console.error('Error submitting organization:', err);
      setFormError('Failed to submit organization. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = useMemo(
    () => organizations.filter((org) => org.status === 'PENDING').length,
    [organizations]
  );

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading your student portal…</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-5xl mx-auto px-6 py-12">
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-8">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500 font-semibold mb-2">
                Submit an Organization
              </p>
              <h1 className="text-4xl font-bold text-slate-900">
                Share Your Club or Community Organization
              </h1>
              <p className="mt-3 text-slate-600 max-w-2xl">
                Provide details about your organization so administrators can review and approve it
                for the student directory.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/clubs"
                className="px-5 py-3 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Browse Clubs
              </Link>
              <Link
                href="/dashboard"
                className="px-5 py-3 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section id="submit-organization" className="mb-12">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-slate-900">Organization Details</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Complete the form below. Approved submissions will appear in the student
                  directory.
                </p>
              </div>

              {formError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              {successMessage && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {successMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, name: event.target.value }))
                    }
                    required
                    placeholder="e.g., TBS Robotics Club"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, category: event.target.value }))
                    }
                    placeholder="e.g., STEM, Arts, Service"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, description: event.target.value }))
                    }
                    rows={4}
                    required
                    placeholder="Share the mission, goals, and core activities of the organization."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Leadership / Advisor Information *
                  </label>
                  <textarea
                    value={formData.leadership}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, leadership: event.target.value }))
                    }
                    rows={3}
                    required
                    placeholder="List leadership roles, advisor details, and key contacts."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      President / Primary Student Leader
                    </label>
                    <input
                      type="text"
                      value={formData.presidentName}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, presidentName: event.target.value }))
                      }
                      placeholder="Name of the student president or primary contact"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, contactEmail: event.target.value }))
                      }
                      placeholder="Primary contact email for the organization"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>

                <div>
                  <span className="block text-sm font-medium text-slate-600 mb-1">
                    Is this organization a TBS club? *
                  </span>
                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        value="yes"
                        checked={formData.isSchoolClub === 'yes'}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, isSchoolClub: event.target.value }))
                        }
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      On-campus TBS club
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        value="no"
                        checked={formData.isSchoolClub === 'no'}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, isSchoolClub: event.target.value }))
                        }
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      External / community organization
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit for Admin Review'}
                </button>
              </form>
            </div>

            <aside className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Submission Status</h3>
                <p className="text-sm text-slate-600">
                  Track the status of organizations you have submitted. Administrators will review
                  each request.
                </p>

                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 space-y-1">
                  <p>
                    <strong>Pending:</strong> {pendingCount} awaiting review
                  </p>
                  <p>
                    <strong>Total Submitted:</strong> {organizations.length}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Need Help?</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Questions about the approval process or what to include? Reach out to the
                  activities office for guidance.
                </p>
                <a
                  href="mailto:activities@actifyhs.org"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Contact Activities Office
                </a>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-12" id="your-submissions">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-slate-900">Your Submissions</h2>
            <span className="text-sm text-slate-500">{organizations.length} total</span>
          </div>
          {organizations.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 text-center text-slate-500">
              You haven’t submitted any organizations yet. Complete the form above to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {organizations.map((organization) => (
                <article
                  key={organization.id}
                  className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-slate-900">
                          {organization.name}
                        </h3>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[organization.status]}`}
                        >
                          {organization.status.charAt(0) +
                            organization.status.slice(1).toLowerCase()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        {organization.description || 'No description provided.'}
                      </p>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600">
                        <div>
                          <dt className="font-medium text-slate-500">Category</dt>
                          <dd>{organization.category || '—'}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-slate-500">President / Lead</dt>
                          <dd>{organization.presidentName || '—'}</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="font-medium text-slate-500">Leadership & Advisor</dt>
                          <dd>{organization.leadership || '—'}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-slate-500">Type</dt>
                          <dd>
                            {organization.isSchoolClub
                              ? 'On-campus TBS club'
                              : 'External organization'}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-slate-500">Contact Email</dt>
                          <dd>{organization.contactEmail || '—'}</dd>
                        </div>
                      </dl>
                      <p className="text-xs text-slate-400">
                        Submitted on {new Date(organization.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-6 text-sm text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p>&copy; {new Date().getFullYear()} Actify Student Life. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="hover:text-slate-700">
              Back to Student Dashboard
            </a>
            <a href="mailto:activities@actifyhs.org" className="hover:text-slate-700">
              Contact Activities Office
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}



