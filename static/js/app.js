// Get references to HTML elements
const recordButton = document.getElementById('recordButton');
const translation = document.getElementById('translation');
const transcript = document.getElementById('transcript');
const inputLanguage = document.getElementById('inputLanguage');
const outputLanguage = document.getElementById('outputLanguage');
const arrowImage = document.getElementById('arrow');
const modeSelector = document.getElementById('modeSelector');

// Variables to control recording state and audio data
let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let stream;
let mode = 'solo';
let isAudioPlaying = false;

// Start recording audio
async function startRecording() {
    isRecording = true;
    recordButton.textContent = 'Stop';

    // Get user media (audio) stream
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    // Collect audio data chunks
    mediaRecorder.addEventListener('dataavailable', event => {
        audioChunks.push(event.data);
    });

    // Start recording
    mediaRecorder.start();
}

// Stop recording audio and process the recorded data
async function stopRecordingAndSave() {
    if (isRecording) {
        recordButton.textContent = 'Start';
        translation.textContent = '';
        transcript.textContent = '';

        // Wait for the 'stop' event to resolve
        const stopPromise = new Promise(resolve => mediaRecorder.addEventListener('stop', resolve));

        // Stop recording and release the media stream
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
        await stopPromise;

        isRecording = false;

        // Create a Blob object from the collected audio data
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        audioChunks.length = 0;

        // Send the audio data to the server for transcription
        sendAudioToServer(audioBlob);
    }
}

function stopRecording() {
    if (isRecording) {
        recordButton.textContent = 'Start';
        translation.textContent = '';
        transcript.textContent = '';

        // Stop recording and release the media stream
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());

        isRecording = false;
    }
}

// Send the audio data to the server for transcription
async function sendAudioToServer(audioBlob) {
    let formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('input_language', inputLanguage.value);

    try {
        // Make a POST request to transcribe the audio
        let transcription = await fetch('/transcribe', {
            method: 'POST',
            body: formData,
        }).then(response => response.json());

        // Display the transcription
        transcript.textContent = transcription.transcript;

        // Translate the transcription
        await translateTranscript(transcription.transcript);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Translate the transcription
async function translateTranscript(transcriptText) {
    try {
        // Make a POST request to translate the text
        let data = await fetch('/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: transcriptText,
                input_language: inputLanguage.value,
                output_language: outputLanguage.value
            }),
        }).then(response => response.json());

        // Display the translation
        translation.textContent = data.translation;

        // Play the translated audio
        playAudio(data['audio_url']);

        // When the audio ends
        isAudioPlaying = false;
        if (mode === 'conversation' && !isRecording) {
            // Swap languages
            [inputLanguage.value, outputLanguage.value] = [outputLanguage.value, inputLanguage.value];
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Play audio from the provided URL
function playAudio(url) {
    let audio = new Audio(url + "?t=" + new Date().getTime());

    // Play the audio when it's ready
    audio.addEventListener('canplaythrough', function () {
        audio.play();
    }, false);
}

// Toggle recording based on the current state
async function toggleRecording() {
    if (!isRecording) {
        await startRecording();
    } else {
        await stopRecordingAndSave();
    }
}

// Fetch and play audio from the server
async function fetchAndPlayAudio() {
    try {
        //If it's recording, stop the recording
        stopRecording()

        
        isRecording = false

        const data = await fetch('/audio', { method: 'GET' }).then(response => response.json());

        // Play the fetched audio
        playAudio(data['audio_url']);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Swap selected input and output languages
arrowImage.addEventListener('click', function () {
    //If it's recording, stop the recording
    stopRecording()

    // Swap the values of inputLanguage and outputLanguage after a delay
    setTimeout(() => {
        [inputLanguage.value, outputLanguage.value] = [outputLanguage.value, inputLanguage.value];
    }, 0);

    // Add a 'clicked' class to animate the arrow
    arrowImage.classList.add('clicked');

    // Remove the 'clicked' class after a short delay
    setTimeout(() => arrowImage.classList.remove('clicked'), 300);
});

// Change the font class when the input language changes
inputLanguage.addEventListener("change", function () {
    //If it's recording, stop the recording
    stopRecording()

    setTimeout(() => {
        changeFontClass("selected-input-font");
    }, 0);
    
});

// Change the font class when the output language changes
outputLanguage.addEventListener("change", function () {
    //If it's recording, stop the recording
    stopRecording()

    setTimeout(() => {
        changeFontClass("selected-output-font")
    }, 0);
});

// Change the font class of the selected option
function changeFontClass(className) {
    return function () {
        let selectedOption = this.options[this.selectedIndex];

        let prevSelectedOption = document.querySelector(`.${className}`);
        if (prevSelectedOption) {
            prevSelectedOption.classList.remove(className);
        }

        selectedOption.classList.add(className);
    };
}

// Update mode when selector changes
modeSelector.addEventListener('change', function () {
    //If it's recording, stop the recording
    stopRecording()

    setTimeout(() => {
        mode = this.value;
        translation.textContent = '';
        transcript.textContent = '';
    }, 0);

});