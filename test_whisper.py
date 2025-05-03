import yt_dlp
import openai
import os
import uuid
from dotenv import load_dotenv

# Load environment variables (like API key)
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

def download_youtube_audio(youtube_url, output_dir="downloads"):
    """
    Downloads the audio from a YouTube video and saves it as a uniquely named .mp3 file.
    """
    # Create downloads folder if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    # Generate unique filename
    unique_id = str(uuid.uuid4())
    output_path = os.path.join(output_dir, f"audio_{unique_id}")

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": output_path,  # No .mp3 yet, it will be added by the postprocessor
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ],
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([youtube_url])
        final_mp3 = output_path + ".mp3"
        print(f"[✓] Audio downloaded successfully: {final_mp3}")
        return final_mp3
    except Exception as e:
        print(f"[✗] Error during audio download: {e}")
        return None

def transcribe_audio_with_openai(file_path):
    """
    Sends an audio file to OpenAI Whisper and returns the transcribed text.
    """
    try:
        print(f"[…] Transcribing audio file: {file_path}")
        with open(file_path, "rb") as audio_file:
            response = openai.Audio.transcribe(
                model="whisper-1",
                file=audio_file
            )
        print("[✓] Transcription complete.")
        return response.get("text", "")
    except Exception as e:
        print(f"[✗] Error during transcription: {e}")
        return None

# Entry point
if __name__ == "__main__":
    youtube_url = input("Enter YouTube URL: ").strip()
    audio_file = download_youtube_audio(youtube_url)

    if audio_file and os.path.exists(audio_file):
        transcription = transcribe_audio_with_openai(audio_file)
        if transcription:
            print("\n====== Transcription Result ======")
            print(transcription)
        else:
            print("✗ Transcription failed.")
        os.remove(audio_file)  # Optional: keep or delete the file
    else:
        print("✗ Audio file could not be processed.")
