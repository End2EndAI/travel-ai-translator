import os
import time
from datetime import datetime
import configparser
from werkzeug.utils import secure_filename
from flask import Flask, request, render_template, jsonify, url_for, session
import openai
from gtts import gTTS
import secrets

# Loading OpenAI API key from configuration file
config = configparser.ConfigParser()
config.read('config.ini')
openai.api_key = config.get('OPENAI_API', 'key')

# Initializing Flask app
app = Flask(__name__)
# Setting up paths for upload and audio directories
app.config['UPLOAD_FOLDER'] = "./"  
app.config['AUDIO_FOLDER'] = "static/audio/"
# Generating a secret key for the session
app.config['SECRET_KEY'] = secrets.token_hex(16)

@app.route('/')
def index():
    # Serving the initial index page
    return render_template('index.html')

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    # Transcribing uploaded audio file
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    # Securing the filename and saving it in the defined upload directory
    audio_file = request.files['audio']
    filename = f"{secure_filename(audio_file.filename)}.wav"
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    audio_file.save(file_path)

    # Waiting for the file to be completely written to the disk
    wait_for_file(file_path)

    # Transcribing the audio file using OpenAI's whisper model
    input_language = request.form['input_language']
    transcript = transcribe(file_path, input_language)
    
    return jsonify({'transcript': transcript})

@app.route('/translate', methods=['POST'])
def translate_audio():
    # Translating provided text and converting it into speech
    req_data = request.get_json()

    # Translating the text
    translation = translate(
        req_data['text'], 
        input_language=req_data['input_language'], 
        output_language=req_data['output_language']
    )

    # Converting the translated text into speech
    tts = gTTS(translation, lang=req_data['output_language'])

    # Remove the previous audio file
    if not session.get('last_audio_file', None) == None:
        os.remove(session.get('last_audio_file', ''))
        
    # Saving the speech file to the audio directory
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = f"audio_{timestamp}.mp3"
    file_path = os.path.join(app.config['AUDIO_FOLDER'], filename)
    tts.save(file_path)

    wait_for_file(file_path)

    # Storing the path of the last audio file in the session
    session['last_audio_file'] = file_path
        
    return jsonify({
        'audio_url': url_for('static', filename=f'audio/{filename}'), 
        'translation': translation
    })

@app.route('/audio', methods=['GET'])
def get_last_audio():         
    # Returning the path of the last audio file from the session
    return jsonify({'audio_url': session.get('last_audio_file', '') })

def transcribe(file_path, input_language):
    # Transcribing audio using OpenAI's whisper model
    with open(file_path, "rb") as audio_file:
        transcript = openai.Audio.transcribe(
            "whisper-1", audio_file, language=input_language
        )
    return transcript['text']

def translate(text, input_language, output_language):
    # Translating text using OpenAI's gpt-3.5-turbo model
    messages = [
        {
            "role": "system", 
            "content": (
                f"You are a helpful translator. You will receive a transcribe in "
                f"'{input_language}', and you have to translate in '{output_language}'. "
                "The translation should be in spoken language. Only reply with the "
                "translation, without pronountiation or pinyin or quotes."
            )
        },
        {"role": "user", "content": f"Transcribe : {text}; Translation : "}
    ]
    
    translation = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=messages
    )
    
    return translation['choices'][0]['message']['content']

def wait_for_file(file_path):
    # Wait for file to exist and to be non-empty before proceeding
    while not os.path.exists(file_path) or not os.path.getsize(file_path) > 0:
        time.sleep(0.1)

# Run the Flask app
if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5009)
