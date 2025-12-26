import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow-sm border">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">TENDER <span className="text-indigo-600">SNIPER</span></h1>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          Le poste de pilotage pour vos appels d'offres.
          Si vous voyez cette page, le socle de l'application est stable.
        </p>
        <Link
          href="/admin/clients"
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          Accéder au Dashboard →
        </Link>
      </div>
    </div>
  );
}
