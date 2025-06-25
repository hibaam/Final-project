
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

class AnalyzeRequest(BaseModel):
    url: str
    user_id: str

def generate_doc_id(user_id, video_url):
    safe_id = re.sub(r'\W+', '_', video_url)
    return f"{user_id}_{safe_id}"

def check_existing_analysis(user_id, video_url):
    doc_id = generate_doc_id(user_id, video_url)
    doc = db.collection("analyses").document(doc_id).get()
    if doc.exists:
        return doc.to_dict()
    return None

def save_analysis(user_id, video_url, transcription, sentence_results, summary, overall):
    doc_id = generate_doc_id(user_id, video_url)
    db.collection("analyses").document(doc_id).set({
        "user_id": user_id,
        "video_url": video_url,
        "transcription": transcription,
        "sentences": sentence_results,
        "summary": summary,
        "overall_sentiment": overall,
        "created_at": firestore.SERVER_TIMESTAMP
    })

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

def transcribe_audio(path):
    try:
        with open(path, "rb") as f:
            result = openai.Audio.transcribe(model="whisper-1", file=f)
        return result["text"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription error: {e}")

from textblob import TextBlob
from collections import Counter

def split_sentences(text):
    blob = TextBlob(text)
    return [str(s).strip() for s in blob.sentences]

def analyze_sentences(sentences):
    results = []
    for i, sentence in enumerate(sentences, 1):
        try:
            analysis = emo_roberta(sentence)[0]
            sentiment = label_map.get(analysis["label"], "Neutral")
        except:
            sentiment = "Neutral"
        results.append({
            "index": i,
            "text": sentence,
            "final_sentiment": sentiment
        })
    return results

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

@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    existing = check_existing_analysis(req.user_id, req.url)
    if existing:
        return existing

    audio_file = download_youtube_audio(req.url)
    if not os.path.exists(audio_file):
        raise HTTPException(status_code=404, detail="Audio file missing.")

    text = transcribe_audio(audio_file)
    sentences = split_sentences(text)
    analysis = analyze_sentences(sentences)
    summary, overall = summarize_results(analysis)
    save_analysis(req.user_id, req.url, text, analysis, summary, overall)
    os.remove(audio_file)

    return {
        "user_id": req.user_id,
        "video_url": req.url,
        "transcription": text,
        "sentences": analysis,
        "summary": summary,
        "overall_sentiment": overall
    }
