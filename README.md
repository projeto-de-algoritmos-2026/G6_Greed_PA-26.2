<div align="center">
  <img src="./SONAR%20WAVE.png" alt="SONAR WAVE - Subwave" width="100%" style="max-width: 860px; border-radius: 6px;" />
</div>

<br/>

# SUBWAVE // Terror Abissal e Algoritmo de Huffman

> **Protótipo Jogável 3D & Terror Analógico a 8.000m de Profundidade**  
> Desenvolvido com **SvelteKit 2 + Svelte 5 (Runes)**, **Three.js**, **GLSL Shaders**, **Web Audio API** e o **Algoritmo Guloso de Huffman**.

---

## 🎮 Conceito e Ambientação

Você opera o console retrô de fósforo monocromático na estação submarina de pesquisa **Tartarus**, localizada a 8.000m de profundidade na fenda abissal. O casco está sob colapso iminente devido à pressão externa violenta (800+ ATM).

Uma **entidade abissal cega** caça por ecolocalização através das vibrações acústicas na água. Cada pulso sonoro transmitido pelo sonar gera um ping que a criatura rastreia.

* **O Conflito:** Transmitir a mensagem bruta em código ASCII de 8 bits gera uma quantidade fatal de decibéis e ruído contínuo, atraindo a criatura antes do sinal ser concluído.
* **A Mecânica de Sobrevivência:** O operador deve construir manualmente a árvore de prefixos binários ótima através da **Codificação Gulosa de Huffman**, minimizando matematicamente o total de bits transmitidos e salvando a tripulação.

---

## 🧠 Teoria e Algoritmo Guloso (Huffman Engine)

O motor do jogo está implementado em [`src/lib/engine/huffman.ts`](./src/lib/engine/huffman.ts) e baseia-se nos princípios do algoritmo guloso de David Huffman (1952):

### 1. Propriedade da Escolha Gulosa (Greedy Choice Property)
A cada iteração, os dois nós com as **menores frequências acumuladas** do conjunto são selecionados e combinados através de uma Min-Heap/Priority Queue. Está matematicamente provado que existe uma árvore de prefixos ótima em que os dois caracteres menos frequentes são folhas irmãs na maior profundidade da árvore.

### 2. Subestrutura Ótima (Optimal Substructure)
Substituir os dois nós de menor frequência por um nó pai com peso somado $\text{freq}_A + \text{freq}_B$ reduz o problema de tamanho $n$ para um subproblema idêntico de tamanho $n-1$. A solução ótima desse subproblema induz a solução ótima do problema completo.

### 3. Custo Ponderado Mínimo
O objetivo do jogador é minimizar o comprimento externo ponderado da árvore:
$$\text{Custo Total em Bits} = \sum_{i=1}^{k} (\text{frequência}_i \times \text{profundidade}_i)$$

* **Eficiência do Jogador:**
$$\text{Eficiência} = \left(\frac{\text{Bits Ótimos}}{\text{Bits do Jogador}}\right) \times 100\%$$

---

## 🕹️ Controles e Interface

* **Seleção de Nós:** Clique diretamente nos nós flutuantes 3D dentro do monitor (via `THREE.Raycaster`) ou clique nos cartões da bandeja retrô na base da tela.
* **Fusão Gulosa:** `[Barra de Espaço]` ou botão **FUSÃO GULOSA** quando 2 nós estiverem selecionados.
* **Desfazer:** `[Tecla Z]` para reverter a última fusão (aplica penalidade de ruído no sonar).
* **Reiniciar Árvore:** `[Tecla R]` para resetar todas as folhas.
* **Disparar Transmissão:** `[Tecla Enter]` ao completar a árvore. Cada bit é emitido com um pulso de sonar em tempo real.
* **Reiniciar Terminais (Boot):** `[Tecla B]` ou botão `[ ↻ REINICIAR (B) ]` no Console B para acionar a sequência de boot analógica do Nautilus-OS.
* **Pular Boot:** Clique em qualquer um dos dois monitores ou pressione qualquer tecla durante a inicialização.
* **Controle de Som:** `[Tecla M]` para ativar/desativar mudo.

Durante a transmissão, a quantidade de ruído acumulado é comparada à cota segura
da fase. Árvores mais longas transmitem mais bits e podem provocar o colapso do
casco mesmo quando a transmissão não chega a 100% de proximidade acústica.

---

## 🌊 Fases da Campanha

A cada carregamento, a fase sorteia uma mensagem do seu conjunto, então a árvore
muda entre tentativas.

