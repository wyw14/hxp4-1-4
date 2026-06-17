type Color = 'red' | 'yellow' | 'blue' | 'green';
type GameMode = 'normal' | 'mirror';

const COLORS: Color[] = ['red', 'yellow', 'blue', 'green'];

const MIRROR_MAP: Record<Color, Color> = {
  red: 'green',
  green: 'red',
  yellow: 'blue',
  blue: 'yellow',
};

interface HighScoreResponse {
  highScore: number;
  isNewRecord?: boolean;
  mode?: GameMode;
}

interface AllHighScoresResponse {
  normal: number;
  mirror: number;
}

class ColorMemoryGame {
  private sequence: Color[] = [];
  private playerIndex: number = 0;
  private isPlaying: boolean = false;
  private isShowingSequence: boolean = false;
  private level: number = 0;
  private mode: GameMode = 'normal';
  private highScores: Record<GameMode, number> = { normal: 0, mirror: 0 };

  private readonly buttons: NodeListOf<HTMLButtonElement>;
  private readonly startBtn: HTMLButtonElement;
  private readonly currentLevelEl: HTMLElement;
  private readonly highScoreEl: HTMLElement;
  private readonly gameStatusEl: HTMLElement;
  private readonly modeButtons: NodeListOf<HTMLButtonElement>;
  private readonly rulesTitleEl: HTMLElement;
  private readonly rule2El: HTMLElement;
  private readonly mirrorHintEl: HTMLElement;

  private readonly lightOnDuration: number = 600;
  private readonly lightOffDuration: number = 300;

  constructor() {
    this.buttons = document.querySelectorAll('.color-btn');
    this.startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    this.currentLevelEl = document.getElementById('current-level') as HTMLElement;
    this.highScoreEl = document.getElementById('high-score') as HTMLElement;
    this.gameStatusEl = document.getElementById('game-status') as HTMLElement;
    this.modeButtons = document.querySelectorAll('.mode-btn');
    this.rulesTitleEl = document.getElementById('rules-title') as HTMLElement;
    this.rule2El = document.getElementById('rule-2') as HTMLElement;
    this.mirrorHintEl = document.getElementById('mirror-hint') as HTMLElement;

    this.init();
  }

  private async init(): Promise<void> {
    this.setupEventListeners();
    await this.fetchAllHighScores();
    this.updateHighScoreDisplay();
    this.updateRulesDisplay();
  }

