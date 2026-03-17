import os
import time
from datetime import datetime
import configparser
from flask import Flask, request, render_template, jsonify, url_for, session
from openai import OpenAI
from gtts import gTTS
import secrets
import csv
import uuid

# Load OpenAI API key — environment variable takes priority over config.ini
api_key = os.environ.get("OPENAI_API_KEY")
if not api_key:
    config = configparser.ConfigParser()
    config.read("config.ini")
    try:
        api_key = config.get("OPENAI_API", "key")
    except (configparser.NoSectionError, configparser.NoOptionError):
        api_key = None

client = OpenAI(api_key=api_key)

# Initializing Flask app
app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = "static/audio/"
app.config["AUDIO_FOLDER"] = "static/audio/"
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", secrets.token_hex(16))

os.makedirs(app.config["AUDIO_FOLDER"], exist_ok=True)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/transcribe", methods=["POST"])
def transcribe_audio():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files["audio"]
    timestamp = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
    filename = f"recording_{timestamp}_{uuid.uuid4()}.webm"
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    audio_file.save(file_path)

    wait_for_file(file_path)

    input_language = request.form["input_language"]

    try:
        transcript = transcribe(file_path, input_language)
    except Exception as e:
        return jsonify({"error": f"Transcription failed: {str(e)}"}), 500

    user_agent = request.headers.get("User-Agent", "Unknown")
    save_to_csv(transcript, request.remote_addr, user_agent)

    return jsonify({"transcript": transcript})


@app.route("/translate", methods=["POST"])
def translate_audio():
    req_data = request.get_json()

    if req_data["output_language"] == "auto":
        return jsonify({
            "audio_url": "",
            "translation": "The output language cannot be set to 'auto'.",
        })

    try:
        translation = translate(
            req_data["text"],
            input_language=req_data["input_language"],
            output_language=req_data["output_language"],
        )
    except Exception as e:
        return jsonify({"error": f"Translation failed: {str(e)}"}), 500

    try:
        tts = gTTS(translation, lang=req_data["output_language"])
    except Exception as e:
        return jsonify({"error": f"Text-to-speech failed: {str(e)}"}), 500

    # Remove the previous audio file for this session
    last_audio = session.get("last_audio_file")
    if last_audio and os.path.exists(last_audio):
        os.remove(last_audio)

    timestamp = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
    filename = f"text2speech_{timestamp}.mp3"
    file_path = os.path.join(app.config["AUDIO_FOLDER"], filename)
    tts.save(file_path)

    wait_for_file(file_path)
    session["last_audio_file"] = file_path

    return jsonify({
        "audio_url": url_for("static", filename=f"audio/{filename}"),
        "translation": translation,
    })


@app.route("/audio", methods=["GET"])
def get_last_audio():
    return jsonify({"audio_url": session.get("last_audio_file", "")})


def transcribe(file_path, input_language):
    with open(file_path, "rb") as audio_file:
        kwargs = {"model": "whisper-1", "file": audio_file}
        if input_language != "auto":
            kwargs["language"] = input_language
        result = client.audio.transcriptions.create(**kwargs)
    return result.text


def translate(text, input_language, output_language):
    if input_language == "auto":
        system_prompt = (
            f"You are an expert translator specialized in converting spoken language to '{output_language}'. "
            f"Translate the following text into natural, conversational {output_language}. "
            f"Maintain the original tone, formality level, and cultural context where appropriate. "
            f"If there are idioms or expressions, translate them to equivalent expressions in {output_language} rather than literal translations. "
            f"Only respond with the direct translation, no explanations or additional text."
        )
    else:
        system_prompt = (
            f"You are an expert translator specialized in converting {input_language} to {output_language}. "
            f"Translate the following {input_language} text into natural, conversational {output_language}. "
            f"Maintain the original tone, formality level, and cultural context where appropriate. "
            f"If there are idioms or expressions in {input_language}, translate them to equivalent expressions in {output_language} rather than literal translations. "
            f"Only respond with the direct translation, no explanations or additional text."
        )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": text},
    ]

    response = client.chat.completions.create(model="gpt-4o-mini", messages=messages)
    return response.choices[0].message.content


def wait_for_file(file_path):
    while not os.path.exists(file_path) or not os.path.getsize(file_path) > 0:
        time.sleep(0.1)


def save_to_csv(transcript, ip_address, user_agent, filename="history/transcripts.csv"):
    directory = os.path.dirname(filename)
    if not os.path.exists(directory):
        os.makedirs(directory)
    with open(filename, mode="a", newline="") as file:
        writer = csv.writer(file)
        writer.writerow([datetime.now(), transcript, ip_address, user_agent])


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5009))
    ssl_cert = os.environ.get("SSL_CERT", "cert.pem")
    ssl_key = os.environ.get("SSL_KEY", "key.pem")

    if os.path.exists(ssl_cert) and os.path.exists(ssl_key):
        app.run(ssl_context=(ssl_cert, ssl_key), debug=False, host="0.0.0.0", port=port)
    else:
        app.run(debug=False, host="0.0.0.0", port=port)
