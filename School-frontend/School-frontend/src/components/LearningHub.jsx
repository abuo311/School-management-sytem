import React, { useEffect, useMemo, useState } from 'react';
import {
    BookOpen, CheckCircle2, Circle, ExternalLink, GraduationCap, Plus,
    Save, Trash2, Video, X
} from 'lucide-react';
import API from '../services/api';
import LessonContentEditor, { sanitizeLessonContent } from './LessonContentEditor';
import LessonImageGallery from './LessonImageGallery';
import '../styles/LearningHub.css';

const emptyCourse = { title: '', description: '', className: '', subjectId: '', published: false };
const emptyLesson = { title: '', content: '', videoUrl: '', resourceUrl: '', position: '' };

const getErrorMessage = (error, fallback) =>
    error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response.data : fallback);

const getRequestFailure = (label, error) => {
    const status = error.response?.status;
    const detail = status === 404
        ? 'This endpoint is missing from the deployed backend. Deploy the updated school backend.'
        : getErrorMessage(error, status ? 'Access denied.' : 'Network request failed.');
    return `${label}${status ? ` (HTTP ${status})` : ''}: ${detail}`;
};

const getVideoEmbed = (videoUrl) => {
    if (!videoUrl) return null;
    try {
        const url = new URL(videoUrl);
        const host = url.hostname.toLowerCase();
        if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
            const id = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop();
            return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
        }
        if (host === 'youtu.be') {
            const id = url.pathname.slice(1).split('/')[0];
            return /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
        }
        if (['vimeo.com', 'www.vimeo.com'].includes(host)) {
            const id = url.pathname.split('/').filter(Boolean).pop();
            return /^\d+$/.test(id || '') ? `https://player.vimeo.com/video/${id}` : null;
        }
    } catch {
        return null;
    }
    return null;
};

