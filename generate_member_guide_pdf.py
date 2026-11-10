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

font_bold_path = "C:\\Windows\\Fonts\\meiryob.ttc" if os.path.exists("C:\\Windows\\Fonts\\meiryob.ttc") else font_path

pdfmetrics.registerFont(TTFont("JapaneseFont", font_path))
pdfmetrics.registerFont(TTFont("JapaneseFont-Bold", font_bold_path))

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
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("JapaneseFont", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # ヘッダー (2ページ目以降)
        if self._pageNumber > 1:
            self.drawString(40, 842 - 28, "Acappella Hub メンバー向けかんたん操作ガイド")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(40, 842 - 34, 595 - 40, 842 - 34)
        
        # フッター (全ページ)
        page_text = f"- {self._pageNumber} / {page_count} -"
        self.drawRightString(595 - 40, 24, page_text)
        self.drawString(40, 24, "アカペラバンド運営支援システム Acappella Hub")
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(40, 36, 595 - 40, 36)
        
        self.restoreState()

def create_callout(text, title="POINT", bg_color="#eef2ff", border_color="#6366f1", text_color="#312e81"):
    title_p = Paragraph(f"<b><font color='{border_color}'>💡 {title}</font></b>", ParagraphStyle(
        'CalloutTitle', fontName='JapaneseFont-Bold', fontSize=10, leading=14, textColor=colors.HexColor(border_color)
    ))
    body_p = Paragraph(text, ParagraphStyle(
        'CalloutBody', fontName='JapaneseFont', fontSize=9, leading=14, textColor=colors.HexColor(text_color)
    ))
    
    tbl = Table([[title_p], [body_p]], colWidths=[515])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(bg_color)),
        ('LEFTPADDING', (0,0), (-1,-1), 14),
        ('RIGHTPADDING', (0,0), (-1,-1), 14),
        ('TOPPADDING', (0,0), (-1,0), 8),
        ('BOTTOMPADDING', (0,1), (-1,1), 8),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor(border_color)),
        ('LINELEFT', (0,0), (0,-1), 3.5, colors.HexColor(border_color)),
    ]))
    return tbl

def create_step_header(step_no, title, subtitle=""):
    title_html = f"<b><font color='#4f46e5'>STEP {step_no}</font>　{title}</b>"
    if subtitle:
        title_html += f"<br/><font size=8.5 color='#64748b'>　{subtitle}</font>"
    
    p = Paragraph(title_html, ParagraphStyle(
        'StepTitle', fontName='JapaneseFont-Bold', fontSize=13, leading=18, textColor=colors.HexColor("#0f172a")
    ))
    
    tbl = Table([[p]], colWidths=[515])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LINELEFT', (0,0), (0,-1), 4, colors.HexColor("#4f46e5")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    return tbl

