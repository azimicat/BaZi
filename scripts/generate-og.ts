import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

// 既存の草花の図版から共有用画像を作る。配信やビルド時の画像生成は不要。
const botanical: string = readFileSync(new URL('../public/botanical.svg', import.meta.url), 'utf8')
  .replace('<svg ', '<svg x="690" y="15" width="450" height="600" ');
const svg: string = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#faf7f1"/>
  <rect x="665" y="24" width="510" height="582" fill="#ecd9d6"/>
  <path d="M725 556V267a195 195 0 0 1 390 0v289Z" fill="none" stroke="#b7998b" stroke-opacity=".55"/>
  ${botanical}
  <g fill="#49443d" font-family="Hiragino Mincho ProN, Yu Mincho, serif">
    <text x="75" y="99" font-size="33" letter-spacing="5">四季の命式</text>
    <text x="75" y="254" font-size="59" letter-spacing="3">あなたの中に</text>
    <text x="75" y="342" font-size="59" letter-spacing="3">めぐる季節。</text>
    <text x="78" y="432" font-size="25" letter-spacing="2">生まれた日からあなたを知る。</text>
    <text x="78" y="479" font-size="22" letter-spacing="1">性格、仕事、恋愛、これからの運勢。</text>
  </g>
  <g fill="#926d6b" font-family="Georgia, serif">
    <text x="78" y="132" font-size="12" letter-spacing="3">SHIKI NO MEISHIKI</text>
    <text x="78" y="552" font-size="14" letter-spacing="3">THE SEASONS WITHIN YOU</text>
  </g>
  <path d="M78 573H578" stroke="#c7b8a7"/>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(new URL('../public/og-image.png', import.meta.url)));
console.log('共有用の画像を生成しました（1200 × 630）。');
