// Get references to HTML elements
const recordButton = document.getElementById('recordButton');
const translation = document.getElementById('translation');
const transcript = document.getElementById('transcript');
const inputLanguage = document.getElementById('inputLanguage');
const outputLanguage = document.getElementById('outputLanguage');
const arrowImage = document.getElementById('arrow');
const modeSelector = document.getElementById('modeSelector');
const toastContainer = document.getElementById('toastContainer');

// Variables to control recording state and audio data
let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let stream;
let mode = 'solo';
let startTime;

// Show a toast notification (type: 'error' | 'success' | 'info')
function showToast(message, type = 'error') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-fade-out');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// Set the button to a loading state while the API processes
function setLoading(isLoading) {
    if (isLoading) {
        recordButton.textContent = 'Processing…';
        recordButton.disabled = true;
        recordButton.classList.add('loading');
    } else {
        recordButton.textContent = 'Start';
        recordButton.disabled = false;
        recordButton.classList.remove('loading');
    }
}

// Start recording audio
async function startRecording() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        showToast('Microphone access denied. Please allow microphone access and try again.');
        return;
    }

    isRecording = true;
    recordButton.textContent = 'Stop';
    recordButton.classList.add('recording');

    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.addEventListener('dataavailable', event => {
        audioChunks.push(event.data);
    });

    mediaRecorder.start();
    startTime = performance.now();
}

// Stop recording and send audio for processing
async function stopRecordingAndSave() {
    if (!isRecording) return;

    recordButton.classList.remove('recording');
    translation.textContent = '';
    transcript.textContent = '';

    const stopPromise = new Promise(resolve => mediaRecorder.addEventListener('stop', resolve));
    mediaRecorder.stop();
    const duration = (performance.now() - startTime) / 1000;
    stream.getTracks().forEach(track => track.stop());
    await stopPromise;

    isRecording = false;

    const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
    audioChunks.length = 0;

    if (duration > 60) {
        showToast('Recording too long (max 60 seconds). Please try again.');
        recordButton.textContent = 'Start';
        return;
    }

    setLoading(true);
    await sendAudioToServer(audioBlob);
    setLoading(false);
}

// Stop recording without processing (used when switching language/mode)
function stopRecording() {
    if (!isRecording) return;

    recordButton.textContent = 'Start';
    recordButton.classList.remove('recording');
    translation.textContent = '';
    transcript.textContent = '';

    mediaRecorder.stop();
    stream.getTracks().forEach(track => track.stop());
    isRecording = false;
}

// Send audio to server for transcription then translation
async function sendAudioToServer(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('input_language', inputLanguage.value);

    try {
        const response = await fetch('/transcribe', { method: 'POST', body: formData });
        const data = await response.json();

        if (data.error) {
            showToast(data.error);
            return;
        }

        transcript.textContent = data.transcript;
        await translateTranscript(data.transcript);
    } catch (error) {
        showToast('Network error. Please check your connection and try again.');
    }
}

// Translate the transcription
async function translateTranscript(transcriptText) {
    try {
        const response = await fetch('/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: transcriptText,
                input_language: inputLanguage.value,
                output_language: outputLanguage.value,
            }),
        });
        const data = await response.json();

        if (data.error) {
            showToast(data.error);
            return;
        }

        translation.textContent = data.translation;
        playAudio(data.audio_url);

        if (mode === 'conversation' && !isRecording) {
            [inputLanguage.value, outputLanguage.value] = [outputLanguage.value, inputLanguage.value];
        }
    } catch (error) {
        showToast('Translation failed. Please try again.');
    }
}

// Play audio from the provided URL
function playAudio(url) {
    if (!url) return;
    const audio = new Audio(url + '?t=' + new Date().getTime());
    audio.addEventListener('canplaythrough', function () {
        audio.play();
    }, false);
}

// Toggle recording on button click
async function toggleRecording() {
    if (!isRecording) {
        await startRecording();
    } else {
        await stopRecordingAndSave();
    }
}

// Replay the last generated audio
async function fetchAndPlayAudio() {
    try {
        stopRecording();
        const data = await fetch('/audio', { method: 'GET' }).then(r => r.json());
        if (!data.audio_url) {
            showToast('No audio available yet. Record something first.', 'info');
            return;
        }
        playAudio(data.audio_url);
    } catch (error) {
        showToast('Could not fetch audio. Please try again.');
    }
}

// Copy text content of an element to clipboard
function copyToClipboard(elementId) {
    const el = document.getElementById(elementId);
    const text = el.textContent.trim();
    if (!text) {
        showToast('Nothing to copy yet.', 'info');
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!', 'success');
    }).catch(() => {
        showToast('Could not copy text.');
    });
}

// Clear transcript and translation outputs
function clearOutput() {
    transcript.textContent = '';
    translation.textContent = '';
}

// Swap languages on arrow click
arrowImage.addEventListener('click', function () {
    stopRecording();
    setTimeout(() => {
        [inputLanguage.value, outputLanguage.value] = [outputLanguage.value, inputLanguage.value];
    }, 0);
    arrowImage.classList.add('clicked');
    setTimeout(() => arrowImage.classList.remove('clicked'), 300);
});

// Stop recording when input language changes
inputLanguage.addEventListener('change', function () {
    stopRecording();
});

// Stop recording when output language changes
outputLanguage.addEventListener('change', function () {
    stopRecording();
});

// Update mode when selector changes
modeSelector.addEventListener('change', function () {
    stopRecording();
    setTimeout(() => {
        mode = this.value;
        translation.textContent = '';
        transcript.textContent = '';
    }, 0);
});
