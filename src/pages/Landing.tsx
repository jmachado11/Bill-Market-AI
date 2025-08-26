import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <h1 className="text-5xl font-bold mb-6">Bill Market AI</h1>
      <p className="text-lg text-gray-300 max-w-xl text-center mb-8">
        Analyze bills, estimate passage odds, and map them to companies that could be impacted.
      </p>
      <Link
        to="/app"
        className="px-6 py-3 rounded-lg bg-white text-black font-semibold hover:bg-white/80"
      >
        Launch the App
      </Link>
    </div>
  );
}
