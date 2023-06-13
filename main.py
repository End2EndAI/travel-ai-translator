import os
import time
from werkzeug.utils import secure_filename
import soundfile as sf

from flask import Flask, request, render_template, jsonify

import openai

openai.api_key = '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'

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = "C:\\tmp"  # set your upload folder path here


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    file = request.files['audio']
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename + '.wav')

    if os.path.exists(file_path):
        os.remove(file_path)

    file.save(file_path)

    # Wait for the file to be saved
    while not os.path.exists(file_path):
        time.sleep(0.1)  # Sleep for a short duration before checking again

    transcript = transcribe(file_path)

    return jsonify({'transcript': transcript})


@app.route('/translate', methods=['POST'])
def translate_audio():
    transcript = request.get_json()['text']
    # set your target language here
    translation = translate(transcript, target_language='en')

    return jsonify({'translation': translation})


def transcribe(file_path):
    audio_file = open(file_path, "rb")

    transcript = openai.Audio.transcribe(
        "whisper-1", audio_file, language='fr')

    return transcript['text']


def translate(text, target_language):
    messages = [
        {"role": "system", "content": "You are a helpful translator from french to english. \
        You will receive a transcribe in french, and you have to translate in english. \
        Take into account in the translation that the transcription has errors in it, correct the mistakes in the translation. \
        The translation should be in spoken language."},
        {"role": "user", "content": f"Transcribe : {text}; Translation : "}
    ]
    print(messages)
    translation = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=messages
    )
    return translation['choices'][0]['message']['content']


if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)
