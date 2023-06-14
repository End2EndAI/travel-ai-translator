# Travel-Translator

Travel-Translator is a unique application that enables effortless cross-language conversations, especially during travels. This tool records a speaker's words, transcribes them into text, translates that text into another language, and then displays the translated transcription for the other participant. This entire process is powered by OpenAI's API, ensuring high accuracy and efficient translation.

## Features

- Real-time transcription and translation
- Seamless and easy-to-use interface
- Powered by OpenAI's API for high-quality translations

## Requirements

- Python 3.9 or higher
- OpenAI API Key

## Getting Started

Follow the instructions below to run the Travel-Translator app:

1. **Clone the repository**

    Start by cloning the repository to your local machine.

    ```bash
    git clone https://github.com/username/travel-translator.git
    cd travel-translator
    ```

2. **Install Python 3.9**

    The application requires Python 3.9 to run. If you haven't installed it yet, please do so by following the official Python installation guide.

3. **Set up a virtual environment (Optional)**

    It is recommended to set up a virtual environment to keep the application's dependencies isolated from your system.

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

4. **Install the required packages**

    Use pip to install the necessary packages from the provided `requirements.txt` file.

    ```bash
    pip install -r requirements.txt
    ```

5. **Configure the OpenAI API Key**

    Create a `config.ini` file at the root of the project. Enter your OpenAI API Key in the following format:

    ```ini
    [OPENAI_API]
    key = <your-key>
    ```

    Make sure to replace `<your-key>` with your actual OpenAI API Key.

6. **Run the application**

    Finally, start the application by running the `flask_app.py` script.

    ```bash
    python flask_app.py
    ```

    Now, open your browser and navigate to `http://localhost:5009` to start using Travel-Translator.

## Contributing

Feel free to fork the project, make a pull request, or suggest improvements by creating an issue. All contributions are welcome!

## License

This project is licensed under the MIT License. For more details, please see the `LICENSE` file in the project repository.

Happy Travels and Translations!