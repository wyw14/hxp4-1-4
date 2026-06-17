import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

type GameMode = 'normal' | 'mirror';

interface ScoreData {
  normal: number;
  mirror: number;
}

const app = express();
const PORT = 42004;
const DATA_FILE = path.join(process.cwd(), 'server', 'data', 'scores.json');

app.use(cors());
app.use(express.json());

const readScoreData = (): ScoreData => {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
};

const writeScoreData = (data: ScoreData): void => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
};

const isValidMode = (mode: string): mode is GameMode => {
  return mode === 'normal' || mode === 'mirror';
};

app.get('/api/highscore', (req, res) => {
  try {
    const mode = (req.query.mode as string) || 'normal';
    if (!isValidMode(mode)) {
      return res.status(400).json({ error: '无效的模式' });
    }
    const data = readScoreData();
    res.json({ highScore: data[mode], mode });
  } catch (error) {
    res.status(500).json({ error: '读取分数失败' });
  }
});

app.get('/api/highscores', (_req, res) => {
  try {
    const data = readScoreData();
    res.json({ normal: data.normal, mirror: data.mirror });
  } catch (error) {
    res.status(500).json({ error: '读取分数失败' });
  }
});

app.post('/api/highscore', (req, res) => {
  try {
    const { score, mode } = req.body as { score?: number; mode?: string };

    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ error: '无效的分数' });
    }

    const gameMode = mode && isValidMode(mode) ? mode : 'normal';
    const data = readScoreData();
    
    if (score > data[gameMode]) {
      data[gameMode] = score;
      writeScoreData(data);
      res.json({ highScore: data[gameMode], isNewRecord: true, mode: gameMode });
    } else {
      res.json({ highScore: data[gameMode], isNewRecord: false, mode: gameMode });
    }
  } catch (error) {
    res.status(500).json({ error: '保存分数失败' });
  }
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