const LearningHub = () => {
    const role = sessionStorage.getItem('userRole');
    const isStudent = role === 'STUDENT';
    const isAdmin = role === 'ADMIN';
    const canManage = isAdmin || role === 'TEACHER';
    const [courses, setCourses] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [availableStudents, setAvailableStudents] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedLessonId, setSelectedLessonId] = useState(null);
    const [showCourseForm, setShowCourseForm] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [courseForm, setCourseForm] = useState(emptyCourse);
    const [lessonForm, setLessonForm] = useState(emptyLesson);
    const [editingLesson, setEditingLesson] = useState(null);
    const [showLessonForm, setShowLessonForm] = useState(false);
    const [selectedImages, setSelectedImages] = useState([]);
    const [accountForm, setAccountForm] = useState({ studentId: '', username: '', password: '' });
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const selectedLesson = useMemo(
        () => selectedCourse?.lessons?.find(lesson => lesson.id === selectedLessonId) || null,
        [selectedCourse, selectedLessonId]
    );

    const loadCourses = async () => {
        const response = await API.get('/lms/courses');
        const loadedCourses = response.data || [];
        setCourses(loadedCourses);
        setSelectedCourse(current => current
            ? loadedCourses.find(course => course.id === current.id) || null
            : null);
        setEditingLesson(current => current
            ? loadedCourses.flatMap(course => course.lessons || []).find(lesson => lesson.id === current.id) || current
            : null);
    };

    const loadAvailableStudents = async () => {
        const response = await API.get('/lms/students/available');
        setAvailableStudents(response.data || []);
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const requests = [{ key: 'courses', label: 'courses', request: API.get('/lms/courses') }];
                if (canManage) {
                    requests.push(
                        { key: 'classes', label: 'classes', request: API.get('/classes') },
                        { key: 'subjects', label: 'subjects', request: API.get('/subjects') }
                    );
                }
                if (isAdmin) {
                    requests.push({
                        key: 'students',
                        label: 'students eligible for learning accounts',
                        request: API.get('/lms/students/available')
                    });
                }

                const results = await Promise.allSettled(requests.map(item => item.request));
                const failures = [];
                results.forEach((result, index) => {
                    const { key, label } = requests[index];
                    if (result.status === 'rejected') {
                        failures.push(getRequestFailure(label, result.reason));
                        return;
                    }
                    const data = result.value.data || [];
                    if (key === 'courses') setCourses(data);
                    if (key === 'classes') setClasses(data);
                    if (key === 'subjects') setSubjects(data);
                    if (key === 'students') setAvailableStudents(data);
                });
                if (failures.length) {
                    setError(`Some learning data could not be loaded. ${failures.join(' ')}`);
                }
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [canManage, isAdmin]);

    const handleCourseSubmit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            const request = {
                ...courseForm,
                subjectId: courseForm.subjectId ? Number(courseForm.subjectId) : null
            };
            const response = editingCourse
                ? await API.put(`/lms/courses/${editingCourse.id}`, request)
                : await API.post('/lms/courses', request);
            await loadCourses();
            setSelectedCourse(response.data);
            setCourseForm(emptyCourse);
            setEditingCourse(null);
            setShowCourseForm(false);
            setNotice(editingCourse ? 'Course updated.' : 'Course created.');
        } catch (requestError) {
            setError(getErrorMessage(requestError, 'Could not save this course.'));
        } finally {
            setBusy(false);
        }
    };

    const openCourseEditor = (course = null) => {
        setEditingCourse(course);
        setCourseForm(course ? {
            title: course.title,
            description: course.description || '',
            className: course.className,
            subjectId: course.subjectId || '',
            published: course.published
        } : { ...emptyCourse, className: classes[0]?.className || '' });
        setShowCourseForm(true);
        setError('');
    };

    const handleDeleteCourse = async (course) => {
        if (!window.confirm(`Delete "${course.title}" and all its lessons?`)) return;
        setError('');
        try {
            await API.delete(`/lms/courses/${course.id}`);
            if (selectedCourse?.id === course.id) setSelectedCourse(null);
            await loadCourses();
            setNotice('Course deleted.');
        } catch (requestError) {
            setError(getErrorMessage(requestError, 'Could not delete this course.'));
        }
    };

    const handleLessonSubmit = async (event) => {
        event.preventDefault();
        if (!selectedCourse) return;
        const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const invalidImage = selectedImages.find(file =>
            !supportedImageTypes.includes(file.type) || file.size > 3 * 1024 * 1024
        );
        if (invalidImage) {
            setError(!supportedImageTypes.includes(invalidImage.type)
                ? 'Choose a JPEG, PNG, GIF or WebP image.'
                : `${invalidImage.name} is too large. Lesson images are limited to 3 MiB each.`);
            return;
        }
        setBusy(true);
        setError('');
        try {
            const request = {
                ...lessonForm,
                content: sanitizeLessonContent(lessonForm.content),
                position: lessonForm.position ? Number(lessonForm.position) : null
            };
            if (request.content.length > 50000) {
                setError('Lesson content must be 50,000 characters or fewer.');
                setBusy(false);
                return;
            }
            let response;
            if (editingLesson) {
                response = await API.put(`/lms/lessons/${editingLesson.id}`, request);
            } else {
                response = await API.post(`/lms/courses/${selectedCourse.id}/lessons`, request);
            }
            const savedLesson = response.data;
            setEditingLesson(savedLesson);
            for (let index = 0; index < selectedImages.length; index += 1) {
                const data = new FormData();
                data.append('file', selectedImages[index]);
                try {
                    await API.post(`/lms/lessons/${savedLesson.id}/images`, data, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                } catch (uploadError) {
                    setSelectedImages(current => current.slice(index));
                    try {
                        await loadCourses();
                    } catch (refreshError) {
                        setError(`Lesson saved, but an image upload failed and the lesson list could not be refreshed. ${getErrorMessage(uploadError, 'Upload failed.')}`);
                        return;
                    }
                    setError(`Lesson saved, but an image upload failed. Edit the lesson to retry the remaining images. ${getErrorMessage(uploadError, 'Upload failed.')}`);
                    return;
                }
            }
            await loadCourses();
            setLessonForm(emptyLesson);
            setSelectedImages([]);
            setEditingLesson(null);
            setShowLessonForm(false);
            setNotice(editingLesson ? 'Lesson updated.' : 'Lesson added.');
        } catch (requestError) {
            setError(getErrorMessage(requestError, 'Could not save this lesson.'));
        } finally {
            setBusy(false);
        }
    };

    const openLessonEditor = (lesson = null) => {
        setEditingLesson(lesson);
        setLessonForm(lesson ? {
            title: lesson.title,
            content: lesson.content || '',
            videoUrl: lesson.videoUrl || '',
            resourceUrl: lesson.resourceUrl || '',
            position: lesson.position
        } : { ...emptyLesson, position: (selectedCourse?.lessons?.length || 0) + 1 });
        setSelectedImages([]);
        setShowLessonForm(true);
        setError('');
    };

    const handleDeleteLessonImage = async (lessonId, image) => {
        setError('');
        try {
            await API.delete(`/lms/lessons/${lessonId}/images/${image.id}`);
            await loadCourses();
            setNotice('Lesson image deleted.');
        } catch (requestError) {
            setError(getErrorMessage(requestError, 'Could not delete this lesson image.'));
        }
    };

    const handleDeleteLesson = async (lesson) => {
        if (!window.confirm(`Delete the lesson "${lesson.title}"?`)) return;
        setError('');
        try {
            await API.delete(`/lms/lessons/${lesson.id}`);
            if (selectedLessonId === lesson.id) setSelectedLessonId(null);
            await loadCourses();
            setNotice('Lesson deleted.');
        } catch (requestError) {
            setError(getErrorMessage(requestError, 'Could not delete this lesson.'));
        }
    };

    const handleCompleteLesson = async () => {
        if (!selectedCourse || !selectedLesson) return;
        setBusy(true);
        setError('');
        try {
            const response = await API.post(
                `/lms/courses/${selectedCourse.id}/lessons/${selectedLesson.id}/complete`
            );
            setCourses(current => current.map(course => course.id === response.data.id ? response.data : course));
            setSelectedCourse(response.data);
            setNotice('Lesson marked as complete.');
        } catch (requestError) {
            setError(getErrorMessage(requestError, 'Could not update lesson progress.'));
        } finally {
            setBusy(false);
        }
    };

    const handleCreateAccount = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            await API.post(`/lms/students/${accountForm.studentId}/account`, {
                username: accountForm.username,
                password: accountForm.password
            });
            await loadAvailableStudents();
            setAccountForm({ studentId: '', username: '', password: '' });
            setNotice('Student learning account created. Share the username and password securely with the student.');
        } catch (requestError) {
            setError(getErrorMessage(requestError, 'Could not create this student account.'));
        } finally {
            setBusy(false);
        }
    };

    const renderLessonMedia = (lesson) => {
        if (!lesson.videoUrl) return null;
        const embedUrl = getVideoEmbed(lesson.videoUrl);
        const isDirectVideo = /\.(mp4|webm|ogv)(?:$|[?#])/i.test(lesson.videoUrl);
        return (
            <div className="learning-video mt-3">
                {embedUrl ? (
                    <iframe
                        src={embedUrl}
                        title={`${lesson.title} video`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    />
                ) : isDirectVideo ? (
                    <video controls src={lesson.videoUrl}>Your browser does not support video playback.</video>
                ) : (
                    <a className="btn btn-outline-primary" href={lesson.videoUrl} target="_blank" rel="noreferrer">
                        <Video size={16} className="me-2" />Open lesson video
                    </a>
                )}
            </div>
        );
    };

    return (
        <div className="learning-hub container-fluid py-3">
            <div className="learning-header mb-4">
                <div>
                    <span className="learning-kicker">{isStudent ? 'E-LEARNING' : 'ACADEMICS'}</span>
                    <h1>{isStudent ? 'My Learning' : 'Learning Management System'}</h1>
                    <p>{isStudent
                        ? 'Pick up where you left off and explore lessons assigned to your class.'
                        : 'Create class courses, organize lessons, and share online learning resources.'}</p>
                </div>
                <div className="learning-header-icon"><GraduationCap size={30} /></div>
            </div>

            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {notice && (
                <div className="alert alert-success d-flex justify-content-between align-items-center" role="status">
                    <span>{notice}</span>
                    <button className="btn-close" aria-label="Dismiss" onClick={() => setNotice('')} />
                </div>
            )}

            {isAdmin && (
                <section className="learning-panel mb-4">
                    <div className="learning-panel-heading">
                        <div>
                            <h2>Student learning accounts</h2>
                            <p>Link an active pupil record to a secure student sign-in.</p>
                        </div>
                        <span className="learning-count">{availableStudents.length} without accounts</span>
                    </div>
                    <form className="row g-3 align-items-end" onSubmit={handleCreateAccount}>
                        <div className="col-lg-4">
                            <label className="form-label" htmlFor="account-student">Student</label>
                            <select id="account-student" className="form-select" value={accountForm.studentId}
                                onChange={event => setAccountForm(current => ({ ...current, studentId: event.target.value }))} required>
                                <option value="">Select a student</option>
                                {availableStudents.map(student => (
                                    <option key={student.id} value={student.id}>
                                        {student.fullName} · {student.className || 'No class'} · {student.admissionNumber}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-lg-3">
                            <label className="form-label" htmlFor="account-username">Username</label>
                            <input id="account-username" className="form-control" value={accountForm.username}
                                onChange={event => setAccountForm(current => ({ ...current, username: event.target.value }))}
                                autoComplete="off" required />
                        </div>
                        <div className="col-lg-3">
                            <label className="form-label" htmlFor="account-password">Initial password</label>
                            <input id="account-password" className="form-control" type="password" minLength="8"
                                value={accountForm.password}
                                onChange={event => setAccountForm(current => ({ ...current, password: event.target.value }))}
                                autoComplete="new-password" required />
                        </div>
                        <div className="col-lg-2 d-grid">
                            <button className="btn btn-dark" disabled={busy || availableStudents.length === 0}>
                                Create account
                            </button>
                        </div>
                    </form>
                </section>
            )}

            {canManage && (
                <div className="d-flex justify-content-end mb-3">
                    <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => openCourseEditor()}>
                        <Plus size={18} />Create course
                    </button>
                </div>
            )}

            {showCourseForm && (
                <section className="learning-panel mb-4">
                    <div className="learning-panel-heading">
                        <div>
                            <h2>{editingCourse ? 'Edit course' : 'Create a course'}</h2>
                            <p>Choose the class that will see this course when you publish it.</p>
                        </div>
                        <button className="btn btn-light" type="button" onClick={() => setShowCourseForm(false)} aria-label="Close course form">
                            <X size={18} />
                        </button>
                    </div>
                    <form onSubmit={handleCourseSubmit}>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label" htmlFor="course-title">Course title</label>
                                <input id="course-title" className="form-control" maxLength="120" value={courseForm.title}
                                    onChange={event => setCourseForm(current => ({ ...current, title: event.target.value }))} required />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label" htmlFor="course-class">Class</label>
                                <select id="course-class" className="form-select" value={courseForm.className}
                                    onChange={event => setCourseForm(current => ({ ...current, className: event.target.value }))} required>
                                    <option value="">Select a class</option>
                                    {classes.map(item => <option key={item.id} value={item.className}>{item.className}</option>)}
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label" htmlFor="course-subject">Subject</label>
                                <select id="course-subject" className="form-select" value={courseForm.subjectId}
                                    onChange={event => setCourseForm(current => ({ ...current, subjectId: event.target.value }))}>
                                    <option value="">No subject</option>
                                    {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                                </select>
                            </div>
                            <div className="col-12">
                                <label className="form-label" htmlFor="course-description">Description</label>
                                <textarea id="course-description" className="form-control" rows="3" maxLength="10000"
                                    value={courseForm.description}
                                    onChange={event => setCourseForm(current => ({ ...current, description: event.target.value }))} />
                            </div>
                            <div className="col-12 d-flex align-items-center justify-content-between">
                                <label className="form-check d-flex align-items-center gap-2 mb-0">
                                    <input className="form-check-input mt-0" type="checkbox" checked={courseForm.published}
                                        onChange={event => setCourseForm(current => ({ ...current, published: event.target.checked }))} />
                                    <span className="form-check-label">Published and visible to students</span>
                                </label>
                                <button className="btn btn-primary d-flex align-items-center gap-2" disabled={busy}>
                                    <Save size={16} />{editingCourse ? 'Save changes' : 'Create course'}
                                </button>
                            </div>
                        </div>
                    </form>
                </section>
            )}

            {loading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" role="status" /></div>
            ) : courses.length === 0 ? (
                <div className="learning-empty">
                    <BookOpen size={34} />
                    <h2>{isStudent ? 'No courses available yet' : 'Start building your learning hub'}</h2>
                    <p>{isStudent
                        ? 'Published courses for your class will appear here.'
                        : 'Create a course, add lessons, then publish it for the selected class.'}</p>
                    {canManage && <button className="btn btn-primary" onClick={() => openCourseEditor()}>Create your first course</button>}
                </div>
            ) : (
                <div className="row g-3 mb-4">
                    {courses.map(course => (
                        <div className="col-xl-4 col-md-6" key={course.id}>
                            <article className={`learning-course-card ${selectedCourse?.id === course.id ? 'selected' : ''}`}>
                                <div className="d-flex justify-content-between gap-2 align-items-start">
                                    <div className="learning-course-icon"><BookOpen size={21} /></div>
                                    {canManage
                                        ? <span className={`badge ${course.published ? 'text-bg-success' : 'text-bg-secondary'}`}>
                                            {course.published ? 'Published' : 'Draft'}
                                        </span>
                                        : <span className="badge text-bg-light">{course.completedLessons}/{course.lessons.length} complete</span>}
                                </div>
                                <h2>{course.title}</h2>
                                <p className="learning-course-description">{course.description || 'Explore lessons and learning resources for this course.'}</p>
                                <div className="learning-course-meta">
                                    <span>{course.className}</span>
                                    <span>{course.subjectName || 'General'}</span>
                                </div>
                                {isStudent && course.lessons.length > 0 && (
                                    <div className="progress mt-3" role="progressbar"
                                        aria-valuenow={Math.round((course.completedLessons / course.lessons.length) * 100)}
                                        aria-valuemin="0" aria-valuemax="100">
                                        <div className="progress-bar" style={{ width: `${(course.completedLessons / course.lessons.length) * 100}%` }} />
                                    </div>
                                )}
                                <div className="d-flex justify-content-between align-items-center mt-3">
                                    <small className="text-muted">{course.lessons.length} lessons · {course.teacherName}</small>
                                    <button className="btn btn-sm btn-outline-primary" onClick={() => {
                                        setSelectedCourse(course);
                                        setSelectedLessonId(null);
                                        setShowLessonForm(false);
                                    }}>
                                        {isStudent ? 'Open course' : 'Manage lessons'}
                                    </button>
                                </div>
                                {canManage && (
                                    <div className="learning-card-actions mt-3 pt-2 border-top">
                                        <button className="btn btn-sm btn-link" onClick={() => openCourseEditor(course)}>Edit course</button>
                                        <button className="btn btn-sm btn-link text-danger" onClick={() => handleDeleteCourse(course)}>Delete</button>
                                    </div>
                                )}
                            </article>
                        </div>
                    ))}
                </div>
            )}

            {selectedCourse && (
                <section className="learning-panel learning-course-detail">
                    <div className="learning-panel-heading">
                        <div>
                            <span className="learning-kicker">{selectedCourse.className}{selectedCourse.subjectName ? ` · ${selectedCourse.subjectName}` : ''}</span>
                            <h2>{selectedCourse.title}</h2>
                            <p>{selectedCourse.description || 'Course lessons and online resources.'}</p>
                        </div>
                        <button className="btn btn-light" onClick={() => setSelectedCourse(null)} aria-label="Close course">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="row g-4">
                        <div className={isStudent ? 'col-lg-5' : 'col-12'}>
                            {canManage && (
                                <div className="d-flex justify-content-end mb-3">
                                    <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
                                        onClick={() => openLessonEditor()}>
                                        <Plus size={16} />Add lesson
                                    </button>
                                </div>
                            )}
                            {showLessonForm && canManage && (
                                <form className="learning-lesson-form mb-3" onSubmit={handleLessonSubmit}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h3 className="h6 mb-0">{editingLesson ? 'Edit lesson' : 'New lesson'}</h3>
                                        <button type="button" className="btn btn-sm btn-light" onClick={() => setShowLessonForm(false)} aria-label="Close lesson form">
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <label className="form-label" htmlFor="lesson-title">Lesson title</label>
                                    <input id="lesson-title" className="form-control mb-3" maxLength="120" value={lessonForm.title}
                                        onChange={event => setLessonForm(current => ({ ...current, title: event.target.value }))} required />
                                    <LessonContentEditor
                                        value={lessonForm.content}
                                        onChange={content => setLessonForm(current => ({ ...current, content }))} />
                                    {editingLesson && (
                                        <LessonImageGallery lessonId={editingLesson.id} images={editingLesson.images}
                                            onDelete={handleDeleteLessonImage} />
                                    )}
                                    <div className="mb-3">
                                        <label className="form-label" htmlFor="lesson-images">Lesson images</label>
                                        <input id="lesson-images" className="form-control" type="file" multiple
                                            accept="image/jpeg,image/png,image/gif,image/webp"
                                            onChange={event => setSelectedImages(Array.from(event.target.files || []))} />
                                        <small className="form-text text-muted">
                                            Upload JPEG, PNG, GIF or WebP images, up to 3 MiB each. Images appear in the lesson for students.
                                        </small>
                                        {selectedImages.length > 0 && (
                                            <ul className="small mt-2 mb-0">
                                                {selectedImages.map(file => (
                                                    <li key={`${file.name}-${file.lastModified}`}>
                                                        {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MiB)
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div className="row g-2">
                                        <div className="col-md-8">
                                            <label className="form-label" htmlFor="lesson-video">Video URL (YouTube, Vimeo, or direct video)</label>
                                            <input id="lesson-video" className="form-control" type="url" maxLength="500"
                                                placeholder="https://..." value={lessonForm.videoUrl}
                                                onChange={event => setLessonForm(current => ({ ...current, videoUrl: event.target.value }))} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label" htmlFor="lesson-order">Lesson order</label>
                                            <input id="lesson-order" className="form-control" type="number" min="1"
                                                value={lessonForm.position}
                                                onChange={event => setLessonForm(current => ({ ...current, position: event.target.value }))} />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label mt-2" htmlFor="lesson-resource">Reading / resource link</label>
                                            <input id="lesson-resource" className="form-control" type="url" maxLength="500"
                                                placeholder="https://..." value={lessonForm.resourceUrl}
                                                onChange={event => setLessonForm(current => ({ ...current, resourceUrl: event.target.value }))} />
                                        </div>
                                    </div>
                                    <button className="btn btn-primary mt-3" disabled={busy}>{editingLesson ? 'Save lesson' : 'Add lesson'}</button>
                                </form>
                            )}

                            {selectedCourse.lessons.length === 0 ? (
                                <p className="text-muted py-3">No lessons have been added to this course yet.</p>
                            ) : (
                                <div className="learning-lesson-list">
                                    {selectedCourse.lessons.map((lesson, index) => (
                                        <div className={`learning-lesson-row ${selectedLessonId === lesson.id ? 'active' : ''}`} key={lesson.id}>
                                            <button className="learning-lesson-select" onClick={() => setSelectedLessonId(lesson.id)}>
                                                <span className="learning-lesson-number">
                                                    {lesson.completed ? <CheckCircle2 size={20} /> : isStudent ? <Circle size={20} /> : index + 1}
                                                </span>
                                                <span className="text-start">
                                                    <strong>{lesson.title}</strong>
                                                    <small>{lesson.videoUrl ? 'Video lesson' : lesson.resourceUrl ? 'Reading material' : 'Lesson notes'}</small>
                                                </span>
                                            </button>
                                            {canManage && (
                                                <div className="d-flex gap-1">
                                                    <button className="btn btn-sm btn-light" title="Edit lesson" onClick={() => openLessonEditor(lesson)}>
                                                        <Save size={14} />
                                                    </button>
                                                    <button className="btn btn-sm btn-light text-danger" title="Delete lesson" onClick={() => handleDeleteLesson(lesson)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {isStudent && (
                            <div className="col-lg-7">
                                {selectedLesson ? (
                                    <article className="learning-lesson-view">
                                        <div className="d-flex justify-content-between align-items-start gap-3">
                                            <div>
                                                <span className="learning-kicker">LESSON {selectedLesson.position}</span>
                                                <h3>{selectedLesson.title}</h3>
                                            </div>
                                            {selectedLesson.completed && <span className="badge text-bg-success">Completed</span>}
                                        </div>
                                        {selectedLesson.content && (
                                            <div className="learning-lesson-content"
                                                dangerouslySetInnerHTML={{ __html: sanitizeLessonContent(selectedLesson.content) }} />
                                        )}
                                        <LessonImageGallery lessonId={selectedLesson.id} images={selectedLesson.images} />
                                        {renderLessonMedia(selectedLesson)}
                                        {selectedLesson.resourceUrl && (
                                            <a className="btn btn-outline-primary mt-3" href={selectedLesson.resourceUrl} target="_blank" rel="noreferrer">
                                                <ExternalLink size={16} className="me-2" />Open reading material
                                            </a>
                                        )}
                                        {!selectedLesson.completed && (
                                            <button className="btn btn-primary mt-4 d-flex align-items-center gap-2"
                                                onClick={handleCompleteLesson} disabled={busy}>
                                                <CheckCircle2 size={18} />Mark lesson complete
                                            </button>
                                        )}
                                    </article>
                                ) : (
                                    <div className="learning-lesson-placeholder">
                                        <BookOpen size={28} />
                                        <p>Select a lesson to start learning.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
};

export default LearningHub;
