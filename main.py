import os
import time
from werkzeug.utils import secure_filename

from flask import Flask, request, render_template, jsonify

import openai

openai.api_key = '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'


app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = "./"  # set your upload folder path here

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

    input_language = request.form['input_language']
    
    transcript = transcribe(file_path, input_language)

    return jsonify({'transcript': transcript})


@app.route('/translate', methods=['POST'])
def translate_audio():
    transcript = request.get_json()['text']
    input_language = request.get_json()['input_language']
    output_language = request.get_json()['output_language']
    
    # set your target language here
    translation = translate(transcript, input_language=input_language, output_language=output_language)

    return jsonify({'translation': translation})


def transcribe(file_path, input_language):
    audio_file = open(file_path, "rb")

    transcript = openai.Audio.transcribe(
        "whisper-1", audio_file, language=input_language)

    return transcript['text']


def translate(text, input_language, output_language):
    messages = [
        {"role": "system", "content": f"You are a helpful translator. \
        You will receive a transcribe in '{input_language}', and you have to translate in '{output_language}'. \
        Take into account in the translation that the transcription may be incomplete or inaccurate. \
        The translation should be in spoken language."},
        {"role": "user", "content": f"Transcribe : {text}; Translation : "}
    ]
    
    translation = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=messages
    )
    return translation['choices'][0]['message']['content']


if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5009)
