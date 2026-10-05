import os
import math
from PIL import Image, ImageDraw, ImageFont

def get_font(size, bold=False):
    p = f"/usr/share/fonts/TTF/{'DejaVuSans-Bold' if bold else 'DejaVuSans'}.ttf"
    if os.path.exists(p):
        return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def tint_image(img, rgb_color):
    r, g, b, a = img.split()
    solid = Image.new('RGB', img.size, rgb_color)
    sr, sg, sb = solid.split()
    return Image.merge('RGBA', (sr, sg, sb, a))

def render_poster_v3():
    W, H = 1500, 1962
    poster = Image.new('RGBA', (W, H), (6, 12, 18, 255))
    draw = ImageDraw.Draw(poster)

    # 1. Background gradient
    cx, cy = W // 2, int(H * 0.38)
    for y in range(H):
        d = abs(y - cy) / (H * 0.7)
        r = int(18 * (1 - d * 0.7))
        g = int(30 * (1 - d * 0.7))
        b = int(46 * (1 - d * 0.7))
        draw.line([0, y, W, y], fill=(r, g, b, 255))

    # Outer Industrial Weathered Frame
    draw.rectangle([14, 14, W - 14, H - 14], outline=(32, 52, 72, 255), width=14)
    draw.rectangle([24, 24, W - 24, H - 24], outline=(190, 35, 35, 255), width=4)

    # Hazard Stripes top and bottom
    for x in range(30, W - 30, 48):
        draw.polygon([(x, 30), (x + 24, 30), (x, 52), (x - 24, 52)], fill=(230, 170, 20, 255))
        draw.polygon([(x, H - 52), (x + 24, H - 52), (x, H - 30), (x - 24, H - 30)], fill=(230, 170, 20, 255))

    padX = 54
    mainW = W - padX * 2

    # TOP BANNER
    draw.rectangle([padX, 64, padX + mainW, 102], fill=(160, 25, 25, 255))
    draw.text((W // 2, 83), "★ DEPARTAMENTO DE GUERRA SUBMARINA // BASE BENTÔNICA TARTARUS ★", fill=(255, 255, 255), font=get_font(18, bold=True), anchor="mm")

    # PRIMARY SLOGAN (VINTAGE PROPAGANDA)
    draw.text((W // 2, 168), "PULSOS LIVRES AFUNDAM CASCOS!", fill=(255, 255, 255), font=get_font(68, bold=True), anchor="mm")
    draw.text((W // 2, 222), "O ABISSO NÃO PERDOA O ECO // O SILÊNCIO É NOSSA ÚNICA BLINDAGEM", fill=(240, 180, 25), font=get_font(23, bold=True), anchor="mm")

    # CENTRAL TRENCH & ART WINDOW (Y: 255 to 1010)
    artY = 255
    artH = 750

    # Draw ocean viewport with clipping
    art_img = Image.new('RGBA', (mainW, artH), (4, 8, 14, 255))
    art_draw = ImageDraw.Draw(art_img)

    # Depth gradient in ocean
    for y in range(artH):
        frac = y / artH
        r = int(12 * (1 - frac) + 2 * frac)
        g = int(28 * (1 - frac) + 5 * frac)
        b = int(48 * (1 - frac) + 10 * frac)
        art_draw.line([0, y, mainW, y], fill=(r, g, b, 255))

    # Trench crags (rocky cliffs on left and right)
    left_cliff = [(0, 0), (90, 0), (140, 180), (80, 360), (130, 520), (160, artH), (0, artH)]
    art_draw.polygon(left_cliff, fill=(18, 25, 32))
    right_cliff = [(mainW, 0), (mainW - 90, 0), (mainW - 130, 200), (mainW - 70, 420), (mainW - 150, 600), (mainW - 140, artH), (mainW, artH)]
    art_draw.polygon(right_cliff, fill=(18, 25, 32))

    # Depth scale markings on left cliff
    depths = [
        (0.12, "0m - SUPERFÍCIE"),
        (0.38, "-3.000m - ZONA BATIAL"),
        (0.68, "-7.000m - ZONA ABISSAL"),
        (0.92, "-10.920m - FOSSA TARTARUS")
    ]
    for frac, label in depths:
        ly = int(artH * frac)
        art_draw.line([15, ly, 160, ly], fill=(50, 85, 120, 255), width=2)
        art_draw.text((170, ly), label, fill=(140, 185, 220), font=get_font(14, bold=True), anchor="lm")

    # Submarine and sonar rings
    subCX = int(mainW * 0.58)
    subCY = int(artH * 0.38)

    for r in [80, 160, 250, 350, 460]:
        art_draw.ellipse([subCX - r, subCY - r, subCX + r, subCY + r], outline=(220, 45, 45, 75), width=2)

    # Searchlight cone cutting through abyss
    cone = [(subCX + 75, subCY), (subCX + 380, subCY - 70), (subCX + 400, subCY + 150)]
    art_draw.polygon(cone, fill=(40, 130, 150, 70))

    # Submarine silhouette
    art_draw.ellipse([subCX - 90, subCY - 28, subCX + 90, subCY + 28], fill=(42, 68, 88), outline=(95, 145, 180), width=3)
    art_draw.rectangle([subCX - 25, subCY - 52, subCX + 20, subCY - 25], fill=(42, 68, 88), outline=(95, 145, 180), width=3)
    art_draw.ellipse([subCX + 55, subCY - 12, subCX + 78, subCY + 12], fill=(120, 245, 215), outline=(255, 255, 255), width=2)
    art_draw.text((subCX, subCY + 45), "SUBMARINO TARTARUS-V", fill=(140, 190, 230), font=get_font(13, bold=True), anchor="mm")

    # Lurking Abyssal Leviathan Silhouette rising from the depths
    beastY = int(artH * 0.76)
    beastCX = int(mainW * 0.58)
    # Giant dark spiny back silhouette
    beast_pts = [
        (beastCX - 220, artH), (beastCX - 180, beastY + 40), (beastCX - 150, beastY),
        (beastCX - 120, beastY + 30), (beastCX - 80, beastY - 15), (beastCX - 30, beastY + 25),
        (beastCX + 40, beastY - 10), (beastCX + 100, beastY + 35), (beastCX + 180, beastY + 50), (beastCX + 240, artH)
    ]
    art_draw.polygon(beast_pts, fill=(12, 18, 24))
    # Glowing creature eyes
    art_draw.ellipse([beastCX - 95, beastY + 10, beastCX - 75, beastY + 28], fill=(255, 45, 45, 255))
    art_draw.ellipse([beastCX - 35, beastY + 12, beastCX - 15, beastY + 30], fill=(255, 45, 45, 255))
    art_draw.text((beastCX - 55, beastY - 28), "LEVIATÃ ACÚSTICO // CAÇADOR DE PULSOS", fill=(255, 60, 60), font=get_font(14, bold=True), anchor="mm")
    art_draw.text((beastCX - 55, beastY + 55), "ATRAÍDO POR TRANSMISSÕES NÃO-COMPRIMIDAS", fill=(240, 160, 40), font=get_font(12, bold=True), anchor="mm")

    # OFFICIAL NAVAL SQUADRON CREST (TERMINAL.PNG IN GOLD)
    # Placed neatly on the top-left area of the art window
    crestCX = 220
    crestCY = 150
    crestR = 110
    art_draw.ellipse([crestCX - crestR, crestCY - crestR, crestCX + crestR, crestCY + crestR], fill=(12, 24, 36, 245), outline=(215, 155, 25, 255), width=4)
    art_draw.ellipse([crestCX - crestR + 8, crestCY - crestR + 8, crestCX + crestR - 8, crestCY + crestR - 8], outline=(170, 120, 20, 255), width=2)

    art_draw.text((crestCX, crestCY - crestR + 18), "★ 1ª DIV. MERGULHO ★", fill=(235, 175, 30), font=get_font(11, bold=True), anchor="mm")
    art_draw.text((crestCX, crestCY + crestR - 18), "\"IN SILENTIO VINCIMUS\"", fill=(215, 160, 30), font=get_font(11, bold=True), anchor="mm")

    if os.path.exists("static/terminal.png"):
        raw_logo = Image.open("static/terminal.png").convert("RGBA")
        gold_logo = tint_image(raw_logo, (235, 175, 30))
        gold_logo = gold_logo.resize((135, 135), Image.Resampling.LANCZOS)
        art_img.paste(gold_logo, (crestCX - 67, crestCY - 65), gold_logo)

    # Caption bar inside art box
    art_draw.rectangle([10, artH - 38, mainW - 10, artH - 6], fill=(16, 28, 38, 240))
    art_draw.text((mainW // 2, artH - 22), "TELEMETRIA HIDROACÚSTICA // ONDAS SONORAS NÃO COMPRIMIDAS ECOAM POR 14 KM NA FOSSA", fill=(180, 215, 240), font=get_font(14, bold=True), anchor="mm")

    # Paste art image into poster
    poster.paste(art_img, (padX, artY))
    draw.rectangle([padX, artY, padX + mainW, artY + artH], outline=(35, 65, 95, 255), width=3)

    # HISTORICAL DISPATCH / NAVAL INCIDENT (Y: 1030 to 1480)
    dispY = 1030
    dispH = 450
    draw.rectangle([padX, dispY, padX + mainW, dispY + dispH], fill=(12, 20, 28, 255), outline=(45, 75, 105, 255), width=3)

    # Header
    draw.rectangle([padX, dispY, padX + mainW, dispY + 44], fill=(24, 40, 56, 255))
    draw.text((padX + 24, dispY + 22), "RELATÓRIO HISTÓRICO // INCIDENTE DO SUBMARINO TARTARUS-III (ANO 1981)", fill=(245, 215, 120), font=get_font(20, bold=True), anchor="lm")

    # Lines
    lines = [
        ("LOCAL:", "Fossa das Marianas, Setor de Falha Abissal Tartarus (Cota -9.420m)."),
        ("HORÁRIO:", "03:42h UTC. Telemetria e sensores passivos de escuta ativos."),
        ("OCORRÊNCIA:", "A tripulação transmitiu relatório de rotina utilizando código ASCII padrão (8-bit)."),
        ("IMPACTO:", "Foram 18 caracteres enviados em 8 bits fixos = 144 pulsos acústicos mecânicos contínuos."),
        ("", "O ruído sonoro ecoou pelas paredes basálticas da fossa por mais de 14 quilômetros."),
        ("RESPOSTA:", "Às 03:45h, o sonar captou aproximação hidrodinâmica violenta a 68 nós de velocidade."),
        ("DESFECHO:", "Contato rompido em 40 segundos. O casco implodiu após colisão biológica direta."),
        ("", "NENHUM SOBREVIVENTE FOI RESGATADO.")
    ]
    curY = dispY + 70
    for label, text in lines:
        if label:
            draw.text((padX + 30, curY), label, fill=(235, 75, 75), font=get_font(16, bold=True))
            draw.text((padX + 175, curY), text, fill=(225, 235, 245), font=get_font(16, bold=False))
        else:
            draw.text((padX + 30, curY), text, fill=(225, 235, 245), font=get_font(16, bold=False))
        curY += 36

    # Red Rubber Stamp: CLASSIFICAÇÃO ÔMEGA
    stamp_img = Image.new('RGBA', (460, 110), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(stamp_img)
    s_draw.rectangle([8, 8, 450, 100], outline=(210, 35, 35, 230), width=5)
    s_draw.text((230, 38), "CLASSIFICAÇÃO ÔMEGA", fill=(220, 40, 40, 230), font=get_font(23, bold=True), anchor="mm")
    s_draw.text((230, 75), "DIRETRIZ DE SEGURANÇA NACIONAL // 1981", fill=(220, 40, 40, 230), font=get_font(13, bold=True), anchor="mm")
    stamp_rot = stamp_img.rotate(10, resample=Image.Resampling.BICUBIC, expand=True)
    poster.paste(stamp_rot, (padX + mainW - 470, dispY + dispH - 160), stamp_rot)

    # MANDATORY DIRECTIVE (Y: 1500 to 1710)
    dirY = 1500
    dirH = 195
    draw.rectangle([padX, dirY, padX + mainW, dirY + dirH], fill=(16, 26, 20, 255), outline=(40, 160, 90, 255), width=3)
    draw.rectangle([padX, dirY, padX + mainW, dirY + 40], fill=(22, 105, 58, 255))
    draw.text((W // 2, dirY + 20), "ORDEM GERAL DE OPERAÇÕES // DIRETRIZ HUFFMAN MANDATÓRIA", fill=(255, 255, 255), font=get_font(18, bold=True), anchor="mm")

    draw.text((W // 2, dirY + 70), "NENHUMA MENSAGEM DEVE SER DISPARADA SEM COMPRESSÃO GULOSA!", fill=(110, 240, 160), font=get_font(17, bold=True), anchor="mm")
    draw.text((W // 2, dirY + 105), "Caracteres frequentes recebem códigos mínimos. Reduza em até 80% o ruído acústico.", fill=(220, 245, 230), font=get_font(15, bold=False), anchor="mm")
    draw.text((W // 2, dirY + 140), "A matemática de Huffman é a espessura do seu casco.", fill=(250, 220, 100), font=get_font(17, bold=True), anchor="mm")

    # FOOTER BAR (Y: 1720 to 1870)
    footY = 1720
    footH = 150
    draw.rectangle([padX, footY, padX + mainW, footY + footH], fill=(6, 12, 18, 255), outline=(30, 50, 70, 255), width=2)

    if os.path.exists("static/terminal.png"):
        raw_logo = Image.open("static/terminal.png").convert("RGBA")
        teal_logo = tint_image(raw_logo, (0, 255, 180))
        teal_logo = teal_logo.resize((100, 100), Image.Resampling.LANCZOS)
        poster.paste(teal_logo, (padX + 24, footY + 25), teal_logo)

    draw.text((padX + 145, footY + 40), "ESTAÇÃO SUBMARINA TARTARUS-V // SETOR HIDROACÚSTICO ABISSAL", fill=(140, 180, 210), font=get_font(15, bold=True))
    draw.text((padX + 145, footY + 70), "Consulte o Caderno de Huffman no Armário de Emergência [H] para a teoria algorítmica.", fill=(235, 185, 40), font=get_font(13, bold=False))
    draw.text((padX + 145, footY + 98), "DOCUMENTO NAVAL DESCLASSIFICADO // USO EXCLUSIVO DO OFICIAL DE COMUNICAÇÕES", fill=(90, 130, 160), font=get_font(12, bold=False))

    draw.text((padX + mainW - 25, footY + footH - 25), "[ PRESSIONE P OU ESC PARA FECHAR ]", fill=(0, 255, 180), font=get_font(15, bold=True), anchor="rm")

    out_path = "/home/eduardolm/.gemini/antigravity/brain/6a6f6a8a-b947-46d1-a541-ad2888094198/poster_prototype_v3.png"
    poster.convert("RGB").save(out_path)
    print("Saved poster v3 to:", out_path)

render_poster_v3()
