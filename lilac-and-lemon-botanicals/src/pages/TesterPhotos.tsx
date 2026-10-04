import { Link, Navigate } from 'react-router-dom';
import { useUser } from '@clerk/react-router';
import { useApi } from '../lib/api';
import { useEffect, useState } from 'react';
import { upload } from '@vercel/blob/client';

type TesterPhoto = {
  id: number;
  photo_type: 'baseline' | 'progress';
  image_url: string;
  uploaded_at: string;
};

export default function TesterPhotos() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { apiFetch, getToken } = useApi();

  const [photos, setPhotos] = useState<TesterPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSignedIn || !user) {
      setLoading(false);
      return;
    }

    async function loadPhotos() {
      try {
        const res = await apiFetch('/api/tester/photos');

        if (!res.ok) {
          throw new Error('Failed to load photos');
        }

        const data = await res.json();
        setPhotos(data.photos ?? []);
      } catch (err) {
        console.error('Could not load tester photos:', err);
        setError('Could not load your photos.');
      } finally {
        setLoading(false);
      }
    }

    loadPhotos();
  }, [isSignedIn, user]);

  async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    photoType: 'baseline' | 'progress'
  ) {
    const file = event.target.files?.[0];

    if (!file || !user) return;

    setUploading(true);
    setError('');

    try {
      const token = await getToken();
      const blob = await upload(
        `tester-photos/${user.id}-${Date.now()}-${file.name}`,
        file,
        {
          access: 'public',
          handleUploadUrl: '/api/tester/photo-upload',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const saveRes = await apiFetch('/api/tester/photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoType,
          imageUrl: blob.url,
        }),
      });

      if (!saveRes.ok) {
        throw new Error('Failed to save photo record');
      }

      const refreshRes = await apiFetch('/api/tester/photos');

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setPhotos(data.photos ?? []);
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
      setError('Could not upload that photo. Please try again.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleDelete(photoId: number) {
    if (!user) return;

    const confirmed = window.confirm(
      'Delete this photo? This cannot be undone.'
    );

    if (!confirmed) return;

    setDeleting(photoId);
    setError('');

    try {
      const res = await apiFetch('/api/tester/photos', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Could not delete photo.');
      }

      setPhotos((currentPhotos) =>
        currentPhotos.filter((photo) => photo.id !== photoId)
      );
    } catch (err) {
      console.error('Photo delete failed:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Could not delete that photo. Please try again.'
      );
    } finally {
      setDeleting(null);
    }
  }

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  const baselinePhotos = photos.filter(
    (photo) => photo.photo_type === 'baseline'
  );

  const progressPhotos = photos.filter(
    (photo) => photo.photo_type === 'progress'
  );

  return (
    <main className="tester-page">
      <section className="tester-hero wrap">
        <div className="tester-page-icon">
          <img src="/icons/cameo.png" alt="" aria-hidden="true" />
        </div>
        <div className="tester-eyebrow">
          Rue Beaute · TESTER PORTAL
        </div>

        <h1>Your testing photos.</h1>

        <p>
          Take clear, consistent photos throughout your test so you can
          compare how your skin changes over time.
        </p>
      </section>

      <section className="tester-content wrap">
        <div className="tester-section-heading">
          <div>
            <span className="tester-kicker">STARTING PHOTOS</span>
            <h2>Baseline</h2>
          </div>
        </div>

        <p>
          Take your baseline photos before beginning your testing routine.
        </p>

        <label className="tester-task-action">
          {uploading ? 'Uploading…' : 'Add baseline photo'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            hidden
            disabled={uploading || deleting !== null}
            onChange={(event) =>
              handleUpload(event, 'baseline')
            }
          />
        </label>

        {baselinePhotos.length > 0 ? (
          <div className="tester-photo-grid">
            {baselinePhotos.map((photo) => (
              <div key={photo.id} className="tester-photo-card">
                <img
                  src={photo.image_url}
                  alt="Baseline"
                  className="tester-photo"
                />

                <button
                  type="button"
                  className="tester-photo-delete"
                  onClick={() => handleDelete(photo.id)}
                  disabled={deleting === photo.id}
                >
                  {deleting === photo.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="tester-empty-state">
            <img src="/illustrations/03_flower_basket.png" alt="" aria-hidden="true" />
            <p>No baseline photos yet — add one before you start testing.</p>
          </div>
        )}
      </section>

      <section className="tester-content wrap">
        <div className="tester-section-heading">
          <div>
            <span className="tester-kicker">PROGRESS PHOTOS</span>
            <h2>Keep documenting</h2>
          </div>
        </div>

        <p>
          Add progress photos as you continue testing.
        </p>

        <label className="tester-task-action">
          {uploading ? 'Uploading…' : 'Add progress photo'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            hidden
            disabled={uploading || deleting !== null}
            onChange={(event) =>
              handleUpload(event, 'progress')
            }
          />
        </label>

        {progressPhotos.length > 0 ? (
          <div className="tester-photo-grid">
            {progressPhotos.map((photo) => (
              <div key={photo.id} className="tester-photo-card">
                <img
                  src={photo.image_url}
                  alt="Progress"
                  className="tester-photo"
                />

                <button
                  type="button"
                  className="tester-photo-delete"
                  onClick={() => handleDelete(photo.id)}
                  disabled={deleting === photo.id}
                >
                  {deleting === photo.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="tester-empty-state">
            <img src="/icons/cameo.png" alt="" aria-hidden="true" />
            <p>No progress photos yet — check back in as your test continues.</p>
          </div>
        )}
      </section>

      {error && (
        <section className="tester-note wrap">
          <div>
            <h3>Something went wrong</h3>
            <p>{error}</p>
          </div>
        </section>
      )}

      <section className="tester-content wrap">
        <Link to="/tester">← Back to dashboard</Link>
      </section>
    </main>
  );
}