"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  ExternalLink,
  FastForward,
  Gavel,
  Hourglass,
  MapPin,
  Sparkles,
  Users,
  Vote,
} from "lucide-react";
import { CandidateSlot } from "@/types";
import { evaluateVotingResult } from "@/lib/voting";

export default function EventVotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;
  const router = useRouter();

  const {
    currentUser,
    events,
    users,
    locations,
    candidateSlots,
    finalVotes,
    calculateAggregation,
    castVote,
    updateEventStatus,
    updateVotingDeadline,
  } = useApp();

  const event = events.find((e) => e.id === eventId);
  const isOrganizer = currentUser?.id === event?.organizerId;

  // 集計データ
  const [candidates, setCandidates] = useState<CandidateSlot[]>([]);

  useEffect(() => {
    if (!event) return;
    const existing = candidateSlots[event.id];
    if (existing && existing.length > 0) {
      setCandidates(existing);
    } else {
      const result = calculateAggregation(event.id);
      setCandidates(result.candidates);
    }
  }, [event, candidateSlots]);

  if (!event || !currentUser) {
    return <div className="p-8 text-center text-xs text-slate-500">日程調整が見つかりません。</div>;
  }

  // 投票期限の判定
  const now = new Date();
  const votingDeadlineDate = event.votingDeadline ? new Date(event.votingDeadline) : null;
  const isDeadlinePassed = votingDeadlineDate ? now >= votingDeadlineDate : false;

  // このイベントに対する全投票
  const eventVotes = finalVotes.filter((v) => v.eventId === event.id);
  const totalVotesCount = eventVotes.length;

  // ログインユーザーの投票
  const myVote = eventVotes.find((v) => v.userId === currentUser.id);

  // 投票結果の評価（得票集計、タイブレーク、完全同票判定）
  const {
    candidatesWithVotes,
    maxVoteCount,
    topVotedCandidates,
    isTieVote,
    scorePriorityWinner,
    finalTieCandidates,
    isCompleteTie,
  } = evaluateVotingResult(candidates, eventVotes);

  // 投票ハンドラ（期限中のみ投票可能）
  const handleVote = (candidateId: string) => {
    if (isDeadlinePassed) {
      alert("投票期限が終了しているため、投票の追加・変更はできません。");
      return;
    }
    castVote(event.id, candidateId);
  };

  // 幹事による確定ハンドラ（期限終了後かつ同票の場合のみ！）
  const handleConfirmCandidate = (candidateId: string) => {
    if (!isDeadlinePassed) {
      alert("投票期限が終了するまで、幹事による確定はできません。");
      return;
    }
    if (confirm("この候補で練習日時・場所を確定しますか？")) {
      updateEventStatus(event.id, "confirmed", candidateId);
      alert("練習日程が確定しました！メンバーに確定内容が共有されます。");
      router.push(`/events/${event.id}`);
    }
  };

  // 幹事用：テスト用即時締め切り
  const handleExpireDeadlineImmediately = () => {
    if (confirm("【テスト用】投票期限を今すぐ過去（終了）に設定しますか？\n（期限終了後の自動確定または同票時幹事決定の挙動を即座にテストできます）")) {
      // 1分前の日時に更新
      const past = new Date(Date.now() - 60 * 1000).toISOString();
      updateVotingDeadline(event.id, past);
    }
  };

  const maxAttendees = candidates.length > 0 ? candidates[0].attendeeCount : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link
        href={`/events/${event.id}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="w-4 h-4" />
        {event.title} に戻る
      </Link>

      {/* タイトルヘッダー */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
              <Sparkles className="w-3.5 h-3.5" />
              集計結果 & 最終投票
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
              {event.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              参加条件を満たし、<strong className="text-indigo-600 dark:text-indigo-400 font-bold">最大人数（{maxAttendees}名）</strong>が集まれる候補のみを提示しています。
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 self-start">
            {event.status === "confirmed" ? (
              <span className="px-4 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-xs inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                日程確定済み
              </span>
            ) : isDeadlinePassed ? (
              <span className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                投票期限終了 ({totalVotesCount}票 投票済)
              </span>
            ) : (
              <span className="px-4 py-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 font-bold text-xs inline-flex items-center gap-1.5 animate-pulse">
                <Vote className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                最終投票受付中 ({totalVotesCount}票 投票済)
              </span>
            )}
          </div>
        </div>

        {/* 投票期限ステータスバナー */}
        {event.status !== "confirmed" && (
          <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
            isDeadlinePassed
              ? "bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              : "bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Hourglass className={`w-4 h-4 ${isDeadlinePassed ? "text-slate-500" : "text-indigo-600"}`} />
                <span className="font-bold">
                  投票期限:{" "}
                  {votingDeadlineDate
                    ? votingDeadlineDate.toLocaleString("ja-JP", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "未設定"}
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  isDeadlinePassed
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    : "bg-indigo-100 dark:bg-indigo-900/70 text-indigo-800 dark:text-indigo-200"
                }`}>
                  {isDeadlinePassed ? "期限終了 (確定処理フェーズ)" : "投票受付中 (期限内は確定不可)"}
                </span>
              </div>

              {/* 幹事専用：テスト用即時締め切りボタン */}
              {isOrganizer && !isDeadlinePassed && (
                <button
                  type="button"
                  onClick={handleExpireDeadlineImmediately}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-indigo-300 dark:border-indigo-700 rounded-lg text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 inline-flex items-center gap-1 transition-colors shrink-0"
                  title="テスト用に期限切れをシミュレート"
                >
                  <FastForward className="w-3 h-3 text-indigo-500" />
                  テスト用: 期限を今すぐ終了にする
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              {!isDeadlinePassed
                ? "※投票期限中は日程の確定は行えません。期限を迎えると、最多投票数の候補に自動で確定します。"
                : isCompleteTie
                ? "※投票期限が終了しましたが、最多得票が同票のため、幹事による最終決定が必要です。"
                : "※投票期限が終了しました。最多得票の候補に確定されます。"}
            </p>
          </div>
        )}

        {/* 投票ルール注意書き */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <div className="font-bold text-slate-800 dark:text-slate-200">📌 最終投票ルール:</div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            <li>各候補枠に<strong className="text-slate-700 dark:text-slate-300 font-semibold">「参加可能」なメンバーのみ</strong>に投票権があります。</li>
            <li><strong className="text-slate-700 dark:text-slate-300 font-semibold">投票期限内は確定できません</strong>。メンバー全員の意見を待つためです。</li>
            <li>期限を迎えると、<strong className="text-slate-700 dark:text-slate-300 font-semibold">最多投票数の候補に自動で確定</strong>します。</li>
            <li><strong className="text-amber-700 dark:text-amber-400 font-bold">期限後に同票の場合のみ</strong>、同票の候補から幹事が日程を確定できます。</li>
            <li>投票済みの候補を再度クリックすると<strong className="text-slate-700 dark:text-slate-300 font-semibold">投票を取り消せます</strong>。</li>
          </ul>
        </div>

        {/* 期限後・同票発生時の幹事向け確定アラート */}
        {event.status !== "confirmed" && isDeadlinePassed && isCompleteTie && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2 animate-fadeIn">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-950 dark:text-amber-100">
              <Gavel className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" />
              【期限終了・同票発生】幹事による最終決定を行ってください
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              投票期限が終了しましたが、最多得票数（{maxVoteCount}票）の候補が {finalTieCandidates.length} 件あります（同票）。
              {isOrganizer ? (
                <strong className="text-amber-950 dark:text-amber-100 font-bold block mt-1">
                  幹事のあなたに対象候補への「幹事決定で確定する」ボタンが表示されています。どちらか1つを選択して確定してください。
                </strong>
              ) : (
                <span className="block mt-1">
                  現在、幹事（{users.find(u => u.id === event.organizerId)?.nickname}）が最終決定を行うのをお待ちください。
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* 候補カード一覧 */}
      {candidates.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
          参加条件を満たす候補枠がありませんでした。回答内容を再度ご確認ください。
        </div>
      ) : (
        <div className="space-y-4">
          {candidatesWithVotes.map((cand, idx) => {
            const loc = locations.find((l) => l.id === cand.locationId);
            const isCanVote = cand.attendeeUserIds.includes(currentUser.id);
            const isVotedThis = myVote?.candidateId === cand.id;
            const isConfirmed = event.confirmedCandidateId === cand.id;

            // 期限終了後の同票対象候補
            const isThisCandidateTied = isDeadlinePassed && isCompleteTie && finalTieCandidates.some((c) => c.id === cand.id);

            // 単独トップ
            const isThisCandidateTop = !isTieVote && topVotedCandidates.some((c) => c.id === cand.id);

            return (
              <div
                key={cand.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-6 shadow-xs transition-all ${
                  isConfirmed
                    ? "border-emerald-500 ring-2 ring-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/30"
                    : isThisCandidateTied
                    ? "border-amber-400 ring-2 ring-amber-200 dark:ring-amber-900/50 bg-amber-50/10 dark:bg-amber-950/20"
                    : isVotedThis
                    ? "border-indigo-400 ring-2 ring-indigo-200 dark:ring-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2.5 py-0.5 rounded-full">
                        候補 {idx + 1}
                      </span>
                      {isConfirmed && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5 text-emerald-600" />
                          確定した練習枠
                        </span>
                      )}
                      {isThisCandidateTop && event.status !== "confirmed" && (
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5 text-indigo-600" />
                          現在1位 ({cand.currentVoteCount}票)
                        </span>
                      )}
                      {isThisCandidateTied && event.status !== "confirmed" && (
                        <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Gavel className="w-3.5 h-3.5 text-amber-700" />
                          同票タイブレーク対象 ({cand.currentVoteCount}票)
                        </span>
                      )}
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                        練習可能時間: {Math.floor(cand.bandPracticeMinutes / 60)}時間{cand.bandPracticeMinutes % 60 > 0 ? `${cand.bandPracticeMinutes % 60}分` : ""}
                      </span>
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 bg-indigo-100 dark:bg-indigo-900/70 px-2.5 py-0.5 rounded-full">
                        得票数: {cand.currentVoteCount} 票
                      </span>
                    </div>

                    {/* 日時 */}
                    <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                      <Calendar className="w-5 h-5 text-indigo-600" />
                      <span>{cand.date}</span>
                      <Clock className="w-4 h-4 text-slate-400 ml-2" />
                      <span>
                        {cand.startTime} 〜 {cand.endTime}
                      </span>
                    </div>

                    {/* 場所 */}
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                      <Link
                        href={`/locations?select=${cand.locationId}`}
                        className="font-bold underline hover:text-indigo-600 inline-flex items-center gap-1"
                        title="クリックしてGoogle Mapで場所を確認"
                      >
                        {loc?.name}
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                      {loc?.address && (
                        <span className="text-slate-400 text-xs">({loc.address})</span>
                      )}
                    </div>

                    {/* 参加可能メンバー一覧（フル参加・途中参加の内訳つき） */}
                    <div className="pt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 flex-wrap gap-1">
                        <span>
                          参加可能メンバー: 計 {cand.attendeeCount}名
                        </span>
                        <span className="text-slate-500 font-normal">
                          (フル参加: {cand.fullAttendeeUserIds?.length ?? cand.attendeeCount}名
                          {cand.partialAttendeeUserIds && cand.partialAttendeeUserIds.length > 0 && (
                            <span className="text-amber-700 font-semibold ml-1">
                              / 途中参加: {cand.partialAttendeeUserIds.length}名
                            </span>
                          )})
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {cand.attendeeUserIds.map((userId) => {
                          const u = users.find((usr) => usr.id === userId);
                          const detail = cand.attendeeDetails?.[userId];
                          const isFull = !detail || detail.type === "full";
                          const isLate = detail?.type === "late";
                          const isEarly = detail?.type === "early";
                          const isPartial = detail?.type === "partial";

                          return (
                            <span
                              key={userId}
                              className={`text-xs px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1.5 border ${
                                isFull
                                  ? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                                  : isLate
                                  ? "bg-amber-50 border-amber-200 text-amber-900"
                                  : isEarly
                                  ? "bg-sky-50 border-sky-200 text-sky-900"
                                  : "bg-purple-50 border-purple-200 text-purple-900"
                              }`}
                            >
                              <span>{u?.nickname || userId}</span>
                              {userId === currentUser.id && (
                                <span className="text-indigo-600 text-[10px] font-bold">
                                  (あなた)
                                </span>
                              )}
                              {!isFull && detail && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                    isLate
                                      ? "bg-amber-100 text-amber-800"
                                      : isEarly
                                      ? "bg-sky-100 text-sky-800"
                                      : "bg-purple-100 text-purple-800"
                                  }`}
                                  title={`${detail.overlapStart}〜${detail.overlapEnd} 参加可能 (${detail.overlapMinutes}分)`}
                                >
                                  {isLate && `${detail.overlapStart}〜遅刻`}
                                  {isEarly && `〜${detail.overlapEnd}早退`}
                                  {isPartial && `${detail.overlapStart}〜${detail.overlapEnd}`}
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 右側：投票 & 確定アクション */}
                  <div className="flex flex-col sm:items-end gap-2.5 shrink-0 self-end sm:self-center">
                    {/* メンバー投票ボタン（投票期限内のみ押せる！） */}
                    {event.status !== "confirmed" && (
                      <div>
                        {isDeadlinePassed ? (
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 inline-block">
                            投票受付終了
                          </span>
                        ) : isCanVote ? (
                          <button
                            type="button"
                            onClick={() => handleVote(cand.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs ${
                              isVotedThis
                                ? "bg-indigo-600 text-white shadow-indigo-200"
                                : "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                            }`}
                          >
                            <Vote className="w-4 h-4" />
                            {isVotedThis ? "投票中 (クリックで取消)" : "この候補に投票する"}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            ※あなたはこの枠に参加不可のため投票権がありません
                          </span>
                        )}
                      </div>
                    )}

                    {/* 期限後に同票が生じたときだけ表示される幹事最終決定ボタン！ */}
                    {isOrganizer && event.status !== "confirmed" && isDeadlinePassed && isThisCandidateTied && (
                      <button
                        type="button"
                        onClick={() => handleConfirmCandidate(cand.id)}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-colors inline-flex items-center gap-1.5 animate-pulse"
                      >
                        <Gavel className="w-3.5 h-3.5" />
                        同票のため幹事決定で確定する
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
