const BASE = 'https://popsicle-shown-swivel.ngrok-free.dev';

function getToken() {
  return "tma " + window.Telegram?.WebApp?.initData || '';
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `${getToken()}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.title || 'Request failed'), { status: res.status, data: err });
  }
  return res.json();
}

export const api = {
  // Profile
  getProfile: () => request('GET', '/api/profile'),

  // Users
  getAllUsers: () => request('GET', '/api/users'),

  // Admin Games
  getMyGames: () => request('GET', '/api/admin/games'),
  createGame: (name, description) => request('POST', '/api/admin/games', { Name: name, Description: description }),
  getGame: (id) => request('GET', `/api/admin/games/${id}`),
  updateGame: (id, fields) => request('PATCH', `/api/admin/games/${id}`, fields),
  deleteGame: (id) => request('DELETE', `/api/admin/games/${id}`),

  // Player games (participating)
  getPlayerGames: () => request('GET', '/api/player/games'),
  getPlayerSelf: (gameId) => request('GET', `/api/player/games/${gameId}`),
  updateMyName: (gameId, name) => request('PATCH', `/api/player/games/${gameId}`, { Name: name }),

  // Admin Players
  createPlayer: (gameId, playerId, name) =>
    request('POST', `/api/admin/games/${gameId}/players/${playerId}`, { Name: name }),
  getPlayer: (gameId, playerId) => request('GET', `/api/admin/games/${gameId}/players/${playerId}`),
  updatePlayer: (gameId, playerId, name) =>
    request('PATCH', `/api/admin/games/${gameId}/players/${playerId}`, { Name: name }),
  deletePlayer: (gameId, playerId) => request('DELETE', `/api/admin/games/${gameId}/players/${playerId}`),

  // Inventory
  getInventory: (gameId, playerId) =>
    request('GET', `/api/admin/games/${gameId}/players/${playerId}/inventory`),
  saveInventory: (gameId, playerId, inventory) =>
    request('PUT', `/api/admin/games/${gameId}/players/${playerId}/inventory`, { Inventory: inventory }),
};
