'use client';
import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface Subcategory {
  id: number;
  label: string;
  response_type: 'correct' | 'incorrect';
}

interface EditableResponse {
  id: number;
  response_type: 'correct' | 'incorrect';
  subcategory_id: number | null;
  session_notes: string | null;
}

interface EditResponseModalProps {
  response: EditableResponse;
  goalSubcategories: Subcategory[];
  onClose: () => void;
  onSave: (id: number, data: {
    response_type: 'correct' | 'incorrect';
    subcategory_id: number | null;
    session_notes: string | null;
  }) => Promise<void>;
}

export default function EditResponseModal({ response, goalSubcategories, onClose, onSave }: EditResponseModalProps) {
  const [responseType, setResponseType] = useState<'correct' | 'incorrect'>(response.response_type);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(response.subcategory_id);
  const [sessionNotes, setSessionNotes] = useState(response.session_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset subcategory when response type changes
  useEffect(() => {
    const validSubcats = goalSubcategories.filter(s => s.response_type === responseType);
    const stillValid = validSubcats.some(s => s.id === subcategoryId);
    if (!stillValid) setSubcategoryId(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responseType, goalSubcategories]);

  const filteredSubcats = goalSubcategories.filter(s => s.response_type === responseType);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave(response.id, {
        response_type: responseType,
        subcategory_id: subcategoryId,
        session_notes: sessionNotes.trim() || null,
      });
      onClose();
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent id="edit-response-modal" className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Response</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Response type toggle */}
          <div>
            <Label className="mb-2 block">Response Type</Label>
            <div id="edit-response-type" className="flex gap-2">
              <button
                id="edit-response-correct"
                onClick={() => setResponseType('correct')}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  responseType === 'correct'
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-300'
                }`}
              >
                ✓ Correct
              </button>
              <button
                id="edit-response-incorrect"
                onClick={() => setResponseType('incorrect')}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  responseType === 'incorrect'
                    ? 'bg-red-500 border-red-500 text-white'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-red-300'
                }`}
              >
                ✗ Incorrect
              </button>
            </div>
          </div>

          {/* Subcategory */}
          {filteredSubcats.length > 0 && (
            <div>
              <Label htmlFor="edit-response-subcat">Subcategory</Label>
              <select
                id="edit-response-subcat"
                value={subcategoryId ?? ''}
                onChange={e => setSubcategoryId(e.target.value ? Number(e.target.value) : null)}
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">No subcategory</option>
                {filteredSubcats.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Session notes */}
          <div>
            <Label htmlFor="edit-response-notes">Session Notes</Label>
            <Input
              id="edit-response-notes"
              value={sessionNotes}
              onChange={e => setSessionNotes(e.target.value)}
              placeholder="Optional notes..."
              className="mt-1"
            />
          </div>

          {error && <p id="edit-response-error" className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} id="edit-response-cancel">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} id="edit-response-save">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
