import os
import time
from datetime import datetime
import configparser
from werkzeug.utils import secure_filename
from flask import Flask, request, render_template, jsonify, url_for
import openai
from gtts import gTTS

config = configparser.ConfigParser()
config.read('config.ini')

openai.api_key = config.get('OPENAI_API', 'key')


app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = "./"  # set your upload folder path here

CURRENT_AUDIO_FILE_PATH = None

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
    while not os.path.exists(file_path) or not os.path.getsize(file_path) > 0:
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
    
    # Instantiate gTTS with the translation and the target language
    tts = gTTS(translation, lang=output_language)
    
    # Generate a unique filename by appending a timestamp
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = "audio_" + timestamp + ".mp3"
    file_path = "static/audio/" + filename
    
    global CURRENT_AUDIO_FILE_PATH
    
    # Remove audio file if exists
    if not CURRENT_AUDIO_FILE_PATH == None:
        os.remove(CURRENT_AUDIO_FILE_PATH)
    
    # Assign the new audio file path    
    CURRENT_AUDIO_FILE_PATH = file_path
            
    # Save audio file
    tts.save(file_path)
    
    # Wait for the file to be saved
    while not os.path.exists(file_path) or not os.path.getsize(file_path) > 0:
        time.sleep(0.1)  # Sleep for a short duration before checking again
        
    return jsonify({'audio_url': url_for('static', filename='audio/' + filename), 'translation': translation})

@app.route('/audio', methods=['GET'])
def get_last_audio():         
    return jsonify({'audio_url': CURRENT_AUDIO_FILE_PATH })

def transcribe(file_path, input_language):
    audio_file = open(file_path, "rb")

    transcript = openai.Audio.transcribe(
        "whisper-1", audio_file, language=input_language)

    return transcript['text']


def translate(text, input_language, output_language):
    messages = [
        {"role": "system", "content": f"You are a helpful translator. \
        You will receive a transcribe in '{input_language}', and you have to translate in '{output_language}'. \
        The translation should be in spoken language. Only reply with the translation, without pronountiation or pinyin or quotes."},
        {"role": "user", "content": f"Transcribe : {text}; Translation : "}
    ]
    
    translation = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=messages
    )
    
    return translation['choices'][0]['message']['content']
    
if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5009)
