from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp
import openai
import os

from dotenv import load_dotenv


load_dotenv()  # Automatically loads from .env in the root directory

api_key = os.getenv("OPENAI_API_KEY")

# Initialize FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Replace with your frontend's origin
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Define request schema
class YouTubeURL(BaseModel):
    url: str

def download_youtube_audio(youtube_url, output_filename="youtube_audio.mp3"):
    """
    Downloads the audio from a YouTube video URL and saves it as an MP3 file.
    """
    try:
        # Define yt_dlp options
        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": output_filename.rstrip(".mp3"),  # Avoid appending .mp3 twice
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "192",
                }
            ],
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([youtube_url])

        # Ensure the file has the correct .mp3 extension
        if not output_filename.endswith(".mp3"):
            output_filename += ".mp3"

        print(f"Audio downloaded successfully: {output_filename}")
        return output_filename
    except Exception as e:
        print(f"Error during audio download: {e}")
        raise HTTPException(status_code=500, detail=f"Error downloading audio: {e}")

def transcribe_audio_with_openai(file_path):
    """
    Transcribes the given audio file using OpenAI's Whisper API.
    """
    try:
        print(f"Uploading and transcribing audio: {file_path}")
        with open(file_path, "rb") as audio_file:
            response = openai.Audio.transcribe(
                model="whisper-1",
                file=audio_file
            )
        print(f"Transcription response: {response}")  # Debugging response
        return response.get("text", "")
    except Exception as e:
        print(f"Error during transcription: {e}")
        raise HTTPException(status_code=500, detail=f"Error transcribing audio: {e}")

@app.post("/transcribe")
async def transcribe(data: YouTubeURL):
    youtube_url = data.url
    output_file = "youtube_audio.mp3"

    # Step 1: Download the audio
    try:
        output_file = download_youtube_audio(youtube_url, output_file)
    except HTTPException as e:
        return {"error": str(e.detail)}

    # Step 2: Transcribe the audio
    try:
        if not os.path.exists(output_file):
            raise HTTPException(status_code=500, detail="Audio file not found after download.")
        if os.path.getsize(output_file) == 0:
            raise HTTPException(status_code=500, detail="Downloaded audio file is empty.")

        transcription = transcribe_audio_with_openai(output_file)
        os.remove(output_file)  # Clean up temporary file
        if not transcription:
            raise HTTPException(status_code=500, detail="Transcription returned empty text.")
        return {"transcription": transcription}
    except HTTPException as e:
        return {"error": str(e.detail)}
    except Exception as e:
        print(f"Unexpected error: {e}")
        return {"error": "An unexpected error occurred during transcription"}
