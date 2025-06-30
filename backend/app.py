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
from transformers import pipeline as transformers_pipeline

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

# Define core emotions to track (based on Plutchik's wheel of emotions)
CORE_EMOTIONS = [
     "admiration", "approval", "neutral", "optimism", 
    "confusion", "joy", "sadness", "anger",
    "fear", "surprise", "disgust", "trust"
]

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
def save_analysis(user_id, video_url, transcription, sentence_results, summary, overall, timeline_data, status="complete"):
    doc_id = generate_doc_id(video_url)
    db.collection("analyses").document(doc_id).set({
        "user_id": user_id,
        "video_url": video_url,
        "transcription": transcription,
        "sentences": sentence_results,
        "summary": summary,
        "overall_sentiment": overall,
        "timeline_data": timeline_data,
        "status": status,
        "created_at": firestore.SERVER_TIMESTAMP
    })

# Update progress in Firestore
def update_progress(video_url, user_id, status, progress, message=""):
    doc_id = generate_doc_id(video_url)
    db.collection("analysis_progress").document(doc_id).set({
        "user_id": user_id,
        "video_url": video_url,
        "status": status,
        "progress": progress,
        "message": message,
        "updated_at": firestore.SERVER_TIMESTAMP
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

# Transcribe audio to text using Whisper
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
    # Check if analysis already exists
    existing = check_existing_analysis_by_video(req.url)
    if existing:
        return existing

    # Create a progress entry
    doc_id = generate_doc_id(req.url)
    update_progress(req.url, req.user_id, "starting", 5, "Starting analysis...")

    try:
        # 1. Download audio
        update_progress(req.url, req.user_id, "downloading", 10, "Downloading audio from YouTube...")
        audio_file = download_youtube_audio(req.url)
        update_progress(req.url, req.user_id, "downloaded", 20, "Audio downloaded successfully!")
        
        # 2. Transcribe audio
        update_progress(req.url, req.user_id, "transcribing", 30, "Converting speech to text...")
        whisper_response = transcribe_audio(audio_file)
        text = whisper_response.get("text", "")
        
        # Extract sentences with timestamps
        sentences = extract_sentences_with_timestamps(whisper_response)
        
        # Save partial result with just transcription
        save_analysis(
            req.user_id, req.url, text, [], {}, "", [], "transcribed"
        )
        
        update_progress(req.url, req.user_id, "transcribed", 50, "Speech successfully converted to text!")
        
        # 3. Analyze sentences
        update_progress(req.url, req.user_id, "analyzing", 60, "Analyzing emotional content...")
        analysis = analyze_sentences(sentences)
        
        # 4. Create timeline
        update_progress(req.url, req.user_id, "creating_timeline", 80, "Building sentiment timeline...")
        timeline_data = apply_smoothing(analysis)
        
        # 5. Summarize results
        update_progress(req.url, req.user_id, "summarizing", 90, "Creating emotional summary...")
        summary, overall = summarize_results(analysis)
        
        # Save complete analysis
        save_analysis(
            req.user_id, req.url, text, analysis, summary, overall, timeline_data
        )
        
        update_progress(req.url, req.user_id, "complete", 100, "Analysis complete!")
        
        # Clean up
        os.remove(audio_file)

        return {
            "user_id": req.user_id,
            "video_url": req.url,
            "transcription": text,
            "sentences": analysis,
            "summary": summary,
            "overall_sentiment": overall,
            "timeline_data": timeline_data,
            "status": "complete"
        }
    except Exception as e:
        update_progress(req.url, req.user_id, "error", 0, f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
# Get analysis progress - FIXED to handle full URLs
@app.get("/progress/{video_url:path}")
async def get_progress(video_url: str):
    try:
        from urllib.parse import unquote
        decoded_url = unquote(video_url)
        print(f"Getting progress for URL: {decoded_url}")  # Add debug logging
        
        doc_id = generate_doc_id(decoded_url)
        print(f"Generated doc_id: {doc_id}")  # Add debug logging
        
        doc_ref = db.collection("analysis_progress").document(doc_id).get()
        
        if doc_ref.exists:
            progress_data = doc_ref.to_dict()
            print(f"Progress found: {progress_data}")  # Add debug logging
            return progress_data
        else:
            print("No progress found, returning not_started")  # Add debug logging
            return {"status": "not_started", "progress": 0}
    except Exception as e:
        print(f"Error getting progress: {e}")
        return {"status": "error", "progress": 0, "message": str(e)}
    
# Get all analyses done by a specific user
@app.get("/history/{user_id}")
async def get_user_history(user_id: str):
    results = []
    docs = db.collection("analyses").where("user_id", "==", user_id).stream()
    for doc in docs:
        results.append(doc.to_dict())
    return results

@app.get("/results/{video_url:path}")
async def get_results(video_url: str):
    existing = check_existing_analysis_by_video(video_url)
    if existing:
        return existing
    raise HTTPException(status_code=404, detail="Analysis not found")


# ------ ADVANCED EMOTIONS ANALYSIS - NEW CODE STARTS HERE -------

#Function to analyze complex emotions using GoEmotions model
def analyze_advanced_emotions(sentences):
    # Initialize the model only when needed (to save memory)
    emotion_classifier = transformers_pipeline(
        "text-classification",
        model="monologg/bert-base-cased-goemotions-original",
        return_all_scores=True
    )
    results = []
    for sentence in sentences:
        text = sentence["text"]
        if len(text.split()) < 3:
            continue
        try:
            emotion_scores = emotion_classifier(text)[0]
            emotions_dict = {item['label']: item['score'] for item in emotion_scores}
            top_emotions = sorted(emotions_dict.items(), key=lambda x: x[1], reverse=True)[:3]
            formatted_emotions = [
                {"emotion": emotion, "score": round(score * 100, 1)}
                for emotion, score in top_emotions if score > 0.1
            ]
            results.append({
                "text": text,
                "start_time": sentence["start_time"],
                "end_time": sentence["end_time"],
                "emotions": formatted_emotions
            })
        except Exception as e:
            print(f"Error analyzing advanced emotions: {e}")
            continue
    return results

# Create an emotion timeline for visualization
def create_emotion_timeline(results, window_size=5):
    # First, identify which emotions are actually present in the data
    detected_emotions = set()
    for result in results:
        for emotion_data in result["emotions"]:
            detected_emotions.add(emotion_data["emotion"])
    
    # Use detected emotions plus core emotions
    tracked_emotions = list(detected_emotions.union(set(CORE_EMOTIONS)))
    
    # Initialize timeline
    timeline = []
    
    # Get total duration of video
    if not results:
        return []
    total_duration = max(r["end_time"] for r in results)
    
    # Create initial data structure with time points
    for t in range(int(total_duration) + 1):
        data_point = {"time": t}
        for emotion in tracked_emotions:
            data_point[emotion] = 0
        timeline.append(data_point)
    
    # Fill in emotion values for each second
    for result in results:
        start = int(result["start_time"])
        end = int(result["end_time"])
        
        for emotion_data in result["emotions"]:
            emotion = emotion_data["emotion"]
            score = emotion_data["score"] / 100  # Convert percentage back to 0-1 scale
            
            # Apply score to each second in the time range
            for t in range(start, end + 1):
                if t < len(timeline):
                    timeline[t][emotion] += score
    
    # Apply smoothing
    smoothed_timeline = []
    for i in range(len(timeline)):
        window_start = max(0, i - window_size // 2)
        window_end = min(len(timeline), i + window_size // 2 + 1)
        window = timeline[window_start:window_end]
        
        smoothed_point = {"time": timeline[i]["time"]}
        for emotion in tracked_emotions:
            values = [point.get(emotion, 0) for point in window]
            if values:
                smoothed_point[emotion] = sum(values) / len(values)
            else:
                smoothed_point[emotion] = 0
                
        smoothed_timeline.append(smoothed_point)
    
    return smoothed_timeline

# Summarize emotions across the video
def summarize_emotions(results):
    if not results:
        return {}

    # Collect all emotions with their scores
    all_emotions = []
    for result in results:
        for emotion_data in result["emotions"]:
            all_emotions.append({
                "emotion": emotion_data["emotion"],
                "score": emotion_data["score"],
                "duration": result["end_time"] - result["start_time"]
            })

    # Group by emotion
    emotion_groups = {}
    for item in all_emotions:
        emotion = item["emotion"]
        if emotion not in emotion_groups:
            emotion_groups[emotion] = []
        emotion_groups[emotion].append(item)

    # Calculate weighted average scores (by duration)
    summary = {}
    for emotion, items in emotion_groups.items():
        total_score = sum(item["score"] * item["duration"] for item in items)
        total_duration = sum(item["duration"] for item in items)
        
        if total_duration > 0:
            weighted_score = total_score / total_duration
        else:
            weighted_score = 0
        
        # Only include if significant
        if weighted_score > 5:  # 5% threshold
            summary[emotion] = {
                "average_score": round(weighted_score, 1),
                "occurrences": len(items)
            }

    return summary

# Add a new endpoint for complex emotions
@app.post("/analyze/advanced-emotions")
async def analyze_advanced(req: AnalyzeRequest):
    # First check if basic analysis exists
    doc_id = generate_doc_id(req.url)
    doc_ref = db.collection("analyses").document(doc_id).get()
    if not doc_ref.exists:
        raise HTTPException(status_code=404, detail="Basic analysis not found. Run basic analysis first.")
    
    basic_analysis = doc_ref.to_dict()

    # Check if advanced analysis already exists
    advanced_ref = db.collection("advanced_analyses").document(doc_id).get()
    if advanced_ref.exists:
        return advanced_ref.to_dict()

    try:
        # Get sentences from basic analysis
        sentences = basic_analysis.get("sentences", [])
        
        # Extract just the text and timing info for processing
        sentence_data = [
            {"text": s["text"], "start_time": s["start_time"], "end_time": s["end_time"]} 
            for s in sentences
        ]
        
        update_progress(req.url, req.user_id, "analyzing_advanced", 10, "Analyzing complex emotions...")
        
        # Perform advanced emotion analysis
        advanced_results = analyze_advanced_emotions(sentence_data)
        
        # Extract emotion timeline for visualization
        emotion_timeline = create_emotion_timeline(advanced_results)
        
        # Summarize dominant emotions
        emotion_summary = summarize_emotions(advanced_results)
        
        # Save results
        db.collection("advanced_analyses").document(doc_id).set({
            "user_id": req.user_id,
            "video_url": req.url,
            "sentence_emotions": advanced_results,
            "emotion_timeline": emotion_timeline,
            "emotion_summary": emotion_summary,
            "created_at": firestore.SERVER_TIMESTAMP
        })
        
        update_progress(req.url, req.user_id, "complete_advanced", 100, "Advanced emotion analysis complete!")
        
        return {
            "user_id": req.user_id,
            "video_url": req.url,
            "sentence_emotions": advanced_results,
            "emotion_timeline": emotion_timeline,
            "emotion_summary": emotion_summary
        }
    except Exception as e:
        update_progress(req.url, req.user_id, "error_advanced", 0, f"Error in advanced analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Add this endpoint to check advanced analysis progress
@app.get("/progress/advanced/{video_url:path}")
async def get_advanced_progress(video_url: str):
    try:
        from urllib.parse import unquote
        decoded_url = unquote(video_url)
        doc_id = generate_doc_id(decoded_url)
        
        # First check if analysis exists
        advanced_ref = db.collection("advanced_analyses").document(doc_id).get()
        if advanced_ref.exists:
            return {"status": "complete", "progress": 100}
        
        # Check progress
        doc_ref = db.collection("analysis_progress").document(doc_id).get()
        
        if doc_ref.exists:
            progress_data = doc_ref.to_dict()
            # Only return if it's advanced progress
            if progress_data.get("status", "").startswith("analyzing_advanced") or progress_data.get("status", "").startswith("complete_advanced"):
                return progress_data
            
        return {"status": "not_started", "progress": 0}
    except Exception as e:
        return {"status": "error", "progress": 0, "message": str(e)}


# Add this endpoint to get advanced results
@app.get("/results/advanced/{video_url:path}")
async def get_advanced_results(video_url: str):
    doc_id = generate_doc_id(video_url)
    doc_ref = db.collection("advanced_analyses").document(doc_id).get()
    if doc_ref.exists:
        return doc_ref.to_dict()
    
    raise HTTPException(status_code=404, detail="Advanced analysis not found")

