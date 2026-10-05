import os
import math
from PIL import Image, ImageDraw, ImageFont

def get_font(name, size, bold=False):
    font_paths = [
        f"/usr/share/fonts/TTF/{'DejaVuSans-Bold' if bold else 'DejaVuSans'}.ttf",
        f"/usr/share/fonts/TTF/{'DejaVuSansMono-Bold' if bold else 'DejaVuSansMono'}.ttf",
        "/usr/share/fonts/TTF/DejaVuSans.ttf"
    ]
    for p in font_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

def tint_image(img, rgb_color):
    r, g, b, a = img.split()
    solid = Image.new('RGB', img.size, rgb_color)
    sr, sg, sb = solid.split()
    return Image.merge('RGBA', (sr, sg, sb, a))

def render_notebook():
    S = 1536
    nb = Image.new('RGBA', (S, S), (252, 248, 238, 255))
    draw = ImageDraw.Draw(nb)

    # Lined horizontal blue rules
    line_spacing = 32
    for y in range(64, S - 40, line_spacing):
        is_major = (y // line_spacing) % 5 == 0
        c = (140, 175, 215, 120 if not is_major else 200)
        draw.line([40, y, S - 40, y], fill=c, width=1 if not is_major else 2)

    # Red vertical margin (double lines)
    mX1 = 150
    mX2 = 154
    draw.line([mX1, 40, mX1, S - 40], fill=(215, 75, 75, 160), width=2)
    draw.line([mX2, 40, mX2, S - 40], fill=(215, 75, 75, 90), width=1)

    # Binder punch holes on the far left
    for hy in [220, 768, 1316]:
        draw.ellipse([65 - 18, hy - 18, 65 + 18, hy + 18], fill=(228, 216, 192), outline=(135, 110, 80), width=2)
        draw.ellipse([65 - 9, hy - 9, 65 + 9, hy + 9], fill=(42, 26, 16))

    contentX = 175
    contentW = S - contentX - 65 # ~1296px

    # Rubber Stamp on top right (terminal.png in blue ink)
    stampCX = contentX + contentW - 120
    stampCY = 115
    stampR = 68
    draw.ellipse([stampCX - stampR, stampCY - stampR, stampCX + stampR, stampCY + stampR], outline=(28, 65, 105, 230), width=3)
    draw.ellipse([stampCX - stampR + 6, stampCY - stampR + 6, stampCX + stampR - 6, stampCY + stampR - 6], outline=(28, 65, 105, 140), width=1)
    draw.text((stampCX, stampCY - stampR + 15), "TARTARUS LABS", fill=(28, 65, 105), font=get_font("mono", 11, bold=True), anchor="mm")
    draw.text((stampCX, stampCY + stampR - 15), "HUFFMAN APROVADO", fill=(28, 65, 105), font=get_font("mono", 10, bold=True), anchor="mm")

    if os.path.exists("static/terminal.png"):
        raw_logo = Image.open("static/terminal.png").convert("RGBA")
        blue_logo = tint_image(raw_logo, (28, 65, 105))
        blue_logo = blue_logo.resize((84, 84), Image.Resampling.LANCZOS)
        nb.paste(blue_logo, (stampCX - 42, stampCY - 40), blue_logo)

    # Title & Subtitle
    # Yellow highlighter strip behind title
    draw.rectangle([contentX - 4, 60, contentX + 680, 96], fill=(255, 240, 90, 160))
    f_title = get_font("sans", 26, bold=True)
    draw.text((contentX + 10, 78), "MANUAL DIDÁTICO: COMPRESSÃO DE HUFFMAN", fill=(16, 32, 54), font=f_title, anchor="lm")

    f_sub = get_font("mono", 15, bold=True)
    draw.text((contentX + 10, 114), "Como construir a Árvore Binária Ótima através da Escolha Gulosa.", fill=(40, 70, 100), font=f_sub, anchor="lm")

    # Yellow highlighter core concept box
    draw.rectangle([contentX, 138, contentX + contentW - 250, 182], fill=(255, 245, 160, 180), outline=(225, 200, 70), width=1)
    f_idea = get_font("mono", 14, bold=True)
    draw.text((contentX + 14, 160), "REGRA DE OURO: Letras frequentes usam 1 ou 2 bits. Letras raras usam 3 ou 4 bits.", fill=(20, 40, 20), font=f_idea, anchor="lm")

    # PART 1: THE 3 VISUAL STEPS (Y: 195 to 455)
    sY = 200
    sH = 240
    stepW = (contentW - 30) // 3

    # Step 1
    p1X = contentX
    draw.rectangle([p1X, sY, p1X + stepW, sY + sH], fill=(255, 255, 255, 220), outline=(50, 90, 130), width=2)
    draw.rectangle([p1X, sY, p1X + stepW, sY + 34], fill=(225, 238, 250))
    draw.text((p1X + 12, sY + 17), "1. IDENTIFICAR OS MENORES", fill=(15, 35, 60), font=get_font("sans", 14, bold=True), anchor="lm")

    draw.text((p1X + 12, sY + 50), "Ordene a fila de prioridade pelo peso:", fill=(40, 60, 80), font=get_font("mono", 12))

    # Node cards [A:2] [B:3] [C:5] [D:8]
    def draw_mini_card(x, y, ch, w, is_min):
        bg = (255, 235, 235) if is_min else (240, 246, 252)
        bd = (210, 40, 40) if is_min else (70, 110, 150)
        draw.rectangle([x, y, x + 58, y + 42], fill=bg, outline=bd, width=2 if is_min else 1)
        draw.text((x + 29, y + 15), f"'{ch}'", fill=(180, 20, 20) if is_min else (20, 50, 80), font=get_font("mono", 14, bold=True), anchor="mm")
        draw.text((x + 29, y + 30), f"p:{w}", fill=(180, 20, 20) if is_min else (40, 70, 100), font=get_font("mono", 11), anchor="mm")

    draw_mini_card(p1X + 12, sY + 70, "A", 2, True)
    draw_mini_card(p1X + 76, sY + 70, "B", 3, True)
    draw_mini_card(p1X + 140, sY + 70, "C", 5, False)
    draw_mini_card(p1X + 204, sY + 70, "D", 8, False)

    # Red hand-drawn pencil oval circling A and B
    draw.ellipse([p1X + 8, sY + 66, p1X + 138, sY + 116], outline=(220, 30, 30), width=2)
    draw.text((p1X + 12, sY + 132), "▲ 2 MENORES PESOS: (2 e 3)", fill=(210, 25, 25), font=get_font("mono", 13, bold=True), anchor="lm")
    draw.text((p1X + 12, sY + 160), "A escolha gulosa SEMPRE une", fill=(50, 70, 90), font=get_font("mono", 12), anchor="lm")
    draw.text((p1X + 12, sY + 180), "os dois nós mais leves da esteira.", fill=(50, 70, 90), font=get_font("mono", 12), anchor="lm")
    draw.text((p1X + 12, sY + 210), "Clique ou use teclas 1..4", fill=(15, 80, 45), font=get_font("mono", 12, bold=True), anchor="lm")

    # Step 2
    p2X = p1X + stepW + 15
    draw.rectangle([p2X, sY, p2X + stepW, sY + sH], fill=(255, 255, 255, 220), outline=(50, 90, 130), width=2)
    draw.rectangle([p2X, sY, p2X + stepW, sY + 34], fill=(225, 245, 235))
    draw.text((p2X + 12, sY + 17), "2. FUNDIR COM [ESPAÇO]", fill=(15, 75, 40), font=get_font("sans", 14, bold=True), anchor="lm")

    draw.text((p2X + 12, sY + 50), "Crie um Nó Pai somando os pesos:", fill=(40, 60, 80), font=get_font("mono", 12))

    # Fusion diagram
    draw.rectangle([p2X + 30, sY + 70, p2X + stepW - 30, sY + 116], fill=(235, 250, 240), outline=(30, 140, 70), width=2)
    draw.text((p2X + stepW // 2, sY + 86), "NÓ PAI: 2 + 3 = 5", fill=(15, 100, 45), font=get_font("mono", 14, bold=True), anchor="mm")
    draw.text((p2X + stepW // 2, sY + 104), "Filhos: A(2) e B(3)", fill=(50, 80, 60), font=get_font("mono", 11), anchor="mm")

    draw.text((p2X + 12, sY + 132), "✔ O PAI VOLTA PARA A FILA!", fill=(20, 120, 50), font=get_font("mono", 13, bold=True), anchor="lm")
    draw.text((p2X + 12, sY + 160), "Nova fila ordenada:", fill=(50, 70, 90), font=get_font("mono", 12), anchor="lm")
    draw.text((p2X + 12, sY + 180), "[ C: 5 ]   [ Pai: 5 ]   [ D: 8 ]", fill=(20, 50, 90), font=get_font("mono", 12, bold=True), anchor="lm")
    draw.text((p2X + 12, sY + 210), "Pressione [ESPAÇO] para fundir", fill=(15, 80, 45), font=get_font("mono", 12, bold=True), anchor="lm")

    # Step 3
    p3X = p2X + stepW + 15
    draw.rectangle([p3X, sY, p3X + stepW, sY + sH], fill=(255, 255, 255, 220), outline=(50, 90, 130), width=2)
    draw.rectangle([p3X, sY, p3X + stepW, sY + 34], fill=(250, 240, 225))
    draw.text((p3X + 12, sY + 17), "3. REPETIR ATÉ A RAIZ", fill=(110, 60, 10), font=get_font("sans", 14, bold=True), anchor="lm")

    draw.text((p3X + 12, sY + 50), "Continue unindo os 2 menores:", fill=(40, 60, 80), font=get_font("mono", 12))
    draw.text((p3X + 12, sY + 76), "• Funda C(5) + Pai(5) -> [10]", fill=(20, 45, 75), font=get_font("mono", 12, bold=True))
    draw.text((p3X + 12, sY + 102), "• Funda D(8) + Nó(10) -> [18]", fill=(20, 45, 75), font=get_font("mono", 12, bold=True))

    draw.text((p3X + 12, sY + 132), "★ RAIZ ÚNICA ALCANÇADA!", fill=(180, 40, 10), font=get_font("mono", 13, bold=True), anchor="lm")
    draw.text((p3X + 12, sY + 160), "Quando restar apenas 1 nó,", fill=(50, 70, 90), font=get_font("mono", 12), anchor="lm")
    draw.text((p3X + 12, sY + 180), "a Árvore Binária está completa!", fill=(50, 70, 90), font=get_font("mono", 12), anchor="lm")
    draw.text((p3X + 12, sY + 210), "Pressione [ENTER] para emitir", fill=(15, 80, 45), font=get_font("mono", 12, bold=True), anchor="lm")

    # PART 2: THE BIG BEAUTIFUL BINARY TREE (Y: 465 to 1030)
    treeY = 465
    treeH = 560
    draw.rectangle([contentX, treeY, contentX + contentW, treeY + treeH], fill=(255, 255, 255, 235), outline=(35, 75, 115), width=2)

    # Title strip
    draw.rectangle([contentX, treeY, contentX + contentW, treeY + 36], fill=(230, 240, 250))
    draw.text((contentX + 15, treeY + 18), "DEMONSTRAÇÃO DA ÁRVORE COMPLETA // RAMO ESQUERDO = BIT '0'  |  RAMO DIREITO = BIT '1'", fill=(15, 45, 80), font=get_font("sans", 15, bold=True), anchor="lm")

    # Tree Coordinates
    treeCX = contentX + int(contentW * 0.42)
    rY = treeY + 85

    # Node rendering helper
    def draw_tree_node(x, y, label, is_leaf, freq, code=""):
        r = 28
        bg = (240, 255, 245) if is_leaf else (255, 250, 235)
        bd = (25, 130, 65) if is_leaf else (180, 110, 20)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=bg, outline=bd, width=3)
        draw.text((x, y - 4 if is_leaf else y), label, fill=(15, 30, 50), font=get_font("sans", 15, bold=True), anchor="mm")
        if is_leaf:
            draw.text((x, y + 13), f"p:{freq}", fill=(25, 130, 65), font=get_font("mono", 11, bold=True), anchor="mm")

    # Branch helper
    def draw_tree_branch(x1, y1, x2, y2, bit):
        draw.line([x1, y1, x2, y2], fill=(45, 75, 105), width=3)
        mx = (x1 + x2) // 2
        my = (y1 + y2) // 2
        # Pill
        bg = (220, 248, 230) if bit == '0' else (255, 238, 215)
        bd = (20, 130, 60) if bit == '0' else (200, 110, 15)
        draw.rectangle([mx - 14, my - 14, mx + 14, my + 14], fill=bg, outline=bd, width=2)
        draw.text((mx, my), bit, fill=bd, font=get_font("mono", 16, bold=True), anchor="mm")

    # Positions
    n_root = (treeCX, rY)
    n_D = (treeCX - 190, rY + 115)
    n_10 = (treeCX + 150, rY + 115)
    n_C = (n_10[0] - 120, n_10[1] + 125)
    n_5 = (n_10[0] + 120, n_10[1] + 125)
    n_A = (n_5[0] - 70, n_5[1] + 125)
    n_B = (n_5[0] + 70, n_5[1] + 125)

    # Draw branches
    draw_tree_branch(n_root[0], n_root[1] + 28, n_D[0], n_D[1] - 28, '0')
    draw_tree_branch(n_root[0], n_root[1] + 28, n_10[0], n_10[1] - 28, '1')

    draw_tree_branch(n_10[0], n_10[1] + 28, n_C[0], n_C[1] - 28, '0')
    draw_tree_branch(n_10[0], n_10[1] + 28, n_5[0], n_5[1] - 28, '1')

    draw_tree_branch(n_5[0], n_5[1] + 28, n_A[0], n_A[1] - 28, '0')
    draw_tree_branch(n_5[0], n_5[1] + 28, n_B[0], n_B[1] - 28, '1')

    # Draw nodes
    draw_tree_node(n_root[0], n_root[1], "18", False, 18)
    draw_tree_node(n_D[0], n_D[1], "'D'", True, 8)
    draw_tree_node(n_10[0], n_10[1], "10", False, 10)
    draw_tree_node(n_C[0], n_C[1], "'C'", True, 5)
    draw_tree_node(n_5[0], n_5[1], "5", False, 5)
    draw_tree_node(n_A[0], n_A[1], "'A'", True, 2)
    draw_tree_node(n_B[0], n_B[1], "'B'", True, 3)

    # SIDE TABLE: HOW TO READ PREFIX CODES (RIGHT SIDE)
    tabX = contentX + contentW - 380
    tabY = treeY + 50
    draw.rectangle([tabX, tabY, tabX + 360, tabY + 440], fill=(248, 252, 255), outline=(60, 105, 145), width=2)
    draw.rectangle([tabX, tabY, tabX + 360, tabY + 34], fill=(225, 238, 250))
    draw.text((tabX + 15, tabY + 17), "CÓDIGOS GERADOS (RAIZ -> FOLHA)", fill=(15, 45, 80), font=get_font("sans", 13, bold=True), anchor="lm")

    codes = [
        ("'D'", 8, "0", "1 bit", "Mais frequente = Mais curto!", (20, 130, 60)),
        ("'C'", 5, "10", "2 bits", "Frequência média", (20, 110, 140)),
        ("'A'", 2, "110", "3 bits", "Raro = Código mais longo", (180, 50, 30)),
        ("'B'", 3, "111", "3 bits", "Raro = Código mais longo", (180, 50, 30))
    ]
    for idx, (ch, freq, code, bits, note, color) in enumerate(codes):
        cy = tabY + 50 + idx * 78
        draw.rectangle([tabX + 12, cy, tabX + 348, cy + 68], fill=(255, 255, 255), outline=color, width=1)
        draw.text((tabX + 24, cy + 22), f"{ch}  ->  \"{code}\"", fill=color, font=get_font("mono", 17, bold=True), anchor="lm")
        draw.text((tabX + 240, cy + 22), f"({bits})", fill=(60, 80, 100), font=get_font("mono", 13, bold=True), anchor="lm")
        draw.text((tabX + 24, cy + 48), note, fill=(90, 110, 130), font=get_font("mono", 11), anchor="lm")

    draw.text((tabX + 15, tabY + 390), "★ PROPRIEDADE DE PREFIXO:", fill=(180, 30, 20), font=get_font("mono", 12, bold=True))
    draw.text((tabX + 15, tabY + 412), "Nenhum código é início de outro!", fill=(40, 60, 80), font=get_font("mono", 11))

    # Note below tree
    draw.text((contentX + 20, treeY + treeH - 24), "✔ Repare: 'D' (peso 8) está a apenas 1 salto da raiz e gasta apenas 1 bit ('0')!", fill=(20, 120, 50), font=get_font("mono", 13, bold=True), anchor="lm")

    # PART 3: BIT SAVINGS & MATH (Y: 1045 to 1235)
    savY = 1045
    savH = 195
    draw.rectangle([contentX, savY, contentX + contentW, savY + savH], fill=(255, 255, 255, 220), outline=(40, 80, 120), width=2)
    draw.rectangle([contentX, savY, contentX + contentW, savY + 34], fill=(225, 235, 248))
    draw.text((contentX + 15, savY + 17), "COMPROVAÇÃO MATEMÁTICA: O IMPACTO NO CASCO", fill=(15, 45, 80), font=get_font("sans", 14, bold=True), anchor="lm")

    # ASCII Bar (Red)
    bY1 = savY + 50
    draw.rectangle([contentX + 20, bY1, contentX + contentW - 20, bY1 + 34], fill=(195, 35, 35))
    draw.text((contentX + 35, bY1 + 17), "ASCII PADRÃO (8-BIT):  18 letras × 8 bits = 144 BITS   [ ALTO RISCO DE DETECÇÃO PELO MONSTRO ]", fill=(255, 255, 255), font=get_font("mono", 13, bold=True), anchor="lm")

    # Huffman Bar (Green)
    bY2 = savY + 95
    huffW = int((contentW - 40) * 0.23) # 23% length
    draw.rectangle([contentX + 20, bY2, contentX + 20 + huffW, bY2 + 34], fill=(25, 140, 65))
    draw.rectangle([contentX + 20, bY2, contentX + contentW - 20, bY2 + 34], outline=(25, 140, 65), width=2)
    draw.text((contentX + 35, bY2 + 17), "HUFFMAN: 33 BITS", fill=(255, 255, 255), font=get_font("mono", 13, bold=True), anchor="lm")
    draw.text((contentX + 20 + huffW + 25, bY2 + 17), "(8×1 + 5×2 + 2×3 + 3×3 = 33 bits) -> ECONOMIA DE 77.1% DOS BITS!", fill=(20, 120, 50), font=get_font("mono", 13, bold=True), anchor="lm")

    draw.text((contentX + 20, savY + 160), "Conclusão: Cada bit economizado reduz o alcance sonoro das ondas na fossa em centenas de metros.", fill=(40, 60, 80), font=get_font("mono", 12), anchor="lm")

    # PART 4: CONTROLS CHEAT SHEET (Y: 1255 to 1490)
    ctlY = 1255
    ctlH = 225
    draw.rectangle([contentX, ctlY, contentX + contentW, ctlY + ctlH], fill=(255, 255, 255, 220), outline=(40, 80, 120), width=2)
    draw.rectangle([contentX, ctlY, contentX + contentW, ctlY + 32], fill=(230, 240, 250))
    draw.text((contentX + 15, ctlY + 16), "COMANDOS DA BANCADA NO TERMINAL", fill=(15, 45, 80), font=get_font("sans", 13, bold=True), anchor="lm")

    keys = [
        ("[ CLIQUE OU 1..9 ]", "Seleciona 2 nós na esteira"),
        ("[ BARRA ESPAÇO ]", "Funde os 2 nós selecionados"),
        ("[ TECLA Z ]", "Desfaz a última fusão"),
        ("[ TECLA R ]", "Reinicia a árvore do início"),
        ("[ TECLA ENTER ]", "Transmite com a raiz pronta"),
        ("[ TECLA H / ESC ]", "Fecha este caderno de anotações")
    ]
    for idx, (k, desc) in enumerate(keys):
        col = 0 if idx < 3 else 1
        row = idx if idx < 3 else idx - 3
        kx = contentX + (20 if col == 0 else contentW // 2 + 10)
        ky = ctlY + 48 + row * 44

        draw.rectangle([kx, ky, kx + 180, ky + 34], fill=(240, 245, 252), outline=(50, 90, 130), width=1)
        draw.text((kx + 90, ky + 17), k, fill=(15, 40, 70), font=get_font("mono", 12, bold=True), anchor="mm")
        draw.text((kx + 195, ky + 17), desc, fill=(40, 60, 80), font=get_font("mono", 12), anchor="lm")

    draw.text((contentX + 20, ctlY + ctlH - 20), "REGISTRO DIDÁTICO DE ENGENHARIA // TARTARUS LABS", fill=(120, 140, 160), font=get_font("mono", 11), anchor="lm")
    draw.text((contentX + contentW - 20, ctlY + ctlH - 20), "[ PRESSIONE H OU ESC PARA VOLTAR AO TERMINAL ]", fill=(20, 120, 50), font=get_font("mono", 13, bold=True), anchor="rm")

    out_path = "/home/eduardolm/.gemini/antigravity/brain/6a6f6a8a-b947-46d1-a541-ad2888094198/notebook_prototype.png"
    nb.convert("RGB").save(out_path)
    print("Saved notebook to:", out_path)

render_notebook()
