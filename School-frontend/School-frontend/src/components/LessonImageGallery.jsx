import React, { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import API from '../services/api';

const LessonImageGallery = ({ lessonId, images, onDelete }) => {
    const [loadedImages, setLoadedImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        const objectUrls = [];

        if (!images?.length || !lessonId) {
            setLoadedImages([]);
            setError('');
            setLoading(false);
            return undefined;
        }

        setLoadedImages([]);
        setError('');
        setLoading(true);
        const loadImages = async () => {
            const loaded = [];
            let firstError = '';
            for (const image of images) {
                if (!active) return;
                try {
                    const response = await API.get(`/lms/lessons/${lessonId}/images/${image.id}`, {
                        responseType: 'blob'
                    });
                    if (!active) return;
                    const src = URL.createObjectURL(response.data);
                    objectUrls.push(src);
                    loaded.push({ ...image, src });
                } catch (requestError) {
                    if (!firstError) {
                        firstError = requestError.response?.data?.message || 'Some lesson images could not be loaded.';
                    }
                }
            }
            if (active) {
                setLoadedImages(loaded);
                setError(firstError);
                setLoading(false);
            }
        };
        loadImages();

        return () => {
            active = false;
            objectUrls.forEach(URL.revokeObjectURL);
        };
    }, [lessonId, images]);

    if (!images?.length) return null;

    return (
        <section className="lms-image-gallery mt-3" aria-label="Lesson images">
            {loading && <p className="small text-muted mb-2"><Loader2 size={14} className="animate-spin me-1" />Loading images...</p>}
            {error && <p className="small text-danger mb-2" role="alert">{error}</p>}
            <div className="lms-image-grid">
                {loadedImages.map(image => (
                    <figure className="lms-image-card" key={image.id}>
                        <img src={image.src} alt={image.fileName} loading="lazy" />
                        <figcaption>
                            <span className="text-truncate" title={image.fileName}>{image.fileName}</span>
                            {onDelete && (
                                <button type="button" className="btn btn-sm btn-outline-danger"
                                    aria-label={`Delete ${image.fileName}`} title={`Delete ${image.fileName}`}
                                    onClick={() => onDelete(lessonId, image)}>
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </figcaption>
                    </figure>
                ))}
            </div>
        </section>
    );
};

export default LessonImageGallery;
