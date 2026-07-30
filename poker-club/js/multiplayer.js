let currentRoom = null;

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function createRoom() {
  currentRoom = generateRoomCode();
  const info = document.getElementById('room-info');
  const display = document.getElementById('room-code-display');
  display.textContent = currentRoom;
  info.classList.remove('hidden');
}

function joinRoom() {
  const code = document.getElementById('room-code-input').value.trim().toUpperCase();
  if (code.length < 4) {
    alert('Введите корректный код комнаты');
    return;
  }
  currentRoom = code;
  const info = document.getElementById('room-info');
  const display = document.getElementById('room-code-display');
  display.textContent = code;
  info.classList.remove('hidden');
}

function startMultiGame() {
  gameMode = 'multi';
  navigate('game');
  initGame();
}
