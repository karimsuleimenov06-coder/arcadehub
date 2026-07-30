export type GameCategory = 'classic' | 'modern' | 'multiplayer' | 'online'

export interface Game {
  id: string
  title: string
  emoji: string
  description: string
  category: GameCategory
  tags: string[]
  players: string
  isHot?: boolean
  isNew?: boolean
  isSoon?: boolean
  isOnline?: boolean
  color: string
}

export const GAMES: Game[] = [
  { id: 'snake', title: 'Змейка', emoji: 'S', description: 'Классическая змейка: собирай яблоки и расти', category: 'classic', tags: ['классика','аркада'], players: '1', isHot: true, color: '#00ff88' },
  { id: 'dino', title: 'Dino', emoji: 'D', description: 'Прыгай через кактусы и ставь рекорды', category: 'classic', tags: ['классика','раннер'], players: '1', color: '#ffdd00' },
  { id: 'arkanoid', title: 'Арканоид', emoji: 'A', description: 'Разбивай блоки шариком', category: 'classic', tags: ['классика','аркада'], players: '1', color: '#ff2d95' },
  { id: 'tetris', title: 'Тетрис', emoji: 'T', description: 'Складывай фигуры и очищай линии', category: 'classic', tags: ['классика','головоломка'], players: '1', color: '#9b59b6' },
  { id: 'flappy', title: 'Flappy Bird', emoji: 'F', description: 'Пролетай сквозь трубы, не задевая их', category: 'classic', tags: ['классика','аркада'], players: '1', isNew: true, color: '#00f3ff' },
  { id: '2048', title: '2048', emoji: '2', description: 'Соединяй плитки и добирайся до 2048', category: 'classic', tags: ['классика','головоломка'], players: '1', isHot: true, color: '#ffdd00' },
  { id: 'minesweeper', title: 'Сапёр', emoji: 'M', description: 'Найди все мины на поле', category: 'classic', tags: ['классика','головоломка'], players: '1', color: '#ff3355' },
  { id: 'pong', title: 'Pong', emoji: 'P', description: 'Ретро-теннис с другом или ИИ', category: 'multiplayer', tags: ['классика','спорт'], players: '2', color: '#00ff88' },
  { id: 'tictactoe', title: 'Крестики-нолики', emoji: 'O', description: 'Обыграй ИИ или сыграй с другом онлайн', category: 'multiplayer', tags: ['классика','стратегия'], players: '2', isOnline: true, color: '#00f3ff' },
  { id: 'solitaire', title: 'Пасьянс', emoji: 'C', description: 'Классический пасьянс', category: 'classic', tags: ['классика','карты'], players: '1', isSoon: true, color: '#9b59b6' },
  { id: 'poker', title: 'Покер', emoji: '🃏', description: 'Виртуальные фишки, без реальных денег', category: 'multiplayer', tags: ['карты','покер'], players: '2', isNew: true, color: '#ff2d95' },
  { id: 'endless-driver', title: 'Endless Driver', emoji: 'E', description: 'Гонки без конца', category: 'modern', tags: ['современные','гонки'], players: '1', isSoon: true, color: '#00f3ff' },
  { id: 'aim-trainer', title: 'Aim Trainer', emoji: 'N', description: 'Прокачай меткость', category: 'modern', tags: ['современные','стрельба'], players: '1', color: '#ff3355' },
  { id: 'space-invaders', title: 'Space Invaders', emoji: 'V', description: 'Отражай атаку пришельцев', category: 'modern', tags: ['современные','аркада'], players: '1', color: '#00ff88' },
  { id: 'ninja-dash', title: 'Ninja Dash', emoji: 'X', description: 'Быстрые рефлексы ниндзя', category: 'modern', tags: ['современные','экшн'], players: '1', isSoon: true, color: '#ff2d95' },
  { id: 'rocket-escape', title: 'Rocket Escape', emoji: 'R', description: 'Улетай от опасности', category: 'modern', tags: ['современные','аркада'], players: '1', isSoon: true, color: '#ff3355' },
  { id: 'zombie-survival', title: 'Zombie Survival', emoji: 'Z', description: 'Выживи в апокалипсисе', category: 'modern', tags: ['современные','экшн'], players: '1', isSoon: true, color: '#00ff88' },
  { id: 'doodle-jump', title: 'Doodle Jump', emoji: 'J', description: 'Прыгай всё выше', category: 'modern', tags: ['современные','аркада'], players: '1', isSoon: true, color: '#00f3ff' },
  { id: 'frogger', title: 'Frogger', emoji: 'G', description: 'Переправь лягушку через дорогу', category: 'modern', tags: ['современные','аркада'], players: '1', isSoon: true, color: '#00ff88' },
  { id: 'asteroids', title: 'Asteroids', emoji: 'W', description: 'Взрывай астероиды', category: 'modern', tags: ['современные','аркада'], players: '1', isSoon: true, color: '#ff2d95' },
]

export function getGameById(id: string): Game | undefined {
  return GAMES.find(g => g.id === id)
}
