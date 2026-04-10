'use client';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface AppUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => {
        if (!r.ok) throw new Error('Forbidden — admin only');
        return r.json();
      })
      .then(setUsers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(user: AppUser) {
    const confirmed = confirm(
      `Delete user "${user.email}"?\n\nThis will remove their account and task library. Their schedule and activity data will remain in the system.\n\nThis cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(user.id);
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Deleted ${data.deleted}`);
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (e) {
      toast.error('Delete failed: ' + String(e));
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-gray-500">Loading users…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">Access denied</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-red-600" />
        <h1 className="text-2xl font-bold">Manage Users</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{users.length} user{users.length !== 1 ? 's' : ''}</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {users.map(user => (
            <div key={user.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="font-medium text-sm">{user.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Joined {format(new Date(user.created_at), 'MMM d, yyyy')}
                  {user.last_sign_in_at && (
                    <> · Last seen {format(new Date(user.last_sign_in_at), 'MMM d, yyyy')}</>
                  )}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300 ml-4"
                disabled={deleting === user.id}
                onClick={() => handleDelete(user)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                {deleting === user.id ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
