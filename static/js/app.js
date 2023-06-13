let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let stream;

async function toggleRecording() {
    const recordButton = document.getElementById('recordButton');
    const translation = document.getElementById('translation');
    const transcript = document.getElementById('transcript');

    if (!isRecording) {

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            translation.textContent = 'Your browser does not support recording.';
            return;
        }

        isRecording = true;
        recordButton.textContent = 'Stop Recording';
        translation.textContent = '';
        transcript.textContent = '';

        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.addEventListener('dataavailable', event => {
            audioChunks.push(event.data);
        });

        mediaRecorder.start();

    } else {
        recordButton.textContent = 'Start Recording';

        // Create a Promise that resolves when the 'stop' event is fired
        const stopPromise = new Promise(resolve => mediaRecorder.addEventListener('stop', resolve));

        mediaRecorder.stop();

        // Stop the media stream
        stream.getTracks().forEach(track => track.stop());

        // Wait for the 'stop' event to be fired
        await stopPromise;

        isRecording = false;
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        audioChunks.length = 0; // Clear the audioChunks array


        // send audioBlob to server and get translation
        let formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('input_language', document.getElementById('inputLanguage').value);

        fetch('/transcribe', {
            method: 'POST',
            body: formData,
        })
            .then(response => response.json())
            .then(data => {
                transcript.textContent = data.transcript;

                // Now make the request for translation
                return fetch('/translate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text: data.transcript, input_language: document.getElementById('inputLanguage').value, output_language: document.getElementById('outputLanguage').value }),
                });
            })
            .then(response => response.json())
            .then(data => {
                translation.textContent = data.translation;
            })
            .catch(error => console.error('Error:', error));
    }
}