def generate_manual_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=44,
        bottomMargin=44
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'MainTitle',
        fontName='JapaneseFont-Bold',
        fontSize=22,
        leading=28,
        textColor=colors.HexColor('#1e1b4b'),
        alignment=1, # Center
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'SubTitle',
        fontName='JapaneseFont',
        fontSize=11,
        leading=16,
        textColor=colors.HexColor('#4f46e5'),
        alignment=1,
        spaceAfter=15
    )

    h2_style = ParagraphStyle(
        'H2',
        fontName='JapaneseFont-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=10,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'Body',
        fontName='JapaneseFont',
        fontSize=9.5,
        leading=14.5,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        fontName='JapaneseFont',
        fontSize=9,
        leading=13.5,
        textColor=colors.HexColor('#334155'),
        leftIndent=14,
        spaceAfter=4
    )

    story = []

    # --- カバーヘッダー ---
    story.append(Spacer(1, 6))
    story.append(Paragraph("Acappella Hub 操作マニュアル", title_style))
    story.append(Paragraph("バンド練習の日程調整・場所決めをもっとスムーズに！メンバー向け利用ガイド", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceBefore=2, spaceAfter=14))

    # はじめに
    intro_text = (
        "<b>Acappella Hub（アカペラハブ）へようこそ！</b><br/>"
        "LINEのグループだと流れてしまいがちな「練習の日程調整」「練習場所選び」「最終投票」「スタジオの場所確認」を1箇所にまとめ、"
        "スマホから誰でも直感的に使えるバンド専用のWebアプリです。<br/>"
        "アプリのインストールは不要で、ブラウザからURLを開くだけですぐに使えます。"
    )
    story.append(Paragraph(intro_text, body_style))
    story.append(Spacer(1, 8))

    # 概要フロー表
    flow_data = [
        [
            Paragraph("<b>① ログイン</b>", ParagraphStyle('F1', fontName='JapaneseFont-Bold', fontSize=9.5, textColor=colors.HexColor('#4f46e5'))),
            Paragraph("<b>② 日程の回答</b>", ParagraphStyle('F2', fontName='JapaneseFont-Bold', fontSize=9.5, textColor=colors.HexColor('#4f46e5'))),
            Paragraph("<b>③ 候補日への投票</b>", ParagraphStyle('F3', fontName='JapaneseFont-Bold', fontSize=9.5, textColor=colors.HexColor('#4f46e5'))),
            Paragraph("<b>④ 練習確定 & マップ</b>", ParagraphStyle('F4', fontName='JapaneseFont-Bold', fontSize=9.5, textColor=colors.HexColor('#4f46e5')))
        ],
        [
            Paragraph("幹事から届いたIDとパスワードでログイン", bullet_style),
            Paragraph("空いている日時と行ける場所をポチポチ選択", bullet_style),
            Paragraph("全員の共通時間から選ばれた候補に投票", bullet_style),
            Paragraph("確定日時と練習スタジオの地図を確認！", bullet_style)
        ]
    ]
    flow_tbl = Table(flow_data, colWidths=[128, 129, 129, 129])
    flow_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor("#ffffff")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
    ]))
    story.append(flow_tbl)
    story.append(Spacer(1, 14))

    # --- STEP 1 ---
    story.append(create_step_header("1", "ログインとアカウント設定", "まずは幹事から渡されたアカウントで入ってみよう"))
    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>1. アプリのURLを開く</b><br/>幹事（けんちゃん）から共有されたURLをスマホまたはPCのブラウザで開きます。", body_style))
    story.append(Paragraph("<b>2. ログインする</b><br/>幹事から個別に案内された <b>ログインID</b> と <b>初期パスワード</b> を入力して「ログイン」をタップします。", body_style))
    story.append(Paragraph("<b>3. あだ名・パスワードの確認・変更（右上のアカウント名）</b><br/>ログイン後、画面右上の「あだ名（⚙️）」をタップすると、プロフィール画面が開きます。<br/>"
                           "あだ名や自己紹介を変更したり、自分専用のパスワードに変更することができます。", body_style))
    story.append(Spacer(1, 4))
    story.append(create_callout(
        "iPhone（Safari）なら「共有ボタン」→「ホーム画面に追加」、Android（Chrome）ならメニューの「アプリをインストール」を押すと、"
        "App Storeのアプリのようにホーム画面にアイコンが作られ、ワンタップで全画面起動できるようになります！",
        title="スマホのホーム画面に追加すると超便利！",
        bg_color="#f0fdf4", border_color="#10b981", text_color="#064e3b"
    ))
    story.append(Spacer(1, 14))

    # --- STEP 2 ---
    story.append(create_step_header("2", "練習日程の回答（一番大事な操作！）", "あなたの参加できる日時・場所をカンタン登録"))
    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>1. ダッシュボードからイベントを開く</b><br/>トップ画面の「回答受付中」のイベントをタップし、「<b>日程・場所を回答する</b>」ボタンを押します。", body_style))
    story.append(Paragraph("<b>2. 参加の可否を選ぶ</b><br/>「参加できる日時がある（可能）」または「今回は全日程都合がつかない（不参加）」を選択します。", body_style))
    story.append(Paragraph("<b>3. 参加可能枠を登録する（複数追加OK！）</b>", body_style))
    story.append(Paragraph("・<b>日付</b>：候補日の中から選ぶか、カレンダーから指定します。", bullet_style))
    story.append(Paragraph("・<b>時間帯</b>：開始時刻〜終了時刻を30分刻みで指定（例: 13:00〜17:00）。", bullet_style))
    story.append(Paragraph("・<b>行ける練習場所</b>：利用可能なスタジオにチェックを入れます（複数選択可）。", bullet_style))
    story.append(Paragraph("・「<b>＋ この時間帯を追加する</b>」を押すと登録されます。「13:00〜16:00は新宿、18:00〜21:00は渋谷」のように複数枠を自由に追加できます。", bullet_style))
    story.append(Paragraph("<b>4. 登録済みの枠を修正したいとき</b><br/>登録した時間帯カードの「編集（鉛筆マーク）」を押すと、いつでもその場で日付・時刻・場所を修正できます。", body_style))
    story.append(Paragraph("<b>5. 「回答を保存する」を押して完了！</b><br/>全員の回答がリアルタイムに集計されます。締め切り前なら何度でも回答を変更できます。", body_style))
    
    story.append(PageBreak())

    # --- STEP 3 ---
    story.append(create_step_header("3", "集計と最終投票（ベストな練習日を決めよう）", "システムが重なり時間を自動計算！みんなで投票"))
    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>1. 自動マッチング</b><br/>全員の回答が集まると、システムが「全員が揃う共通時間」や「参加可能人数」を自動計算し、ベストな候補枠をピックアップします。", body_style))
    story.append(Paragraph("<b>2. 候補への投票</b><br/>幹事から「投票受付中」のアナウンスがあったら、イベント画面を開きます。<br/>"
                           "提示された候補の中から、あなたの都合の良い枠をクリックして投票してください。", body_style))
    story.append(Paragraph("・<b>投票の取り消し・再投票</b>：投票済みの候補をもう一度クリックすると投票を取り消せます。他の候補に投票し直すことも可能です。", bullet_style))
    story.append(Paragraph("・<b>自動確定</b>：投票期限が来ると、最も得票数の多かった枠で練習が自動確定します！", bullet_style))
    story.append(Spacer(1, 4))
    story.append(create_callout(
        "「参加できるけど遅刻しそう」「最初の1時間だけ参加できる」という場合でも、参加できる時間帯を入力しておけば、"
        "システムが『途中参加』としてしっかり考慮して集計してくれます！諦めずに空いてる時間を入力してくださいね。",
        title="遅刻・早退でも大丈夫！",
        bg_color="#fefce8", border_color="#f59e0b", text_color="#78350f"
    ))
    story.append(Spacer(1, 14))

    # --- STEP 4 ---
    story.append(create_step_header("4", "確定情報の確認 & Google Map連携", "当日迷わない！スタジオへのルートもワンタップ"))
    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>1. 次回練習の確認</b><br/>ダッシュボード（トップ画面）の一番上に、確定した練習の日時・場所・参加メンバーが大きく表示されます。", body_style))
    story.append(Paragraph("<b>2. スタジオの場所を確認する</b><br/>イベント画面や練習場所一覧から、スタジオの場所を確認できます。", body_style))
    story.append(Paragraph("・「<b>Google Mapで開く（別タブ/アプリ）</b>」ボタンを押すと、Googleマップアプリが起動し、スタジオの正確なピン位置が開きます。ナビ開始もスムーズ！", bullet_style))
    story.append(Paragraph("・練習場所メニューでは、スタジオの住所や利用メモ（マイク本数、ピアノの有無など）も確認できます。", bullet_style))
    story.append(Spacer(1, 14))

    # --- よくある質問 (Q&A) ---
    story.append(Paragraph("よくある質問（Q&A）", h2_style))
    
    qa_data = [
        [
            Paragraph("<b>Q. ログインIDやパスワードを忘れました</b>", ParagraphStyle('Q1', fontName='JapaneseFont-Bold', fontSize=9, textColor=colors.HexColor('#1e293b'))),
            Paragraph("幹事（けんちゃん）に教えてもらえば、管理者画面から確認や再発行が可能です。お気軽に幹事へ声をかけてください。", ParagraphStyle('A1', fontName='JapaneseFont', fontSize=8.5, leading=12.5, textColor=colors.HexColor('#475569')))
        ],
        [
            Paragraph("<b>Q. 回答した内容を後から変更したい</b>", ParagraphStyle('Q2', fontName='JapaneseFont-Bold', fontSize=9, textColor=colors.HexColor('#1e293b'))),
            Paragraph("回答期限（締め切り）前であれば、イベント画面の「回答を変更する」からいつでも修正・上書き保存ができます。", ParagraphStyle('A2', fontName='JapaneseFont', fontSize=8.5, leading=12.5, textColor=colors.HexColor('#475569')))
        ],
        [
            Paragraph("<b>Q. 新しいスタジオを提案したい</b>", ParagraphStyle('Q3', fontName='JapaneseFont-Bold', fontSize=9, textColor=colors.HexColor('#1e293b'))),
            Paragraph("「練習場所」メニューの「＋新しい練習場所を提案する」から、誰でも新しいスタジオを追加・共有できます。Googleマップのリンクも貼れます！", ParagraphStyle('A3', fontName='JapaneseFont', fontSize=8.5, leading=12.5, textColor=colors.HexColor('#475569')))
        ],
        [
            Paragraph("<b>Q. 画面の動きがおかしい・更新されない</b>", ParagraphStyle('Q4', fontName='JapaneseFont-Bold', fontSize=9, textColor=colors.HexColor('#1e293b'))),
            Paragraph("ブラウザの再読み込み（リロード）をお試しください。常にクラウドデータベースと最新の同期が行われます。", ParagraphStyle('A4', fontName='JapaneseFont', fontSize=8.5, leading=12.5, textColor=colors.HexColor('#475569')))
        ]
    ]
    qa_tbl = Table(qa_data, colWidths=[180, 335])
    qa_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(qa_tbl)
    story.append(Spacer(1, 14))

    # フッターメッセージ
    msg_box = Table([[
        Paragraph(
            "<font size=9 color='#4338ca'><b>🎵 みんなで快適なバンド活動を！</b><br/>"
            "日程調整やスタジオ選びの手間をなくして、思いっきり歌を楽しみましょう！ご不明な点があれば幹事までお気軽にどうぞ。</font>",
            ParagraphStyle('FootMsg', fontName='JapaneseFont', leading=14, alignment=1)
        )
    ]], colWidths=[515])
    msg_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#e0e7ff")),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#818cf8")),
    ]))
    story.append(msg_box)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated: {filename}")

if __name__ == "__main__":
    out_dir = "C:\\Users\\imopo\\workspace\\acappella_app\\document"
    os.makedirs(out_dir, exist_ok=True)
    pdf_path = os.path.join(out_dir, "Acappella_Hub_メンバー向け操作マニュアル.pdf")
    generate_manual_pdf(pdf_path)

