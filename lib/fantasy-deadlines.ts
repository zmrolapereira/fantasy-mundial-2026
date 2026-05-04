import { Game } from "@/data/games";

export function getGameDateTime(game: Game) {
  const time = game.time?.trim() || "00:00";
  return new Date(`${game.date}T${time}:00`);
}

export function getFirstTournamentGame(games: Game[]) {
  if (!games.length) {
    throw new Error("Não existem jogos para calcular o primeiro jogo do torneio.");
  }

  return [...games].sort(
    (a, b) => getGameDateTime(a).getTime() - getGameDateTime(b).getTime()
  )[0];
}

export function getLockDateFromGame(game: Game) {
  // Fecha exatamente à hora do primeiro jogo
  return getGameDateTime(game);
}

export function isLocked(lockDate: Date) {
  return Date.now() >= lockDate.getTime();
}

export function getRoundGroups(games: Game[]) {
  const grouped: Record<string, Game[]> = {};

  games.forEach((game) => {
    if (!grouped[game.round]) {
      grouped[game.round] = [];
    }

    grouped[game.round].push(game);
  });

  return grouped;
}

export function getRoundFirstGame(roundGames: Game[]) {
  if (!roundGames.length) {
    throw new Error("Não existem jogos nesta ronda.");
  }

  return [...roundGames].sort(
    (a, b) => getGameDateTime(a).getTime() - getGameDateTime(b).getTime()
  )[0];
}

function padSeconds(seconds: number) {
  return String(seconds).padStart(2, "0");
}

export function formatCountdown(targetDate: Date) {
  const distance = targetDate.getTime() - Date.now();

  if (distance <= 0) return "Fechado";

  const totalSeconds = Math.floor(distance / 1000);

  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m ${padSeconds(seconds)}s`;
}