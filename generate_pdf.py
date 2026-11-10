import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# 日本語フォントの登録 (Windows標準のメイリオまたはMSゴシック)
font_path = "C:\\Windows\\Fonts\\meiryo.ttc"
if not os.path.exists(font_path):
    font_path = "C:\\Windows\\Fonts\\msgothic.ttc"

pdfmetrics.registerFont(TTFont("JapaneseFont", font_path))
pdfmetrics.registerFont(TTFont("JapaneseFont-Bold", "C:\\Windows\\Fonts\\meiryob.ttc" if os.path.exists("C:\\Windows\\Fonts\\meiryob.ttc") else font_path))

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("JapaneseFont", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        # ヘッダー
        if self._pageNumber > 1:
            self.drawString(54, 842 - 36, "実践Next.js & TypeScript入門：アカペラバンド運営アプリで学ぶWeb開発完全ガイド")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(54, 842 - 42, 595 - 54, 842 - 42)
        
        # フッター
        page_text = f"- {self._pageNumber} / {page_count} -"
        self.drawCentredString(595 / 2.0, 36, page_text)
        self.restoreState()

def create_guide_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=50,
        rightMargin=50,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # スタイル定義
    title_style = ParagraphStyle(
        'DocTitle',
        fontName='JapaneseFont-Bold',
        fontSize=20,
        leading=26,
        textColor=colors.HexColor('#1e1b4b'),
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        fontName='JapaneseFont-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#4f46e5'),
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'H1',
        fontName='JapaneseFont-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'H2',
        fontName='JapaneseFont-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#312e81'),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        fontName='JapaneseFont',
        fontSize=9,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        fontName='JapaneseFont',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        leftIndent=15,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        'CodeBlock',
        fontName='JapaneseFont',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#0f172a'),
        backColor=colors.HexColor('#f8fafc'),
        borderColor=colors.HexColor('#cbd5e1'),
        borderWidth=0.5,
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=8
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        fontName='JapaneseFont',
        fontSize=8.5,
        leading=13,
        textColor=colors.HexColor('#1e293b')
    )

    story = []

    # 表紙・タイトル
    story.append(Paragraph("実践 Next.js & TypeScript 入門", title_style))
    story.append(Paragraph("アカペラバンド運営アプリで学ぶ Web開発の設計と実装完全ガイド", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#4f46e5'), spaceAfter=14))

    # メタ情報テーブル
    meta_data = [
        [Paragraph("<b>対象読者</b>", body_style), Paragraph("新人ソフトウェアエンジニア、Web開発初心者、Next.js/TypeScriptの基礎を固めたい方", body_style)],
        [Paragraph("<b>テーマ</b>", body_style), Paragraph("要件定義から型設計、React Context、集計アルゴリズム、セキュリティ、UI連携の実践", body_style)],
        [Paragraph("<b>技術スタック</b>", body_style), Paragraph("Next.js (App Router), React 19, TypeScript, Tailwind CSS v4", body_style)]
    ]
    t = Table(meta_data, colWidths=[80, 415])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    # はじめに
    story.append(Paragraph("はじめに：本教材の目的", h1_style))
    story.append(Paragraph(
        "新人のソフトウェアエンジニアが開発現場に出て最も直面する悩みは、「文法は覚えたけれど、実際の要件をもとにどうやって画面やプログラムを組み立てていけばいいのか分からない」という点です。",
        body_style
    ))
    story.append(Paragraph(
        "本教材は、今回実際に開発した<b>「アカペラバンド運営Webアプリ（Acappella Hub）」</b>を題材に、プロのエンジニアがどのような思考プロセスで要件を整理し、型を定義し、アルゴリズムをコードに落とし込んでいるのかを分かりやすく解説した学習資料です。",
        body_style
    ))

    # 第1章
    story.append(Paragraph("第1章：モダンWeb開発のアーキテクチャ", h1_style))
    story.append(Paragraph("1.1 なぜ Next.js と TypeScript を使うのか？", h2_style))
    story.append(Paragraph(
        "現代のWeb開発においてデファクトスタンダードとなっているのが、Reactベースのフルスタックフレームワークである <b>Next.js</b> と、静的型付け言語の <b>TypeScript</b> です。",
        body_style
    ))
    story.append(Paragraph("・<b>TypeScriptの強み:</b> データの「型（設計図）」を厳密に定義することで、実行前に打ち間違いや型の不一致をコンパイラが検知し、重大なバグを未然に防ぎます。", bullet_style))
    story.append(Paragraph("・<b>Next.jsの強み:</b> 画面表示（フロント）とデータ処理（バックエンド）をシームレスに統合し、App Routerという仕組みでフォルダ構成がそのままWebサイトのURLになります。", bullet_style))

    story.append(Paragraph("1.2 App Routerの「フォルダ＝URL」の仕組み", h2_style))
    router_data = [
        [Paragraph("<b>ファイルパス</b>", body_style), Paragraph("<b>ブラウザのURL</b>", body_style), Paragraph("<b>画面の役割</b>", body_style)],
        [Paragraph("src/app/page.tsx", body_style), Paragraph("/", body_style), Paragraph("ダッシュボード（トップ画面）", body_style)],
        [Paragraph("src/app/events/page.tsx", body_style), Paragraph("/events", body_style), Paragraph("日程調整一覧画面", body_style)],
        [Paragraph("src/app/events/[id]/page.tsx", body_style), Paragraph("/events/ev-1 など", body_style), Paragraph("詳細画面（[id]は動的パラメータ）", body_style)],
        [Paragraph("src/app/events/[id]/respond/page.tsx", body_style), Paragraph("/events/ev-1/respond", body_style), Paragraph("回答入力画面（受付中のみ利用可）", body_style)],
        [Paragraph("src/app/events/[id]/vote/page.tsx", body_style), Paragraph("/events/ev-1/vote", body_style), Paragraph("最終投票 & 自動確定画面", body_style)],
        [Paragraph("src/app/locations/page.tsx", body_style), Paragraph("/locations", body_style), Paragraph("練習場所一覧 & Google Map埋め込み", body_style)],
        [Paragraph("src/app/admin/users/page.tsx", body_style), Paragraph("/admin/users", body_style), Paragraph("管理者専用メンバー追加画面", body_style)]
    ]
    rt = Table(router_data, colWidths=[175, 120, 200])
    rt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e0e7ff')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(rt)
    story.append(Spacer(1, 10))

    # 第2章
    story.append(Paragraph("第2章：要件定義からデータ構造への落とし込み", h1_style))
    story.append(Paragraph("2.1 「データの最小化原則」の実践", h2_style))
    story.append(Paragraph(
        "開発初期、ユーザーから「セキュリティを考慮し、個人情報は絶対に持たせたくない」という重要な要望がありました。Webセキュリティの基本は<b>『持っていないデータは絶対に漏洩しない』</b>ことです。",
        body_style
    ))
    story.append(Paragraph(
        "氏名やメールアドレス、パートなどを排除し、システムに必須の <code>id</code>, <code>password</code>, <code>nickname</code>, <code>bio</code>, <code>isAdmin</code> のみに厳選しました。",
        body_style
    ))
    code_user = """// src/types/index.ts
export interface User {
  id: string;        // メンバー固有ID (例: "ken")
  password: string;  // ログインパスワード
  nickname: string;  // あだ名・バンド内呼称
  bio?: string;      // 自己紹介 (任意)
  isAdmin?: boolean; // 管理者権限フラグ (メンバー追加権限)
}"""
    story.append(Paragraph(code_user.replace('\n', '<br/>').replace(' ', '&nbsp;'), code_style))

    story.append(Paragraph("2.2 進行状態の厳格な型管理（Union Type）", h2_style))
    code_status = """export type EventStatus = 
  | "open"        // 回答受付中（メンバーが回答可能）
  | "aggregated"  // 集計完了（条件一致候補0件）
  | "voting"      // 最終投票中（複数候補から投票）
  | "confirmed"   // 確定済み（日時・場所決定）
  | "completed"   // 練習終了（過去の記録としてアーカイブ）
  | "cancelled";  // 中止"""
    story.append(Paragraph(code_status.replace('\n', '<br/>').replace(' ', '&nbsp;'), code_style))

    story.append(PageBreak())

    # 第3章
    story.append(Paragraph("第3章：状態管理と認証ガード（AuthGuard）", h1_style))
    story.append(Paragraph("3.1 React Contextによる記憶部屋の作成", h2_style))
    story.append(Paragraph(
        "コンポーネント間でデータを受け渡す際、親から子、孫へと延々とバケツリレーするのは保守性が落ちます。そこで <code>AppContext</code> という共有の記憶部屋を作り、ブラウザの <code>localStorage</code> と同期させることで、F5再読み込みしてもデータが消えない仕組みを作りました。",
        body_style
    ))

    story.append(Paragraph("3.2 認証ガード（未ログイン時の遮断）", h2_style))
    story.append(Paragraph(
        "ログインしていないユーザーがアプリの画面を一切操作できないようにする「認証ガード」は、ルートレイアウトで <code>currentUser === null</code> を判定してログイン画面を割り込ませる設計を採用しています。",
        body_style
    ))
    code_auth = """// src/components/ClientProviders.tsx
function AuthContent({ children }: { children: React.ReactNode }) {
  const { currentUser } = useApp();
  // 未ログインなら問答無用でログイン画面を返す！
  if (!currentUser) return &lt;LoginForm /&gt;;
  return &lt;&gt;&lt;Header /&gt;&lt;main&gt;{children}&lt;/main&gt;&lt;/&gt;;
}"""
    story.append(Paragraph(code_auth.replace('\n', '<br/>').replace(' ', '&nbsp;'), code_style))

    # 第4章
    story.append(Paragraph("第4章：集計・投票アルゴリズムの徹底解説", h1_style))
    story.append(Paragraph("4.1 30分スロット分割とスライディング探索", h2_style))
    story.append(Paragraph(
        "「指定した練習時間を満たし、共通のスタジオが空いている最大人数の枠」を見つけるため、時間を30分単位のコマに分解し、練習時間の長さを持つウィンドウを朝から夜まで30分ずつスライドさせて走査します。",
        body_style
    ))

    story.append(Paragraph("4.2 練習時間最大化と民主的な確定ロジック", h2_style))
    story.append(Paragraph(
        "日程調整の確定アルゴリズムには、バンド練習を最大化するための以下の3段階の判定基準を実装しました：",
        body_style
    ))
    story.append(Paragraph("1. <b>最も多くの人が参加可能:</b> 総参加可能人数（フル＋途中参加）が最大の候補を抽出する。", bullet_style))
    story.append(Paragraph("2. <b>最も多くの時間練習が可能:</b> 人数が同じ場合、全メンバーの合計参加可能時間（totalAttendanceMinutes）が最大の候補を抽出する。", bullet_style))
    story.append(Paragraph("3. <b>フル参加メンバーが最多:</b> 時間も同じ場合、遅刻・早退のないフル参加者が最も多い候補を抽出する。", bullet_style))
    story.append(Paragraph("4. <b>自動確定 vs 最終投票:</b> 上記で単独1件に絞り込まれれば直ちに日程確定！同条件で複数残った場合のみ最終投票へ進む。", bullet_style))
    story.append(Paragraph("5. <b>同票時の幹事決定:</b> 最終投票で同票となった場合は、同票候補の中から幹事が最終決定を行う。", bullet_style))

    story.append(Paragraph("4.3 途中参加・途中退出（遅刻・早退）の区間重なり判定アルゴリズム", h2_style))
    story.append(Paragraph(
        "バンド練習では「2時間枠のうち後半90分だけ参加できる」「前半だけ参加して早退する」といった現実的なケースが頻繁に起こります。そこで、候補枠 <code>[startM, endM]</code> とメンバー回答 <code>[slotStart, slotEnd]</code> の時間の重なり（Overlap）を計算し、30分以上参加できる場合は途中参加として救済するロジックを導入しました：",
        body_style
    ))
    story.append(Paragraph("• <b>フル参加 (full):</b> 枠全体に参加可能（slotStart &le; startM かつ slotEnd &ge; endM）", bullet_style))
    story.append(Paragraph("• <b>遅刻参加 (late):</b> 開始に遅れるが終了まで参加（slotStart &gt; startM かつ slotEnd &ge; endM）", bullet_style))
    story.append(Paragraph("• <b>早退 (early):</b> 開始から参加できるが途中で抜ける（slotStart &le; startM かつ slotEnd &lt; endM）", bullet_style))
    story.append(Paragraph("• <b>ランキング順位:</b> 総人数（フル＋途中）が多い候補を優先し、人数が同じなら「フル参加人数が多い候補」を上位にする。", bullet_style))

    story.append(Paragraph("4.4 単体テスト（Vitest）による品質担保と現場の流儀", h2_style))
    story.append(Paragraph(
        "複雑な集計アルゴリズムやタイブレーク判定を画面のポチポチ操作だけで手動テストするのは、ミスや見落としの原因になります。本アプリでは <code>vitest</code> を導入し、集計・時刻変換・タイブレーク・認証の全25ケースをわずか0.3秒で全自動検証する単体テスト環境を構築しました。コードを変更した瞬間に「既存の機能が壊れていないか」を一瞬で保証できるのがテスト駆動の強みです。",
        body_style
    ))

    # 第5章
    story.append(Paragraph("第5章：現場で役立つUI/UXテクニック", h1_style))
    story.append(Paragraph("5.1 Google Map との連動（iframeとURLパラメータ）", h2_style))
    story.append(Paragraph(
        "練習場所一覧では Google Maps の Embed URL を動的に生成して地図を埋め込んでいます。また、日程詳細から <code>/locations?select=loc-1</code> と遷移することで、該当施設を自動で選択・地図表示する直感的なUXを実現しています。",
        body_style
    ))

    story.append(Paragraph("5.2 練習終了（completed）ステータスの自動遷移", h2_style))
    story.append(Paragraph(
        "確定した練習日程の終了時刻を過ぎると、バックグラウンドで自動的に「練習終了」ステータスに切り替わり、ダッシュボードの「過去の記録」へアーカイブされます。これにより、将来の振り返りチャットや音源共有への布石が整いました。",
        body_style
    ))

    # 第6章
    story.append(Paragraph("第6章：新人エンジニアがつまずきやすいトラブル解説", h1_style))
    story.append(Paragraph("6.1 「npm コマンドが認識されない」環境変数PATHの仕組み", h2_style))
    story.append(Paragraph(
        "Node.jsをインストールしても、すでに開いていたターミナルは古い環境変数PATHを保持しているため認識されません。ターミナルを開き直すことで最新の検索リストが読み込まれ、解決します。",
        body_style
    ))

    story.append(Paragraph("6.2 「デザインが当たらない」CSSビルドチェーンの重要性", h2_style))
    story.append(Paragraph(
        "Next.js 16 と Tailwind CSS v4 の連携において、直接ローダーに依存せず <code>@tailwindcss/cli</code> で確実に静的CSSを事前ビルドするチェーン（<code>npm run build:css && next dev</code>）を組むことで、確実で安定したスタイリングを実現しました。",
        body_style
    ))

    # おわりに
    story.append(Spacer(1, 10))
    story.append(Paragraph("おわりに：プロのエンジニアへの第一歩", h1_style))
    story.append(Paragraph(
        "Webアプリ開発の本質は、<b>『ユーザーの要求や運用ルールを深く理解し、破綻のないデータ構造と使いやすい画面に翻訳すること』</b>です。本アプリに組み込まれたコードを何度も読み返し、自分なりに改造してみることで、確実に本物の開発力が身につきます。これからの成長を心より応援しています！",
        body_style
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF: {filename}")

if __name__ == '__main__':
    output_pdf = "C:\\Users\\imopo\\workspace\\acapella_appli\\document\\Webエンジニア初心者向け教材_設計と実装ガイド.pdf"
    create_guide_pdf(output_pdf)

