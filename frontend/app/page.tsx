import Link from "next/link";

export default function Home() {
  return (
    <div className="p-12">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <Link href="/assessments/new">
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Start New CARS Assessment
        </button>
      </Link>
    </div>
  );
}
