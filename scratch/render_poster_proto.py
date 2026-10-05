import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def get_font(name, size, bold=False):
    # Try system fonts
    font_paths = [
        f"/usr/share/fonts/TTF/{'DejaVuSans-Bold' if bold else 'DejaVuSans'}.ttf",
        f"/usr/share/fonts/TTF/{'DejaVuSansMono-Bold' if bold else 'DejaVuSansMono'}.ttf",
        f"/usr/share/fonts/truetype/liberation/{'LiberationSans-Bold' if bold else 'LiberationSans-Regular'}.ttf",
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

# ==========================================
# 1. RENDER LORE POSTER PROTOTYPE
# ==========================================
def render_lore_poster():
    W, H = 1500, 1962
    poster = Image.new('RGBA', (W, H), (8, 16, 24, 255))
    draw = ImageDraw.Draw(poster)

    # 1. Background radial gradient
    cx, cy = W // 2, int(H * 0.42)
    for y in range(H):
        for x in range(0, W, 8):
            d = math.hypot(x - cx, y - cy) / 1000.0
            d = min(1.0, d)
            # Interpolate deep navy/teal
            r = int(14 * (1 - d) + 4 * d)
            g = int(28 * (1 - d) + 8 * d)
            b = int(42 * (1 - d) + 12 * d)
            draw.rectangle([x, y, x + 8, y + 1], fill=(r, g, b, 255))

    # Outer Industrial Weathered Frame
    draw.rectangle([16, 16, W - 16, H - 16], outline=(36, 56, 76, 255), width=16)
    draw.rectangle([28, 28, W - 28, H - 28], outline=(180, 40, 40, 255), width=4)

    # Hazard Stripes top and bottom
    def draw_hazard(y_top, h):
        for x in range(32, W - 32, 48):
            pts = [(x, y_top), (x + 24, y_top), (x, y_top + h), (x - 24, y_top + h)]
            draw.polygon(pts, fill=(225, 165, 20, 255))

    draw_hazard(34, 22)
    draw_hazard(H - 56, 22)

    padX = 64
    mainW = W - padX * 2

    # TOP MILITARY BANNER
    draw.rectangle([padX, 68, padX + mainW, 108], fill=(160, 30, 30, 255))
    f_mono_s = get_font("mono", 19, bold=True)
    draw.text((W // 2, 88), "★ DEPARTAMENTO DE GUERRA SUBMARINA // COMANDO BENTÔNICO TARTARUS ★", fill=(255, 255, 255), font=f_mono_s, anchor="mm")

    # PRIMARY SLOGAN (VINTAGE PROPAGANDA)
    f_huge = get_font("sans", 72, bold=True)
    draw.text((W // 2, 172), "PULSOS LIVRES AFUNDAM CASCOS!", fill=(255, 255, 255), font=f_huge, anchor="mm")

    f_sub = get_font("mono", 28, bold=True)
    draw.text((W // 2, 224), "O ABISSO NÃO PERDOA O ECO // SILÊNCIO É SOBREVIVÊNCIA", fill=(235, 175, 25), font=f_sub, anchor="mm")

    # CENTRAL TRENCH & LEVIATHAN ART (Y: 260 to 1020)
    artY = 260
    artH = 750
    # Trench cliff sides
    draw.rectangle([padX, artY, padX + mainW, artY + artH], fill=(5, 10, 16, 255), outline=(32, 60, 85, 255), width=3)

    # Ocean depth scale on the left
    f_depth = get_font("mono", 17, bold=True)
    depths = [
        (0.08, "0m - SUPERFÍCIE (LUZ SOLAR)"),
        (0.32, "-3.000m - ZONA BATIAL (CREPÚSCULO)"),
        (0.60, "-7.000m - ZONA ABISSAL (ESCURIDÃO TOTAL)"),
        (0.88, "-10.920m - FOSSA TARTARUS (PRESSÃO: 1.100 ATM)")
    ]
    for frac, label in depths:
        ly = artY + int(artH * frac)
        draw.line([padX + 20, ly, padX + 240, ly], fill=(50, 85, 120, 255), width=2)
        draw.text((padX + 250, ly), label, fill=(130, 170, 205), font=f_depth, anchor="lm")

    # Sonar pulse rings from submarine
    subCX = W // 2 + 100
    subCY = artY + 310

    for r in [90, 180, 270, 360, 460]:
        draw.ellipse([subCX - r, subCY - r, subCX + r, subCY + r], outline=(220, 50, 50, 70), width=2)

    # Submarine silhouette
    # Draw sub hull
    draw.ellipse([subCX - 90, subCY - 30, subCX + 90, subCY + 30], fill=(45, 68, 88), outline=(95, 140, 175), width=3)
    # Conning tower
    draw.rectangle([subCX - 25, subCY - 55, subCX + 20, subCY - 25], fill=(45, 68, 88), outline=(95, 140, 175), width=3)
    # Viewport glow
    draw.ellipse([subCX + 55, subCY - 12, subCX + 80, subCY + 12], fill=(120, 240, 210), outline=(255, 255, 255), width=2)
    # Searchlight cone cutting through abyss
    cone = [(subCX + 75, subCY), (subCX + 420, subCY - 80), (subCX + 450, subCY + 160)]
    draw.polygon(cone, fill=(40, 100, 120, 50))

    # Lurking Abyssal Leviathan Silhouette rising from the depths
    beastY = artY + 540
    # Monster eyes glowing
    draw.ellipse([subCX - 160, beastY, subCX - 130, beastY + 22], fill=(255, 45, 45, 255))
    draw.ellipse([subCX - 80, beastY + 5, subCX - 50, beastY + 27], fill=(255, 45, 45, 255))
    draw.text((subCX - 110, beastY - 24), "ENTIDADE ACÚSTICA RASTREADORA", fill=(255, 60, 60), font=get_font("mono", 14, bold=True), anchor="mm")

    # OFFICIAL NAVAL SQUADRON CREST (TERMINAL.PNG IN GOLD)
    crestCX = padX + 220
    crestCY = artY + 490
    crestR = 150
    draw.ellipse([crestCX - crestR, crestCY - crestR, crestCX + crestR, crestCY + crestR], fill=(10, 22, 32, 245), outline=(215, 155, 25, 255), width=5)
    draw.ellipse([crestCX - crestR + 10, crestCY - crestR + 10, crestCX + crestR - 10, crestCY + crestR - 10], outline=(170, 120, 20, 255), width=2)

    # Stencil around crest
    f_badge = get_font("mono", 13, bold=True)
    draw.text((crestCX, crestCY - crestR + 24), "★ 1ª DIVISÃO DE MERGULHO ★", fill=(235, 175, 30), font=f_badge, anchor="mm")
    draw.text((crestCX, crestCY + crestR - 24), "\"IN SILENTIO VINCIMUS\"", fill=(215, 160, 30), font=f_badge, anchor="mm")

    # Load and tint terminal.png
    if os.path.exists("static/terminal.png"):
        raw_logo = Image.open("static/terminal.png").convert("RGBA")
        gold_logo = tint_image(raw_logo, (235, 175, 30))
        gold_logo = gold_logo.resize((190, 190), Image.Resampling.LANCZOS)
        poster.paste(gold_logo, (crestCX - 95, crestCY - 90), gold_logo)

    # Art Caption
    f_art_cap = get_font("mono", 16, bold=True)
    draw.rectangle([padX + 20, artY + artH - 46, padX + mainW - 20, artY + artH - 12], fill=(18, 30, 42, 230))
    draw.text((W // 2, artY + artH - 29), "RADAR HIDROACÚSTICO // DETECÇÃO DE PULSOS ACIMA DO LIMIAR NA COTA -10.000M", fill=(200, 225, 245), font=f_art_cap, anchor="mm")

    # HISTORICAL DISPATCH / NAVAL INCIDENT (Y: 1040 to 1480)
    dispY = 1040
    dispH = 450
    draw.rectangle([padX, dispY, padX + mainW, dispY + dispH], fill=(12, 20, 28, 255), outline=(45, 75, 105, 255), width=3)

    # Dispatch Header
    draw.rectangle([padX, dispY, padX + mainW, dispY + 46], fill=(24, 40, 56, 255))
    f_disp_h = get_font("sans", 22, bold=True)
    draw.text((padX + 24, dispY + 23), "RELATÓRIO HISTÓRICO // INCIDENTE DO SUBMARINO TARTARUS-III (ANO 1981)", fill=(245, 215, 120), font=f_disp_h, anchor="lm")

    # Dispatch Body Text
    f_body = get_font("mono", 17, bold=True)
    f_body_reg = get_font("mono", 17, bold=False)
    lines = [
        ("LOCAL:", " Fossa das Marianas, Setor de Falha Abissal Tartarus (Cota -9.420m)."),
        ("HORÁRIO:", " 03:42h UTC. Telemetria e dados hidroacústicos ativos."),
        ("OCORRÊNCIA:", " A tripulação transmitiu relatório de rotina utilizando código ASCII clássico."),
        ("IMPACTO:", " Foram 18 caracteres enviados em 8 bits fixos = 144 pulsos mecânicos contínuos."),
        ("", " As ondas acústicas ecoaram nas fendas basálticas por mais de 14 quilômetros."),
        ("RESPOSTA:", " Às 03:45h, o sensor passivo captou aproximação biológica súbita a 68 nós."),
        ("DESFECHO:", " Contato de rádio rompido em 40 segundos. O casco sucumbiu à pressão após"),
        ("", " abalroamento com ápice predatório atraído pela cadência desnecessária de pulsos."),
        ("", " NENHUM SOBREVIVENTE FOI RESGATADO.")
    ]
    curY = dispY + 75
    for label, text in lines:
        if label:
            draw.text((padX + 30, curY), label, fill=(235, 80, 80), font=f_body)
            draw.text((padX + 175, curY), text, fill=(225, 235, 245), font=f_body_reg)
        else:
            draw.text((padX + 30, curY), text, fill=(225, 235, 245), font=f_body_reg)
        curY += 34

    # Red Rubber Stamp: ULTRASECRETO // MARINHA DE GUERRA
    # Create rotated stamp
    stamp_img = Image.new('RGBA', (460, 110), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(stamp_img)
    s_draw.rectangle([8, 8, 450, 100], outline=(200, 35, 35, 220), width=5)
    s_draw.text((230, 40), "CLASSIFICAÇÃO ÔMEGA", fill=(210, 40, 40, 230), font=get_font("sans", 24, bold=True), anchor="mm")
    s_draw.text((230, 75), "DIRETRIZ DE SEGURANÇA NACIONAL", fill=(210, 40, 40, 230), font=get_font("mono", 14, bold=True), anchor="mm")
    stamp_rot = stamp_img.rotate(12, resample=Image.Resampling.BICUBIC, expand=True)
    poster.paste(stamp_rot, (padX + mainW - 460, dispY + dispH - 150), stamp_rot)

    # FINAL NAVAL DIRECTIVE (Y: 1515 to 1720)
    dirY = 1515
    dirH = 195
    draw.rectangle([padX, dirY, padX + mainW, dirY + dirH], fill=(16, 26, 18, 255), outline=(40, 160, 90, 255), width=3)
    draw.rectangle([padX, dirY, padX + mainW, dirY + 40], fill=(24, 110, 60, 255))
    draw.text((W // 2, dirY + 20), "ORDEM GERAL DE OPERAÇÕES // DIRETRIZ HUFFMAN MANDATÓRIA", fill=(255, 255, 255), font=get_font("sans", 20, bold=True), anchor="mm")

    f_dir_txt = get_font("mono", 17, bold=True)
    draw.text((W // 2, dirY + 70), "NENHUMA MENSAGEM DEVE SER DISPARADA SEM COMPRESSÃO GULOSA!", fill=(110, 240, 160), font=f_dir_txt, anchor="mm")
    draw.text((W // 2, dirY + 105), "Caracteres frequentes recebem códigos mínimos. Reduza em até 80% o ruído acústico.", fill=(225, 245, 235), font=get_font("mono", 16, bold=False), anchor="mm")
    draw.text((W // 2, dirY + 140), "A matemática de Huffman é a espessura do seu casco.", fill=(250, 220, 100), font=f_dir_txt, anchor="mm")

    # FOOTER BAR
    footY = 1735
    footH = 145
    draw.rectangle([padX, footY, padX + mainW, footY + footH], fill=(6, 12, 18, 255), outline=(30, 50, 70, 255), width=2)

    # Mini fish logo in footer
    if os.path.exists("static/terminal.png"):
        raw_logo = Image.open("static/terminal.png").convert("RGBA")
        teal_logo = tint_image(raw_logo, (0, 255, 180))
        teal_logo = teal_logo.resize((100, 100), Image.Resampling.LANCZOS)
        poster.paste(teal_logo, (padX + 24, footY + 22), teal_logo)

    f_foot1 = get_font("mono", 15, bold=True)
    f_foot2 = get_font("mono", 13, bold=False)
    draw.text((padX + 145, footY + 40), "ESTAÇÃO SUBMARINA TARTARUS-V // SETOR HIDROACÚSTICO ABISSAL", fill=(140, 180, 210), font=f_foot1)
    draw.text((padX + 145, footY + 70), "Consulte o Caderno de Huffman no Armário de Emergência [H] para a teoria algorítmica.", fill=(235, 185, 40), font=f_foot2)
    draw.text((padX + 145, footY + 98), "DOCUMENTO NAVAL DESCLASSIFICADO // USO EXCLUSIVO DO OFICIAL DE COMUNICAÇÕES", fill=(90, 130, 160), font=f_foot2)

    draw.text((padX + mainW - 25, footY + footH - 25), "[ PRESSIONE P OU ESC PARA FECHAR ]", fill=(0, 255, 180), font=get_font("mono", 16, bold=True), anchor="rm")

    out_path = "/home/eduardolm/.gemini/antigravity/brain/6a6f6a8a-b947-46d1-a541-ad2888094198/poster_prototype.png"
    poster.convert("RGB").save(out_path)
    print("Saved poster to:", out_path)

render_lore_poster()
