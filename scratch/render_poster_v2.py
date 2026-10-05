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

def render_poster_v2():
    W, H = 1500, 1962
    poster = Image.new('RGBA', (W, H), (6, 12, 18, 255))
    draw = ImageDraw.Draw(poster)

    # 1. Background radial gradient
    cx, cy = W // 2, int(H * 0.38)
    for y in range(H):
        d = abs(y - cy) / (H * 0.7)
        r = int(18 * (1 - d * 0.7))
        g = int(32 * (1 - d * 0.7))
        b = int(48 * (1 - d * 0.7))
        draw.line([0, y, W, y], fill=(r, g, b, 255))

    # Outer Industrial Weathered Frame
    draw.rectangle([14, 14, W - 14, H - 14], outline=(32, 52, 72, 255), width=14)
    draw.rectangle([24, 24, W - 24, H - 24], outline=(190, 35, 35, 255), width=4)

    # Hazard Stripes top and bottom
    for x in range(30, W - 30, 48):
        # Top
        draw.polygon([(x, 30), (x + 24, 30), (x, 52), (x - 24, 52)], fill=(230, 170, 20, 255))
        # Bottom
        draw.polygon([(x, H - 52), (x + 24, H - 52), (x, H - 30), (x - 24, H - 30)], fill=(230, 170, 20, 255))

    padX = 54
    mainW = W - padX * 2

    # TOP MILITARY BANNER
    draw.rectangle([padX, 64, padX + mainW, 102], fill=(160, 25, 25, 255))
    draw.text((W // 2, 83), "★ DEPARTAMENTO DE GUERRA SUBMARINA // BASE BENTÔNICA TARTARUS ★", fill=(255, 255, 255), font=get_font(18, bold=True), anchor="mm")

    # PRIMARY SLOGAN (VINTAGE PROPAGANDA)
    draw.text((W // 2, 168), "PULSOS LIVRES AFUNDAM CASCOS!", fill=(255, 255, 255), font=get_font(68, bold=True), anchor="mm")
    draw.text((W // 2, 222), "O ABISSO NÃO PERDOA O ECO // O SILÊNCIO É NOSSA ÚNICA BLINDAGEM", fill=(240, 180, 25), font=get_font(23, bold=True), anchor="mm")

    # CENTRAL TRENCH & LEVIATHAN ART (Y: 255 to 1030)
    artY = 255
    artH = 760
    draw.rectangle([padX, artY, padX + mainW, artY + artH], fill=(4, 8, 14, 255), outline=(35, 65, 95, 255), width=3)

    # Ocean depth scale on the left
    depths = [
        (0.08, "0m - SUPERFÍCIE (LUZ SOLAR)"),
        (0.32, "-3.000m - ZONA BATIAL (CREPÚSCULO)"),
        (0.60, "-7.000m - ZONA ABISSAL (ESCURIDÃO TOTAL)"),
        (0.88, "-10.920m - FOSSA TARTARUS (PRESSÃO: 1.100 ATM)")
    ]
    for frac, label in depths:
        ly = artY + int(artH * frac)
        draw.line([padX + 20, ly, padX + 220, ly], fill=(45, 80, 115, 255), width=2)
        draw.text((padX + 230, ly), label, fill=(120, 165, 200), font=get_font(15, bold=True), anchor="lm")

    # Sonar pulse rings from submarine
    subCX = W // 2 + 150
    subCY = artY + 310

    for r in [90, 180, 280, 390, 500]:
        draw.ellipse([subCX - r, subCY - r, subCX + r, subCY + r], outline=(220, 45, 45, 75), width=2)

    # Searchlight cone cutting through abyss
    cone = [(subCX + 75, subCY), (subCX + 420, subCY - 80), (subCX + 440, subCY + 180)]
    draw.polygon(cone, fill=(40, 110, 130, 60))

    # Submarine silhouette
    draw.ellipse([subCX - 95, subCY - 30, subCX + 95, subCY + 30], fill=(40, 65, 85), outline=(90, 135, 170), width=3)
    draw.rectangle([subCX - 25, subCY - 55, subCX + 20, subCY - 25], fill=(40, 65, 85), outline=(90, 135, 170), width=3)
    draw.ellipse([subCX + 55, subCY - 12, subCX + 80, subCY + 12], fill=(120, 240, 210), outline=(255, 255, 255), width=2)
    draw.text((subCX, subCY + 45), "SUBMARINO TARTARUS-V", fill=(140, 190, 230), font=get_font(13, bold=True), anchor="mm")

    # Lurking Abyssal Leviathan Silhouette rising from the depths
    beastY = artY + 560
    draw.ellipse([subCX - 180, beastY, subCX - 150, beastY + 22], fill=(255, 40, 40, 255))
    draw.ellipse([subCX - 100, beastY + 4, subCX - 70, beastY + 26], fill=(255, 40, 40, 255))
    draw.text((subCX - 130, beastY - 24), "ENTIDADE ACÚSTICA RASTREADORA (LEVIATÃ)", fill=(255, 60, 60), font=get_font(14, bold=True), anchor="mm")
    draw.text((subCX - 130, beastY + 42), "ATRAÍDA POR PULSOS NÃO-COMPRIMIDOS (> 40 dB)", fill=(240, 160, 40), font=get_font(12, bold=True), anchor="mm")

    # OFFICIAL NAVAL SQUADRON CREST (TERMINAL.PNG IN GOLD)
    crestCX = padX + 230
    crestCY = artY + 490
    crestR = 150
    draw.ellipse([crestCX - crestR, crestCY - crestR, crestCX + crestR, crestCY + crestR], fill=(12, 24, 36, 245), outline=(215, 155, 25, 255), width=5)
    draw.ellipse([crestCX - crestR + 10, crestCY - crestR + 10, crestCX + crestR - 10, crestCY + crestR - 10], outline=(170, 120, 20, 255), width=2)

    draw.text((crestCX, crestCY - crestR + 25), "★ 1ª DIVISÃO DE MERGULHO ★", fill=(235, 175, 30), font=get_font(13, bold=True), anchor="mm")
    draw.text((crestCX, crestCY + crestR - 25), "\"IN SILENTIO VINCIMUS\"", fill=(215, 160, 30), font=get_font(13, bold=True), anchor="mm")

    if os.path.exists("static/terminal.png"):
        raw_logo = Image.open("static/terminal.png").convert("RGBA")
        gold_logo = tint_image(raw_logo, (235, 175, 30))
        gold_logo = gold_logo.resize((190, 190), Image.Resampling.LANCZOS)
        poster.paste(gold_logo, (crestCX - 95, crestCY - 90), gold_logo)

    # Caption of the art
    draw.rectangle([padX + 20, artY + artH - 42, padX + mainW - 20, artY + artH - 12], fill=(16, 28, 38, 240))
    draw.text((W // 2, artY + artH - 27), "TELEMETRIA HIDROACÚSTICA // ONDAS SONORAS NÃO COMPRIMIDAS ECOAM POR 14 KM NA FOSSA", fill=(180, 215, 240), font=get_font(14, bold=True), anchor="mm")

    # HISTORICAL DISPATCH / NAVAL INCIDENT (Y: 1045 to 1485)
    dispY = 1045
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

    # Red Rubber Stamp: ULTRASECRETO // MARINHA DE GUERRA
    stamp_img = Image.new('RGBA', (460, 110), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(stamp_img)
    s_draw.rectangle([8, 8, 450, 100], outline=(210, 35, 35, 230), width=5)
    s_draw.text((230, 38), "CLASSIFICAÇÃO ÔMEGA", fill=(220, 40, 40, 230), font=get_font(23, bold=True), anchor="mm")
    s_draw.text((230, 75), "DIRETRIZ DE SEGURANÇA NACIONAL // 1981", fill=(220, 40, 40, 230), font=get_font(13, bold=True), anchor="mm")
    stamp_rot = stamp_img.rotate(10, resample=Image.Resampling.BICUBIC, expand=True)
    poster.paste(stamp_rot, (padX + mainW - 470, dispY + dispH - 160), stamp_rot)

    # FINAL NAVAL DIRECTIVE (Y: 1515 to 1720)
    dirY = 1515
    dirH = 195
    draw.rectangle([padX, dirY, padX + mainW, dirY + dirH], fill=(16, 26, 20, 255), outline=(40, 160, 90, 255), width=3)
    draw.rectangle([padX, dirY, padX + mainW, dirY + 40], fill=(22, 105, 58, 255))
    draw.text((W // 2, dirY + 20), "ORDEM GERAL DE OPERAÇÕES // DIRETRIZ HUFFMAN MANDATÓRIA", fill=(255, 255, 255), font=get_font(18, bold=True), anchor="mm")

    draw.text((W // 2, dirY + 70), "NENHUMA MENSAGEM DEVE SER DISPARADA SEM COMPRESSÃO GULOSA!", fill=(110, 240, 160), font=get_font(17, bold=True), anchor="mm")
    draw.text((W // 2, dirY + 105), "Caracteres frequentes recebem códigos mínimos. Reduza em até 80% o ruído acústico.", fill=(220, 245, 230), font=get_font(15, bold=False), anchor="mm")
    draw.text((W // 2, dirY + 140), "A matemática de Huffman é a espessura do seu casco.", fill=(250, 220, 100), font=get_font(17, bold=True), anchor="mm")

    # FOOTER BAR
    footY = 1735
    footH = 145
    draw.rectangle([padX, footY, padX + mainW, footY + footH], fill=(6, 12, 18, 255), outline=(30, 50, 70, 255), width=2)

    if os.path.exists("static/terminal.png"):
        raw_logo = Image.open("static/terminal.png").convert("RGBA")
        teal_logo = tint_image(raw_logo, (0, 255, 180))
        teal_logo = teal_logo.resize((100, 100), Image.Resampling.LANCZOS)
        poster.paste(teal_logo, (padX + 24, footY + 22), teal_logo)

    draw.text((padX + 145, footY + 38), "ESTAÇÃO SUBMARINA TARTARUS-V // SETOR HIDROACÚSTICO ABISSAL", fill=(140, 180, 210), font=get_font(15, bold=True))
    draw.text((padX + 145, footY + 68), "Consulte o Caderno de Huffman no Armário de Emergência [H] para a teoria algorítmica.", fill=(235, 185, 40), font=get_font(13, bold=False))
    draw.text((padX + 145, footY + 96), "DOCUMENTO NAVAL DESCLASSIFICADO // USO EXCLUSIVO DO OFICIAL DE COMUNICAÇÕES", fill=(90, 130, 160), font=get_font(12, bold=False))

    draw.text((padX + mainW - 25, footY + footH - 25), "[ PRESSIONE P OU ESC PARA FECHAR ]", fill=(0, 255, 180), font=get_font(15, bold=True), anchor="rm")

    out_path = "/home/eduardolm/.gemini/antigravity/brain/6a6f6a8a-b947-46d1-a541-ad2888094198/poster_prototype_v2.png"
    poster.convert("RGB").save(out_path)
    print("Saved poster v2 to:", out_path)

render_poster_v2()
