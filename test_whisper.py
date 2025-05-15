import yt_dlp
import openai
import os
import uuid
import json
from dotenv import load_dotenv
from textblob import TextBlob
from collections import Counter
import firebase_admin
from firebase_admin import credentials, firestore

# Load environment variables (API key)
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# Initialize Firebase
cred = credentials.Certificate("firebase_credentials.json")
firebase_admin.initialize_app(cred)
db = firestore.client()


def download_youtube_audio(youtube_url, output_dir="downloads"):
    os.makedirs(output_dir, exist_ok=True)
    unique_id = str(uuid.uuid4())
    output_path = os.path.join(output_dir, f"audio_{unique_id}")

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": output_path,
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


def analyze_sentences(text):
    blob = TextBlob(text)
    results = []

    for i, sentence in enumerate(blob.sentences, 1):
        polarity = sentence.sentiment.polarity
        if polarity > 0:
            sentiment = "Positive"
        elif polarity < 0:
            sentiment = "Negative"
        else:
            sentiment = "Neutral"

        results.append((i, str(sentence), sentiment))
    return results


def save_analysis_to_firestore(user_id, video_url, transcription, sentence_results, summary, overall):
    doc_ref = db.collection("analyses").document()
    doc_ref.set({
        "user_id": user_id,
        "video_url": video_url,
        "transcription": transcription,
        "sentences": sentence_results,
        "summary": summary,
        "overall_sentiment": overall,
        "created_at": firestore.SERVER_TIMESTAMP
    })
    print(f"\n✅ Results saved to Firestore with ID: {doc_ref.id}")


# Entry point
if __name__ == "__main__":
    youtube_url = input("Enter YouTube URL: ").strip()
    audio_file = download_youtube_audio(youtube_url)

    if audio_file and os.path.exists(audio_file):
        transcription = transcribe_audio_with_openai(audio_file)
        if transcription:
            print("\n====== Transcription Result ======")
            print(transcription)

            sentence_results = analyze_sentences(transcription)

            print("\n====== Sentence-level Sentiment Analysis ======")
            for num, sentence, sentiment in sentence_results:
                print(f"[{num}] {sentiment}: {sentence}")

            sentiment_counts = Counter(
                [sentiment for _, _, sentiment in sentence_results])
            total = sum(sentiment_counts.values())

            summary = {
                sentiment: {
                    "count": count,
                    "percentage": round((count / total) * 100, 1)
                }
                for sentiment, count in sentiment_counts.items()
            }

            overall_sentiment = max(sentiment_counts, key=sentiment_counts.get)

            print("\n====== Sentiment Summary ======")
            for sentiment, data in summary.items():
                print(
                    f"{sentiment}: {data['count']} sentence(s), {data['percentage']}%"
                )

            print(f"\n🎯 Overall video sentiment: {overall_sentiment}")

            # Prepare data for Firestore
            firestore_ready_sentences = [
                {"index": num, "text": sentence, "sentiment": sentiment}
                for num, sentence, sentiment in sentence_results
            ]

            # Save to Firestore (temporary test user)
            save_analysis_to_firestore(
                user_id="test_user",
                video_url=youtube_url,
                transcription=transcription,
                sentence_results=firestore_ready_sentences,
                summary=summary,
                overall=overall_sentiment
            )

        else:
            print("✗ Transcription failed.")

        os.remove(audio_file)
    else:
        print("✗ Audio file could not be processed.")
