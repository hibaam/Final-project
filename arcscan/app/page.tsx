export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-black text-center px-4 py-12 gap-8">
      <h1 className="text-3xl sm:text-4xl font-bold text-blue-600">Welcome to ArcScan 🎬</h1>
      
      <p className="text-lg text-gray-700 dark:text-gray-300 max-w-xl">
        Analyze emotional tone in video content with AI. 
        Paste a YouTube link and get sentence-level sentiment analysis — fast, accurate, and visual.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition">
          🔍 Start New Analysis
        </button>
        <button className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          🕓 View Previous Results
        </button>
      </div>

      <footer className="mt-16 text-sm text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} ArcScan — Graduation Project
      </footer>
    </main>
  );
}
