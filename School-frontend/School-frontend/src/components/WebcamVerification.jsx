import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle, Loader2, RotateCcw, X } from 'lucide-react';
import { verifyFaceMatch } from '../services/faceVerification';

const WebcamVerification = ({ person, onCapture, onClose }) => {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [error, setError] = useState('');
    const [capturedImage, setCapturedImage] = useState('');
    const [starting, setStarting] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [matchVerified, setMatchVerified] = useState(false);

    useEffect(() => {
        let active = true;
        const startCamera = async () => {
            if (!navigator.mediaDevices?.getUserMedia) {
                setError('Camera access requires a supported browser and a secure connection (HTTPS or localhost).');
                setStarting(false);
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: { facingMode: 'user' }
                });
                if (!active) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (cameraError) {
                setError(cameraError.name === 'NotAllowedError'
                    ? 'Camera permission was denied. Allow camera access in your browser settings and try again.'
                    : 'Unable to access the webcam. Check that a camera is connected and not in use by another app.');
            } finally {
                if (active) setStarting(false);
            }
        };
        startCamera();
        return () => {
            active = false;
            streamRef.current?.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        };
    }, []);

    const saveMatchedAttendance = async () => {
        setError('');
        setVerifying(true);
        try {
            await onCapture();
        } catch (saveError) {
            console.error('Unable to save verified attendance:', saveError);
            setError(saveError.response?.data?.message || 'Face match succeeded, but attendance could not be saved. Please retry.');
        } finally {
            setVerifying(false);
        }
    };

    const capture = async () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth || !video.videoHeight) {
            setError('The webcam is not ready yet. Please wait and try again.');
            return;
        }
        if (!person.profilePhoto) {
            setError('A profile photo is required. Attendance was not saved.');
            return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (!context) {
            setError('Unable to process the webcam image. Please try again.');
            return;
        }
        context.drawImage(video, 0, 0);
        const image = canvas.toDataURL('image/jpeg', 0.75);
        setCapturedImage(image);
        setError('');
        setVerifying(true);
        try {
            const result = await verifyFaceMatch(person.profilePhoto, image);
            if (!result.matched) {
                setError('The system could not confidently match this image to the profile photo. Attendance was not saved. Retake the photo or use the manual attendance controls.');
                return;
            }
            setMatchVerified(true);
            await saveMatchedAttendance();
        } catch (verificationError) {
            console.error('Face verification failed:', verificationError);
            setError(verificationError.message || 'Face verification failed. Attendance was not saved.');
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
             style={{ background: 'rgba(0,0,0,.7)', zIndex: 2000 }}
             role="dialog" aria-modal="true" aria-label={`Verify ${person.name}`}>
            <div className="card border-0 shadow-lg w-100" style={{ maxWidth: 760 }}>
                <div className="card-header d-flex justify-content-between align-items-center bg-dark text-white">
                    <div>
                        <h5 className="mb-0">Automated face verification</h5>
                        <small className="text-white-50">{person.name}</small>
                    </div>
                    <button type="button" className="btn btn-sm btn-outline-light" onClick={onClose} aria-label="Close camera">
                        <X size={18} />
                    </button>
                </div>
                <div className="card-body">
                    <p className="small text-muted">The system compares the live view with the profile photo in this browser. The webcam snapshot is temporary and is not uploaded or stored. A successful match immediately marks the person present.</p>
                    <div className="row g-3 align-items-start">
                        <div className="col-md-5 text-center">
                            <div className="fw-semibold small mb-2">Profile photo</div>
                            {person.profilePhoto ? (
                                <img src={person.profilePhoto} alt={`${person.name} profile`} className="img-fluid rounded border"
                                     style={{ maxHeight: 300, objectFit: 'contain' }} />
                            ) : (
                                <div className="border rounded bg-light text-muted d-flex align-items-center justify-content-center"
                                     style={{ minHeight: 180 }}>No profile photo available</div>
                            )}
                        </div>
                        <div className="col-md-7 text-center">
                            <div className="fw-semibold small mb-2">Webcam</div>
                            <video ref={videoRef} autoPlay playsInline muted className="w-100 rounded border bg-dark"
                                   style={{ maxHeight: 300, minHeight: 180, objectFit: 'cover', display: capturedImage ? 'none' : 'block' }} />
                            {capturedImage && (
                                <img src={capturedImage} alt="Temporary verification snapshot" className="img-fluid rounded border"
                                     style={{ maxHeight: 300 }} />
                            )}
                        </div>
                    </div>
                    {!person.profilePhoto && <div className="alert alert-warning mt-3 mb-0" role="alert">Add a profile photo before using automated verification. Attendance can still be marked with the manual controls.</div>}
                    {error && <div className="alert alert-danger mt-3 mb-0" role="alert">{error}</div>}
                    <div className="d-flex flex-wrap justify-content-end gap-2 mt-3">
                        {verifying ? (
                            <button type="button" className="btn btn-primary" disabled>
                                <Loader2 size={16} className="me-1" />{matchVerified ? 'Saving Present...' : 'Checking face...'}
                            </button>
                        ) : capturedImage && matchVerified ? (
                            <button type="button" className="btn btn-success" onClick={saveMatchedAttendance}>
                                <CheckCircle size={16} className="me-1" />Retry saving Present
                            </button>
                        ) : capturedImage ? (
                            <>
                                <button type="button" className="btn btn-outline-secondary" onClick={() => { setCapturedImage(''); setError(''); }}>
                                    <RotateCcw size={16} className="me-1" /> Retake
                                </button>
                            </>
                        ) : (
                            <button type="button" className="btn btn-dark" onClick={capture} disabled={starting || Boolean(error) || !person.profilePhoto}>
                                {starting ? <Loader2 size={16} className="me-1" /> : <Camera size={16} className="me-1" />}
                                Capture and verify
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WebcamVerification;