  private setupEventListeners(): void {
    this.startBtn.addEventListener('click', () => this.startGame());

    this.buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const color = (e.target as HTMLButtonElement).dataset.color as Color;
        this.handlePlayerInput(color);
      });
    });

    this.modeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = (e.target as HTMLButtonElement).dataset.mode as GameMode;
        this.switchMode(mode);
      });
    });
  }

  private switchMode(mode: GameMode): void {
    if (this.isPlaying) return;
    this.mode = mode;

    this.modeButtons.forEach(btn => {
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.updateHighScoreDisplay();
    this.updateRulesDisplay();
    this.showStatus(
      mode === 'normal' ? '普通模式 - 点击开始按钮' : '镜像模式 - 点击开始按钮',
      ''
    );
  }

  private updateHighScoreDisplay(): void {
    this.highScoreEl.textContent = this.highScores[this.mode].toString();
  }

  private updateRulesDisplay(): void {
    if (this.mode === 'normal') {
      this.rulesTitleEl.textContent = '普通模式规则';
      this.rule2El.textContent = '2. 按相同顺序点击按钮';
      this.mirrorHintEl.classList.remove('visible');
    } else {
      this.rulesTitleEl.textContent = '镜像模式规则';
      this.rule2El.textContent = '2. 按中心对称位置点击按钮';
      this.mirrorHintEl.classList.add('visible');
    }
  }

  private async fetchAllHighScores(): Promise<void> {
    try {
      const response = await fetch('/api/highscores');
      const data = await response.json() as AllHighScoresResponse;
      this.highScores = { normal: data.normal, mirror: data.mirror };
    } catch (error) {
      console.error('获取最高分失败:', error);
    }
  }

  private async saveHighScore(score: number): Promise<void> {
    try {
      const response = await fetch('/api/highscore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ score, mode: this.mode }),
      });
      const data = await response.json() as HighScoreResponse;
      this.highScores[this.mode] = data.highScore;
      this.updateHighScoreDisplay();

      if (data.isNewRecord) {
        this.showStatus('🎉 新纪录！', 'success');
      }
    } catch (error) {
      console.error('保存最高分失败:', error);
    }
  }

  private startGame(): void {
    this.sequence = [];
    this.playerIndex = 0;
    this.level = 0;
    this.isPlaying = true;
    this.currentLevelEl.textContent = '0';

    this.setButtonsDisabled(true);
    this.startBtn.disabled = true;
    this.modeButtons.forEach(btn => btn.disabled = true);

    const modeText = this.mode === 'normal' ? '普通模式' : '镜像模式';
    this.showStatus(`${modeText} - 游戏开始！`, 'playing');
    this.nextRound();
  }

  private nextRound(): void {
    this.level++;
    this.currentLevelEl.textContent = this.level.toString();
    this.playerIndex = 0;

    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.sequence.push(randomColor);

    const modeText = this.mode === 'normal' ? '记住序列' : '记住序列（点击对称位置）';
    this.showStatus(`第 ${this.level} 关 - ${modeText}`, 'playing');
    this.showSequence();
  }

  private async showSequence(): Promise<void> {
    this.isShowingSequence = true;
    this.setButtonsDisabled(true);

    await this.delay(500);

    for (let i = 0; i < this.sequence.length; i++) {
      const color = this.sequence[i];
      await this.lightUpButton(color);

      if (i < this.sequence.length - 1) {
        await this.delay(this.lightOffDuration);
      }
    }

    this.isShowingSequence = false;
    this.setButtonsDisabled(false);
    const hint = this.mode === 'normal' ? '请按顺序点击按钮' : '请按顺序点击对称位置按钮';
    this.showStatus(hint, 'playing');
  }

  private async lightUpButton(color: Color): Promise<void> {
    const button = this.getButtonByColor(color);
    if (!button) return;

    button.classList.add('active');
    await this.delay(this.lightOnDuration);
    button.classList.remove('active');
  }

  private getButtonByColor(color: Color): HTMLButtonElement | null {
    return document.querySelector(`.color-btn[data-color="${color}"]`);
  }

  private async handlePlayerInput(color: Color): Promise<void> {
    if (!this.isPlaying || this.isShowingSequence) return;

    const sequenceColor = this.sequence[this.playerIndex];
    const expectedColor = this.mode === 'normal' ? sequenceColor : MIRROR_MAP[sequenceColor];
    const button = this.getButtonByColor(color);

    if (color === expectedColor) {
      button?.classList.add('correct');
      await this.delay(200);
      button?.classList.remove('correct');

      this.playerIndex++;

      if (this.playerIndex === this.sequence.length) {
        this.showStatus('正确！准备下一关...', 'success');
        this.setButtonsDisabled(true);
        await this.delay(1000);
        this.nextRound();
      }
    } else {
      button?.classList.add('wrong');
      const correctButton = this.getButtonByColor(expectedColor);
      correctButton?.classList.add('active');
      await this.delay(700);
      button?.classList.remove('wrong');
      correctButton?.classList.remove('active');

      this.gameOver();
    }
  }

  private async gameOver(): Promise<void> {
    this.isPlaying = false;
    this.setButtonsDisabled(true);
    this.startBtn.disabled = false;
    this.modeButtons.forEach(btn => btn.disabled = false);

    const finalScore = this.level - 1;
    const modeText = this.mode === 'normal' ? '普通模式' : '镜像模式';
    this.showStatus(`${modeText} 游戏结束！你完成了 ${finalScore} 关`, 'gameover');

    if (finalScore > this.highScores[this.mode]) {
      await this.saveHighScore(finalScore);
    }
  }

  private setButtonsDisabled(disabled: boolean): void {
    this.buttons.forEach(btn => {
      btn.disabled = disabled;
    });
  }

  private showStatus(message: string, type: 'playing' | 'gameover' | 'success' | '' = ''): void {
    this.gameStatusEl.textContent = message;
    this.gameStatusEl.className = 'game-status';
    if (type) {
      this.gameStatusEl.classList.add(type);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

new ColorMemoryGame();