| Setor | Profundidade | Margem | Novidade |
|---|---|---|---|
| 01 · Abisso Inicial | 8.000m · 800 ATM | 50% | Mensagens curtas com símbolos repetidos |
| 02 · Zona Hadal | 9.500m · 950 ATM | 35% | Empates de frequência, silêncio e interrupções |
| 03 · Fossa das Marianas | 11.000m · 1.100 ATM | 25% | Frequências corrompidas (`??`) |
| 04 · Fenda Tartarus | 12.400m · 1.240 ATM | 18% | Alfabeto maior: números e pontuação |
| 05 · Núcleo Abissal | 13.900m · 1.390 ATM | 12% | Margem mínima e imitações frequentes |

* **Modo Transmissão Livre:** permite digitar qualquer mensagem arbitrária, gerando tabelas de frequência em tempo real.

### Mecânicas de tensão

* **Frequências corrompidas:** alguns pesos chegam como `??` (e também os dos nós que os contêm). Conte os símbolos na mensagem para deduzir o valor.
* **Árvores ótimas alternativas:** com empates, a árvore do jogador pode ter formato diferente da referência e o mesmo custo; a tela de vitória explica quando isso acontece.
* **Vazamento acelerado:** cada fusão que não junta os dois menores pesos aumenta o multiplicador de vazamento da fase.
* **A criatura reage aos erros:** o primeiro erro guloso faz a entidade bater no casco, o segundo a faz aparecer na escotilha e, a partir do terceiro, ela ataca.
* **Silêncio obrigatório:** quando o hidrofone detecta contato próximo, qualquer comando durante a contagem gera ruído.
* **Transmissão interrompida:** um impacto suspende o envio. `[Enter]` continua com ruído dobrado nos próximos bits; `[S]` segura o sinal por alguns segundos ao custo de dano permanente ao casco.
* **Dano persistente:** o estresse acústico de cada fase reduz a integridade do casco, acelera o vazamento nas fases seguintes e deixa rachaduras na escotilha. Recomeçar do Setor 01 restaura o casco.

### Decodificação e imitações

Após a transmissão, a superfície responde com um fluxo de bits e a árvore usada
para codificá-lo. Digite cada caractere encontrado percorrendo a árvore (0 =
esquerda, 1 = direita) ou clique na folha correspondente; erros geram ruído.

Ao final, julgue a resposta com `[A]` (autêntica) ou `[I]` (imitação). A
superfície sempre usa a árvore gulosa ótima; a entidade imita o sinal com uma
árvore em que uma folha frequente foi trocada com uma rara e profunda. Confiar
em uma imitação abre a escotilha.

### Sonificação

Bits `1` e `0` têm timbres diferentes e um sinal curto marca o fim de cada
símbolo, tanto na transmissão quanto na decodificação. A tela de transmissão
separa os grupos de bits e mostra o código do símbolo em envio.

A cota segura é calculada por `ceil(custo ótimo × (1 + margem da fase))`.
Se o custo da árvore montada ultrapassar esse limite, a transmissão termina em
colapso e exige uma nova tentativa.

---

## 🔊 Áudio Procedural (Web Audio API)

Não há arquivos `.mp3` ou `.wav` externos. Toda a paisagem sonora é gerada em tempo real em [`src/lib/audio/soundscape.ts`](./src/lib/audio/soundscape.ts):
* Drone abissal sub-grave (45-55Hz) com batimento binaural e brown noise filtrado.
* Pings de sonar com decaimento exponencial e eco reflexivo em delay line.
* Relés solenoide secos nos cliques de seleção.
* Gemidos metálicos no casco e colapso catastrófico por síntese aditiva e subtractiva.

---

## 🖥️ Gráficos e Shaders (Three.js & GLSL)

Implementado em [`src/lib/graphics/terminal3d.ts`](./src/lib/graphics/terminal3d.ts):
* Monitor CRT com gabinete metálico e vidro curvo deformado.
* Nós renderizados como poliedros wireframe brilhantes e etiquetas renderizadas em canvas 2D.
* Feixes de laser conectando nós pais e filhos com marcações dos ramos `0` e `1`.
* **Shader GLSL Post-Processing:**
  * Distorção esférica (barrel distortion).
  * Scanlines dinâmicas e linhas de varredura.
  * Aberração cromática ótica nas bordas.
  * Fosforescência e ruído estático de elétrons.
  * Camera shake dinâmico nos impactos e ruídos do casco.

---

## 🚀 Como Executar

```bash
# Instalar dependências (já instaladas no ambiente)
npm install

# Iniciar servidor de desenvolvimento Vite
npm run dev

# Checar integridade de tipos e diagnósticos
npm run check

# Compilar build de produção
npm run build
```
