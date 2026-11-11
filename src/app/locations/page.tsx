"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Globe,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  UserCheck,
} from "lucide-react";
import {
  canManageLocation,
  getTargetMapUrl,
  extractUrlFromInput,
  getEmbedMapUrl,
  isEmbedMapHtml,
  formatWebUrl,
} from "@/lib/location";
import { Location } from "@/types";

function LocationsContent() {
  const searchParams = useSearchParams();
  const selectIdFromUrl = searchParams.get("select");

  const {
    locations,
    users,
    currentUser,
    addLocation,
    updateLocation,
    deleteLocation,
  } = useApp();

  const [selectedLocId, setSelectedLocId] = useState<string>(
    selectIdFromUrl || (locations.length > 0 ? locations[0].id : "")
  );

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [memo, setMemo] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [reservationUrl, setReservationUrl] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // 練習場所の編集状態
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editMapUrl, setEditMapUrl] = useState("");
  const [editReservationUrl, setEditReservationUrl] = useState("");

  // 練習場所の削除ハンドラ（自分が投稿した場所または管理者のみ）
  const handleDeleteLocation = (locId: string, locName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm(`練習場所「${locName}」を削除しますか？\n（この操作は取り消せません）`)) {
      const res = deleteLocation(locId);
      if (res.success) {
        setSuccessMsg(`「${locName}」を削除しました。`);
        if (editingLocId === locId) {
          setEditingLocId(null);
        }
        if (selectedLocId === locId) {
          const remaining = locations.filter((l) => l.id !== locId);
          if (remaining.length > 0) {
            setSelectedLocId(remaining[0].id);
          }
        }
      } else {
        alert(res.message || "削除に失敗しました。");
      }
    }
  };

  // 練習場所の編集開始
  const handleStartEdit = (loc: Location, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedLocId(loc.id);
    setEditingLocId(loc.id);
    setEditName(loc.name);
    setEditAddress(loc.address || "");
    setEditMemo(loc.memo || "");
    setEditMapUrl(loc.mapUrl || "");
    setEditReservationUrl(loc.reservationUrl || "");
  };

  // 編集キャンセル
  const handleCancelEdit = () => {
    setEditingLocId(null);
  };

  // 編集保存
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocId) return;

    const res = updateLocation(editingLocId, {
      name: editName,
      address: editAddress,
      memo: editMemo,
      mapUrl: extractUrlFromInput(editMapUrl),
      reservationUrl: formatWebUrl(editReservationUrl),
    });

    if (res.success) {
      setSuccessMsg(`「${editName}」の情報を更新しました！`);
      setEditingLocId(null);
      setTimeout(() => setSuccessMsg(""), 4000);
    } else {
      alert(res.message || "更新に失敗しました。");
    }
  };

  // URLパラメータで ?select= が指定されていたらその場所を選択 & スクロール
  useEffect(() => {
    if (selectIdFromUrl) {
      setSelectedLocId(selectIdFromUrl);
    }
  }, [selectIdFromUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const cleanedUrl = extractUrlFromInput(mapUrl);
    const cleanedResUrl = formatWebUrl(reservationUrl);
    const newLoc = addLocation(name, address, memo, cleanedUrl, cleanedResUrl);
    setSelectedLocId(newLoc.id);
    setSuccessMsg(`「${name}」を新しい練習場所として登録・提案しました！`);
    setName("");
    setAddress("");
    setMemo("");
    setMapUrl("");
    setReservationUrl("");
    setIsAdding(false);

    setTimeout(() => {
      setSuccessMsg("");
    }, 4000);
  };

  const selectedLoc = locations.find((l) => l.id === selectedLocId) || locations[0];

  // 登録された mapUrl または住所から、開く用URLと埋め込みURLを取得
  const targetMapUrl = selectedLoc ? getTargetMapUrl(selectedLoc) : "";
  const embedMapUrl = selectedLoc ? getEmbedMapUrl(selectedLoc.mapUrl) : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-rose-500" />
            練習場所管理
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            バンド活動で利用可能な音楽スタジオや施設を一覧・地図で確認できます。
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors self-start"
        >
          <Plus className="w-4 h-4" />
          {isAdding ? "フォームを閉じる" : "新しい練習場所を提案する"}
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* 新規施設提案フォーム */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 shadow-sm p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            練習場所の新規登録・提案
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                施設・スタジオ名 <span className="text-rose-500">*必須</span>
              </label>
              <input
                type="text"
                required
                placeholder="例: サウンドスタジオ NOAH 渋谷店"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                住所・最寄駅 (任意)
              </label>
              <input
                type="text"
                placeholder="例: 東京都渋谷区宇田川町36-6 / 渋谷駅徒歩5分"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Google Map のリンク または 埋め込みHTML (任意)
              </label>
              <input
                type="text"
                placeholder="例: https://maps.app.goo.gl/... または Google Mapの「地図を埋め込む」コード"
                value={mapUrl}
                onChange={(e) => setMapUrl(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                ※共有リンク（<code>maps.app.goo.gl</code>等）を貼ると<strong>「Mapで開く」ボタン</strong>が表示されます。<br />
                ※Googleマップの「共有 &gt; 地図を埋め込む」でコピーしたHTMLコード（<code>&lt;iframe...&gt;</code>）を貼ると、<strong>ページ内に地図が自動表示</strong>されます。
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                予約サイトURL (任意)
              </label>
              <input
                type="text"
                placeholder="例: https://www.studionoah.jp/shibuya/ （施設のWeb予約ページ）"
                value={reservationUrl}
                onChange={(e) => setReservationUrl(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                ※登録しておくと、日程確定時や予約時にワンクリックでスタジオ予約ページへ進めるようになります。
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                設備・メモ (任意)
              </label>
              <textarea
                rows={2}
                placeholder="例: ボーカル用マイク6本あり。キーボードレンタル可。土日料金1時間3,000円など"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              登録して全員に共有する
            </button>
          </div>
        </form>
      )}

      {/* 2カラム構成：左側リスト、右側 Google Map 埋め込み */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 左側：場所一覧カード (5カラム) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>登録施設一覧 ({locations.length}件)</span>
            <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">クリックで地図を切り替え</span>
          </div>

          <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
            {locations.map((loc) => {
              const creator = users.find((u) => u.id === loc.createdBy);
              const isSelected = selectedLoc?.id === loc.id;

              return (
                <div
                  key={loc.id}
                  onClick={() => setSelectedLocId(loc.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${isSelected
                      ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-md"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/70 dark:hover:bg-slate-800"
                    }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-bold text-sm ${isSelected ? "text-indigo-950 dark:text-indigo-200" : "text-slate-900 dark:text-slate-100"}`}>
                        {loc.name}
                      </span>
                    </div>

                    {loc.address && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="line-clamp-1">{loc.address}</span>
                      </p>
                    )}

                    {loc.memo && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 bg-white/70 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                        {loc.memo}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500">
                    <span>
                      {creator ? `登録者: ${creator.nickname}` : "登録施設"}
                    </span>
                    <div className="flex items-center gap-2">
                      {loc.reservationUrl && (
                        <a
                          href={formatWebUrl(loc.reservationUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-semibold inline-flex items-center gap-1"
                          title="予約サイトを開く"
                        >
                          <Globe className="w-3 h-3" />
                          予約サイト
                        </a>
                      )}
                      <a
                        href={getTargetMapUrl(loc)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold inline-flex items-center gap-1"
                        title="Google Mapを開く"
                      >
                        Mapで開く <ExternalLink className="w-3 h-3" />
                      </a>
                      {canManageLocation(loc, currentUser) && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleStartEdit(loc, e)}
                            className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                            title="この練習場所を編集"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteLocation(loc.id, loc.name, e)}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            title="この練習場所を削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右側：Google Map 埋め込み & 詳細 (7カラム) */}
        <div className="lg:col-span-7 sticky top-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-4 p-5">
          {selectedLoc ? (
            editingLocId === selectedLoc.id ? (
              /* 練習場所の編集フォーム */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <Pencil className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">練習場所の情報を編集</h2>
                      <p className="text-xs text-slate-400 dark:text-slate-500">登録済みのスタジオ名や住所を修正できます</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    キャンセル
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      施設・スタジオ名 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      placeholder="例: サウンドスタジオ NOAH 渋谷店"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      住所や最寄駅 (任意)
                    </label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      placeholder="例: 東京都渋谷区宇田川町39-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Google Maps リンク または 埋め込みHTML (任意)
                    </label>
                    <input
                      type="text"
                      value={editMapUrl}
                      onChange={(e) => setEditMapUrl(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      placeholder="例: https://maps.app.goo.gl/... または Google Mapの「地図を埋め込む」コード"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                      ※共有リンク（<code>maps.app.goo.gl</code>等）を貼ると<strong>「Mapで開く」ボタン</strong>が表示されます。<br />
                      ※Googleマップの「共有 &gt; 地図を埋め込む」でコピーしたHTMLコード（<code>&lt;iframe...&gt;</code>）を貼ると、<strong>ページ内に地図が自動表示</strong>されます。
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      予約サイトURL (任意)
                    </label>
                    <input
                      type="text"
                      value={editReservationUrl}
                      onChange={(e) => setEditReservationUrl(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      placeholder="例: https://www.studionoah.jp/shibuya/ （施設のWeb予約ページ）"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      利用メモ・設備情報 (任意)
                    </label>
                    <textarea
                      rows={3}
                      value={editMemo}
                      onChange={(e) => setEditMemo(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      placeholder="例: ピアノあり、マイク6本無料レンタル可能"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      変更を保存する
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* 通常の詳細 & 地図表示モード */
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <div className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      <Navigation className="w-3.5 h-3.5" />
                      現在選択中の練習場所
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {selectedLoc.name}
                    </h2>
                    {selectedLoc.address && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{selectedLoc.address}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start flex-wrap">
                    {canManageLocation(selectedLoc, currentUser) && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(selectedLoc)}
                          className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold inline-flex items-center gap-1 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLocation(selectedLoc.id, selectedLoc.name)}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-bold inline-flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          削除
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {embedMapUrl ? (
                  /* HTMLコードが登録されている場合：埋め込みMapを自動表示 ＋ Mapで開くボタン ＋ 予約サイトボタン */
                  <div className="space-y-3">
                    <div className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shadow-inner">
                      <iframe
                        title={`Map of ${selectedLoc.name}`}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        src={embedMapUrl}
                      />
                    </div>
                    <a
                      href={targetMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-xs sm:text-sm rounded-xl transition-colors inline-flex items-center justify-center gap-2 group"
                    >
                      <Navigation className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                      <span>Google Mapで開く（別タブ/アプリ）</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                    </a>
                    {selectedLoc.reservationUrl && (
                      <a
                        href={formatWebUrl(selectedLoc.reservationUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs sm:text-sm rounded-xl transition-colors inline-flex items-center justify-center gap-2 group"
                      >
                        <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span>予約サイトを開く</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                      </a>
                    )}
                  </div>
                ) : (
                  /* 基本：Mapで開くボタン ＋ 予約サイトボタン */
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 space-y-3">
                    {selectedLoc.mapUrl && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono break-all line-clamp-1 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="font-sans font-bold text-slate-600 dark:text-slate-300 mr-1.5">登録リンク:</span>
                        {selectedLoc.mapUrl}
                      </div>
                    )}
                    <a
                      href={targetMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm sm:text-base rounded-2xl shadow-md hover:shadow-lg transition-all inline-flex items-center justify-center gap-2.5 group"
                    >
                      <Navigation className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span>Google Mapで開く（別タブ/アプリ）</span>
                      <ExternalLink className="w-4 h-4 opacity-80" />
                    </a>
                    {selectedLoc.reservationUrl && (
                      <a
                        href={formatWebUrl(selectedLoc.reservationUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base rounded-2xl shadow-md hover:shadow-lg transition-all inline-flex items-center justify-center gap-2.5 group"
                      >
                        <Globe className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span>予約サイトを開く</span>
                        <ExternalLink className="w-4 h-4 opacity-80" />
                      </a>
                    )}
                  </div>
                )}

                {selectedLoc.memo && (
                  <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/80 text-xs text-amber-900 dark:text-amber-200">
                    <strong className="font-bold block mb-0.5">💡 利用メモ・設備情報:</strong>
                    {selectedLoc.memo}
                  </div>
                )}
              </>
            )
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-400 text-xs">
              場所を選択してください
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LocationsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">読み込み中...</div>}>
      <LocationsContent />
    </Suspense>
  );
}
