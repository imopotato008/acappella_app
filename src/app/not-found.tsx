import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <h2 className="text-2xl font-bold text-slate-800">ページが見つかりません</h2>
      <p className="text-sm text-slate-500">お探しのページは移動または削除された可能性があります。</p>
      <Link
        href="/"
        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
      >
        ダッシュボードに戻る
      </Link>
    </div>
  );
}

