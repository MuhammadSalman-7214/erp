import { Link, useLocation } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

export default function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md w-full text-center bg-white shadow-xl rounded-2xl p-8">
        <div className="flex justify-center mb-4 text-red-500">
          <AlertTriangle size={48} />
        </div>

        <h1 className="text-4xl font-bold text-teal-800">404</h1>
        <p className="text-teal-800 mt-2 text-lg">Page not found</p>

        <p className="text-sm text-teal-800 mt-4">
          We couldn’t find that page. Please check the address or use the
          options below to continue.
        </p>

        <div className="mt-6 flex justify-center gap-4">
          <Link
            to="/"
            className="px-5 py-2 rounded-xl bg-teal-800 text-white hover:bg-teal-700 transition"
          >
            Go Home
          </Link>

          <button
            onClick={() => window.history.back()}
            className="px-5 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 transition text-teal-800"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
