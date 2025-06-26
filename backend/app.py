

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
from dotenv import load_dotenv
import openai
import os
import yt_dlp
import uuid
import re
import firebase_admin
from firebase_admin import credentials, firestore
from textblob import TextBlob
from collections import Counter

# Load environment variables
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# Initialize Firebase
cred = credentials.Certificate("firebase_credentials.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Setup EmoRoBERTa
emo_roberta = pipeline("sentiment-analysis", model="cardiffnlp/twitter-roberta-base-sentiment")
label_map = {
    "LABEL_0": "Negative",
    "LABEL_1": "Neutral",
    "LABEL_2": "Positive"
}

# Initialize FastAPI
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request body structure
class AnalyzeRequest(BaseModel):
    url: str
    user_id: str

# Generate safe document ID based on video URL only
def generate_doc_id(video_url):
    return re.sub(r'\W+', '_', video_url)

# Check if analysis for this video already exists
def check_existing_analysis_by_video(video_url):
    doc_id = generate_doc_id(video_url)
    doc_ref = db.collection("analyses").document(doc_id).get()
    if doc_ref.exists:
        return doc_ref.to_dict()
    return None

# Save analysis to Firestore
def save_analysis(user_id, video_url, transcription, sentence_results, summary, overall, timeline_data):
    doc_id = generate_doc_id(video_url)
    db.collection("analyses").document(doc_id).set({
        "user_id": user_id,
        "video_url": video_url,
        "transcription": transcription,
        "sentences": sentence_results,
        "summary": summary,
        "overall_sentiment": overall,
        "timeline_data": timeline_data,  # Add timeline data
        "created_at": firestore.SERVER_TIMESTAMP
    })

# Download audio from YouTube
def download_youtube_audio(youtube_url, output_dir="downloads"):
    os.makedirs(output_dir, exist_ok=True)
    unique_id = str(uuid.uuid4())
    output_path = os.path.join(output_dir, f"audio_{unique_id}")
    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": output_path,
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }],
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([youtube_url])
        return output_path + ".mp3"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download error: {e}")

# Transcribe audio to text using Whisper with timestamps
def transcribe_audio(path):
    try:
        with open(path, "rb") as f:
            result = openai.Audio.transcribe(
                model="whisper-1", 
                file=f,
                response_format="verbose_json",  # Get detailed output with timestamps
                timestamp_granularities=["segment"]  # Get segment-level timestamps
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription error: {e}")

# Process whisper response to extract sentences with timestamps
def extract_sentences_with_timestamps(whisper_response):
    sentences = []
    
    for segment in whisper_response.get("segments", []):
        text = segment.get("text", "").strip()
        start = segment.get("start", 0)
        end = segment.get("end", 0)
        
        if text:
            sentences.append({
                "text": text,
                "start_time": start,
                "end_time": end
            })
    
    return sentences

# Analyze each sentence with EmoRoBERTa
def analyze_sentences(sentences):
    results = []
    for i, sentence in enumerate(sentences, 1):
        try:
            analysis = emo_roberta(sentence["text"])[0]
            sentiment = label_map.get(analysis["label"], "Neutral")
        except:
            sentiment = "Neutral"
        
        # Store both sentiment and time information
        results.append({
            "index": i,
            "text": sentence["text"],
            "final_sentiment": sentiment,
            "start_time": sentence["start_time"],
            "end_time": sentence["end_time"]
        })
    return results

# Apply smoothing to sentiment values over time
def apply_smoothing(sentence_results, window_size=3):
    # Convert to sentiment values (1 for the assigned sentiment, 0 for others)
    timeline_data = []
    total_duration = max(s["end_time"] for s in sentence_results)
    
    # Create data points every second
    for t in range(int(total_duration) + 1):
        # Find the sentence that contains this timestamp
        current_sentence = None
        for s in sentence_results:
            if s["start_time"] <= t and s["end_time"] >= t:
                current_sentence = s
                break
        
        # If no sentence contains this timestamp, use the nearest one
        if not current_sentence and sentence_results:
            # Find nearest sentence by distance to midpoint
            current_sentence = min(
                sentence_results,
                key=lambda s: min(
                    abs(t - s["start_time"]),
                    abs(t - s["end_time"])
                )
            )
        
        # Add data point
        if current_sentence:
            sentiment = current_sentence["final_sentiment"]
            data_point = {
                "time": t,
                "Positive": 1 if sentiment == "Positive" else 0,
                "Negative": 1 if sentiment == "Negative" else 0,
                "Neutral": 1 if sentiment == "Neutral" else 0
            }
            timeline_data.append(data_point)
    
    # Apply smoothing
    smoothed_data = []
    for i, point in enumerate(timeline_data):
        # Calculate window boundaries
        window_start = max(0, i - window_size // 2)
        window_end = min(len(timeline_data), i + window_size // 2 + 1)
        window = timeline_data[window_start:window_end]
        
        # Calculate moving averages
        positive_avg = sum(p["Positive"] for p in window) / len(window)
        negative_avg = sum(p["Negative"] for p in window) / len(window)
        neutral_avg = sum(p["Neutral"] for p in window) / len(window)
        
        smoothed_data.append({
            "time": point["time"],
            "Positive": positive_avg,
            "Negative": negative_avg,
            "Neutral": neutral_avg
        })
    
    return smoothed_data

# Summarize overall sentiment
def summarize_results(sentences):
    counts = Counter([s["final_sentiment"] for s in sentences])
    total = sum(counts.values())
    summary = {
        key: {
            "count": val,
            "percentage": round((val / total) * 100, 1)
        } for key, val in counts.items()
    }
    overall = max(counts, key=counts.get)
    return summary, overall

# Main endpoint to analyze video
@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    existing = check_existing_analysis_by_video(req.url)
    if existing:
        return existing

    audio_file = download_youtube_audio(req.url)
    if not os.path.exists(audio_file):
        raise HTTPException(status_code=404, detail="Audio file missing.")

    # Transcribe with timestamps
    whisper_response = transcribe_audio(audio_file)
    
    # Extract sentences with timestamps
    sentences = extract_sentences_with_timestamps(whisper_response)
    
    # Extract the full transcription text
    text = " ".join([s["text"] for s in sentences])
    
    # Analyze each sentence
    analysis = analyze_sentences(sentences)
    
    # Create timeline data with smoothing
    timeline_data = apply_smoothing(analysis)
    
    # Summarize results
    summary, overall = summarize_results(analysis)
    
    # Save to database
    save_analysis(req.user_id, req.url, text, analysis, summary, overall, timeline_data)
    
    # Clean up
    os.remove(audio_file)

    return {
        "user_id": req.user_id,
        "video_url": req.url,
        "transcription": text,
        "sentences": analysis,
        "summary": summary,
        "overall_sentiment": overall,
        "timeline_data": timeline_data
    }

# Get all analyses done by a specific user
@app.get("/history/{user_id}")
async def get_user_history(user_id: str):
    results = []
    docs = db.collection("analyses").where("user_id", "==", user_id).stream()
    for doc in docs:
        results.append(doc.to_dict())
    return results