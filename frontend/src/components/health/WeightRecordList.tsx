import { useState } from 'react';
import type { WeightRecord } from '../../api/weight';
import { parseWeightNote } from '../../lib/weightNote';

interface WeightRecordListProps {
  records: WeightRecord[];
  canWrite: boolean;
  formatWhen: (record: WeightRecord) => string;
  updatingId?: string;
  deletingId?: string;
  onUpdateNote: (id: string, note: string) => void;
  onDelete: (id: string) => void;
}

export function WeightRecordList({
  records,
  canWrite,
  formatWhen,
  updatingId,
  deletingId,
  onUpdateNote,
  onDelete,
}: WeightRecordListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  function startEdit(record: WeightRecord) {
    setEditingId(record.id);
    setDraft(record.note ?? '');
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft('');
  }

  function saveEdit(id: string) {
    onUpdateNote(id, draft);
    setEditingId(null);
    setDraft('');
  }

  return (
    <ul className="weight-record-list">
      {records.map((record) => {
        const editing = editingId === record.id;
        const parsed = parseWeightNote(record.note);
        return (
          <li key={record.id} className="weight-record">
            <div className="weight-record-top">
              <span className="weight-record-when">{formatWhen(record)}</span>
              <span className="weight-record-kg">{record.weight_kg} kg</span>
            </div>
            {editing ? (
              <div className="weight-record-edit">
                <input
                  type="text"
                  aria-label="Edit weight note"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(record.id);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  autoFocus
                />
                <div className="weight-record-actions">
                  <button
                    className="button button-compact"
                    type="button"
                    disabled={updatingId === record.id}
                    onClick={() => saveEdit(record.id)}
                  >
                    Save
                  </button>
                  <button className="button button-secondary button-compact" type="button" onClick={cancelEdit}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="weight-record-note-row">
                <div className="weight-record-note">
                  {parsed.tags.length > 0 ? (
                    parsed.tags.map((tag) => (
                      <span key={tag} className="badge badge-muted weight-record-tag">
                        #{tag}
                      </span>
                    ))
                  ) : (
                    <span className="weight-record-empty">—</span>
                  )}
                  {parsed.rest && <span className="weight-record-rest">{parsed.rest}</span>}
                </div>
                {canWrite && (
                  <div className="weight-record-actions">
                    <button
                      className="button button-secondary button-compact"
                      type="button"
                      onClick={() => startEdit(record)}
                    >
                      Edit
                    </button>
                    <button
                      className="button button-danger button-compact"
                      type="button"
                      disabled={deletingId === record.id}
                      onClick={() => {
                        if (window.confirm('Delete this weight entry?')) onDelete(record.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
