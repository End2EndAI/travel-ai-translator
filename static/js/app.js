let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let stream;

async function toggleRecording() {
    const recordButton = document.getElementById('recordButton');
    const translation = document.getElementById('translation');
    const transcript = document.getElementById('transcript');

    if (!isRecording) {
        isRecording = true;
        recordButton.textContent = 'Stop';
        translation.textContent = '';
        transcript.textContent = '';

        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.addEventListener('dataavailable', event => {
            audioChunks.push(event.data);
        });

        mediaRecorder.start();

    } else {
        recordButton.textContent = 'Start';

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

                // Create a new audio object and play it
                let audio = new Audio(data['audio_url'] + "?t=" + new Date().getTime());

                // Set audio preload and source
                audio.preload = 'auto';
                audio.src = data['audio_url'];

                // Add an event listener for the 'canplaythrough' event
                audio.addEventListener('canplaythrough', function() {
                    // The audio file can be played to the end without interruption,
                    // so start playing it
                    audio.play();
                }, false);

                // Add an event listener for the 'ended' event to handle playback completion
                audio.addEventListener('ended', function() {
                    console.log('Audio playback completed.');
                }, false);
            })
            .catch(error => console.error('Error:', error));
    }
}

// Animation of the arrow when clicked

var arrow_image = document.getElementById('arrow');

document.getElementById('arrow').addEventListener('click', function() {
    var inputLangSelect = document.getElementById('inputLanguage');
    var outputLangSelect = document.getElementById('outputLanguage');
    
    var temp = inputLangSelect.value;
    inputLangSelect.value = outputLangSelect.value;
    outputLangSelect.value = temp;

    // Apply animation
    arrow_image.classList.add('clicked');
    setTimeout(function() {
        arrow_image.classList.remove('clicked');
    }, 300);
});

//Change font of the selected language 

var selectElementOutput = document.getElementById("inputLanguage");

selectElementOutput.addEventListener("change", function() {
  var selectedOption = this.options[this.selectedIndex];

  // Remove the class from any previously selected option
  var prevSelectedOption = document.querySelector(".selected-input-font");
  if (prevSelectedOption) {
    prevSelectedOption.classList.remove("selected-input-font");
  }

  // Add the class to the newly selected option
  selectedOption.classList.add("selected-input-font");
});

var selectElementInput = document.getElementById("outputLanguage");

selectElementInput.addEventListener("change", function() {
  var selectedOption = this.options[this.selectedIndex];

  // Remove the class from any previously selected option
  var prevSelectedOption = document.querySelector(".selected-output-font");
  if (prevSelectedOption) {
    prevSelectedOption.classList.remove("selected-output-font");
  }

  // Add the class to the newly selected option
  selectedOption.classList.add("selected-output-font");
});

