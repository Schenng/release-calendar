import { FormEvent, useState } from "react";
import { Episode } from "../hooks/useEpisodes";
import {
  compare,
  Day,
  formatDayShort,
  fromISO,
  toISO,
  upcomingReleases,
} from "../lib/schedule";

interface Props {
  today: Day;
  episodes: Episode[];
  loading: boolean;
  error: string | null;
  onCreate: (name: string, releaseDate: string | null) => Promise<boolean>;
  onUpdate: (
    id: string,
    fields: { name?: string; release_date?: string | null },
  ) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
}

const SLOT_CHOICES = 24;

export function isReleased(e: Episode, today: Day): boolean {
  return e.release_date !== null && compare(fromISO(e.release_date), today) <= 0;
}

interface DateSelectProps {
  today: Day;
  value: string | null;
  taken: Set<string>;
  onChange: (value: string | null) => void;
}

function DateSelect({ today, value, taken, onChange }: DateSelectProps) {
  const options = upcomingReleases(today, SLOT_CHOICES)
    .map(toISO)
    .filter((iso) => iso === value || !taken.has(iso));
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      aria-label="Release date"
    >
      <option value="">Unassigned</option>
      {options.map((iso) => (
        <option key={iso} value={iso}>
          {formatDayShort(fromISO(iso))}
        </option>
      ))}
    </select>
  );
}

export function EpisodesTab({
  today,
  episodes,
  loading,
  error,
  onCreate,
  onUpdate,
  onRemove,
}: Props) {
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDate, setDraftDate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const taken = new Set(
    episodes.flatMap((e) => (e.release_date !== null ? [e.release_date] : [])),
  );
  const banked = episodes.filter((e) => !isReleased(e, today));
  const released = episodes
    .filter((e) => isReleased(e, today))
    .sort((a, b) => (a.release_date! < b.release_date! ? 1 : -1));

  const submitNew = async (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    if (await onCreate(name, newDate)) {
      setNewName("");
      setNewDate(null);
    }
    setBusy(false);
  };

  const startEdit = (ep: Episode) => {
    setEditingId(ep.id);
    setDraftName(ep.name);
    setDraftDate(ep.release_date);
  };

  const saveEdit = async (ep: Episode) => {
    const name = draftName.trim();
    if (!name) return;
    setBusy(true);
    if (await onUpdate(ep.id, { name, release_date: draftDate })) {
      setEditingId(null);
    }
    setBusy(false);
  };

  const confirmRemove = async (ep: Episode) => {
    if (!window.confirm(`Delete "${ep.name}"? This can't be undone.`)) return;
    setBusy(true);
    await onRemove(ep.id);
    setBusy(false);
  };

  return (
    <section className="episodes">
      <form className="episode-new" onSubmit={submitNew}>
        <input
          type="text"
          required
          placeholder="New episode name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          aria-label="New episode name"
        />
        <DateSelect today={today} value={newDate} taken={taken} onChange={setNewDate} />
        <button type="submit" className="auth-submit" disabled={busy}>
          Add episode
        </button>
      </form>

      {error && <p className="auth-error">{error}</p>}
      {loading && episodes.length === 0 && <p className="status-hint">Loading episodes…</p>}
      {!loading && episodes.length === 0 && !error && (
        <p className="status-hint">No episodes yet — add your first one above.</p>
      )}

      {banked.length > 0 && (
        <ul className="episode-list">
          {banked.map((ep) =>
            editingId === ep.id ? (
              <li key={ep.id} className="episode-row editing">
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  aria-label="Episode name"
                />
                <DateSelect
                  today={today}
                  value={draftDate}
                  taken={taken}
                  onChange={setDraftDate}
                />
                <div className="episode-actions">
                  <button
                    type="button"
                    className="auth-link"
                    disabled={busy}
                    onClick={() => saveEdit(ep)}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="auth-link"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ) : (
              <li key={ep.id} className="episode-row">
                <span className="episode-name-text">{ep.name}</span>
                <span className="episode-date">
                  {ep.release_date ? formatDayShort(fromISO(ep.release_date)) : "Unassigned"}
                </span>
                <div className="episode-actions">
                  <button type="button" className="auth-link" onClick={() => startEdit(ep)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="auth-link danger"
                    disabled={busy}
                    onClick={() => confirmRemove(ep)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {released.length > 0 && (
        <>
          <h3 className="released-heading">Released</h3>
          <ul className="episode-list released">
            {released.map((ep) => (
              <li key={ep.id} className="episode-row">
                <span className="episode-name-text">{ep.name}</span>
                <span className="episode-date">{formatDayShort(fromISO(ep.release_date!))}</span>
                <div className="episode-actions">
                  <button
                    type="button"
                    className="auth-link danger"
                    disabled={busy}
                    onClick={() => confirmRemove(ep)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
