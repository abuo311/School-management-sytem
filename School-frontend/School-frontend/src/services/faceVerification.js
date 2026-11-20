const MIN_FACE_SIMILARITY = 0.6;
const MIN_FACE_SCORE = 0.6;

const humanConfig = {
    backend: 'webgl',
    async: true,
    warmup: 'none',
    modelBasePath: `${import.meta.env.BASE_URL}models/`,
    face: {
        enabled: true,
        detector: {
            enabled: true,
            modelPath: 'blazeface.json',
            return: true,
            maxDetected: 2,
            minConfidence: MIN_FACE_SCORE
        },
        mesh: { enabled: true, modelPath: 'facemesh.json' },
        description: { enabled: true, modelPath: 'faceres.json' },
        iris: { enabled: false },
        attention: { enabled: false },
        emotion: { enabled: false },
        antispoof: { enabled: false },
        liveness: { enabled: false },
        gear: { enabled: false }
    },
    body: { enabled: false },
    hand: { enabled: false },
    object: { enabled: false },
    gesture: { enabled: false },
    segmentation: { enabled: false }
};

let humanPromise;

const getHuman = () => {
    if (!humanPromise) {
        humanPromise = import('@vladmandic/human')
            .then(async ({ Human }) => {
                const human = new Human(humanConfig);
                await human.load();
                return human;
            })
            .catch(error => {
                humanPromise = null;
                throw error;
            });
    }
    return humanPromise;
};

const loadImage = source => new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The profile or webcam image could not be loaded.'));
    image.src = source;
});

const getSingleFace = result => {
    const faces = result.face || [];
    if (faces.length !== 1) {
        throw new Error(faces.length === 0
            ? 'No face was detected. Use a clear, front-facing photo and try again.'
            : 'More than one face was detected. Make sure only one person is in view.');
    }

    const face = faces[0];
    if (!face.embedding?.length || face.faceScore < MIN_FACE_SCORE) {
        throw new Error('The face image is not clear enough to verify. Try better lighting and a closer view.');
    }
    return face;
};

export const verifyFaceMatch = async (profilePhoto, capturedPhoto) => {
    if (!profilePhoto) {
        throw new Error('A profile photo is required for automated verification.');
    }

    const [human, profileImage, capturedImage] = await Promise.all([
        getHuman(),
        loadImage(profilePhoto),
        loadImage(capturedPhoto)
    ]);

    const profileResult = await human.detect(profileImage);
    const capturedResult = await human.detect(capturedImage);
    const profileFace = getSingleFace(profileResult);
    const capturedFace = getSingleFace(capturedResult);
    const similarity = human.match.similarity(profileFace.embedding, capturedFace.embedding);

    return {
        matched: Number.isFinite(similarity) && similarity >= MIN_FACE_SIMILARITY,
        similarity
    };
};
