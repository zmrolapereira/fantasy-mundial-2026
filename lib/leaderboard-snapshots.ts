import {
  doc,
  getDoc,
  getDocs,
  collection,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { games as baseGames } from "@/data/games";
import { getGamesWithResults } from "@/lib/game-results";
import {
  getAllFantasyEntries,
  getPredictionsForUser,
} from "@/lib/fantasy-entry";

function normalize(value?: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function sameTeam(a?: string, b?: string) {
  return normalize(a) === normalize(b);
}

function getOutcome(home: number, away: number) {
  if (home > away) return "HOME";
  if (away > home) return "AWAY";
  return "DRAW";
}

function getWinner(game: any) {
  if (game.status !== "FT" || game.homeScore == null || game.awayScore == null) {
    return null;
  }

  if (game.homeScore === game.awayScore) {
    return game.penaltyWinner || null;
  }

  return game.homeScore > game.awayScore ? game.homeTeam : game.awayTeam;
}

function getPredictionPoints(prediction: any, game: any) {
  if (
    !game ||
    game.status !== "FT" ||
    game.homeScore == null ||
    game.awayScore == null
  ) {
    return 0;
  }

  const predictedHome = Number(prediction.predictedHomeScore);
  const predictedAway = Number(prediction.predictedAwayScore);

  const predictedOutcome = getOutcome(predictedHome, predictedAway);
  const realOutcome = getOutcome(game.homeScore, game.awayScore);

  // Mantém igual ao teu sistema atual: resultado exato = 2 pontos; desfecho = 1 ponto.
  // Se no teu fantasy-scoring estiveres a usar 3 pontos para exato, muda este 2 para 3.
  if (predictedHome === game.homeScore && predictedAway === game.awayScore) {
    return 2;
  }

  if (predictedOutcome === realOutcome) {
    return 1;
  }

  return 0;
}

function getStageIdFromGame(game: any) {
  return game.phase === "Fase de Grupos"
    ? normalize(game.round)
    : normalize(game.phase);
}

function gameMatchesStage(game: any, stageId: string) {
  const stage = normalize(stageId);
  const gameStage = getStageIdFromGame(game);

  if (stage === "final e 3º lugar" || stage === "final e 3o lugar") {
    return (
      gameStage === "final" ||
      gameStage === "3º lugar" ||
      gameStage === "3o lugar"
    );
  }

  return gameStage === stage;
}

function gameIsStage(game: any, stage: string) {
  const target = normalize(stage);

  return normalize(game.phase) === target || normalize(game.round) === target;
}

function teamAppearsInStage(games: any[], teamName: string, stage: string) {
  return games
    .filter((game) => gameIsStage(game, stage))
    .some(
      (game) =>
        sameTeam(game.homeTeam, teamName) || sameTeam(game.awayTeam, teamName)
    );
}

function teamWonAnyGameInStage(games: any[], teamName: string, stage: string) {
  return games
    .filter((game) => gameIsStage(game, stage))
    .some((game) => sameTeam(getWinner(game) ?? "", teamName));
}

function getSelectedTeamMatchPointsForStage(
  games: any[],
  teamName?: string,
  stageId?: string
) {
  if (!teamName || !stageId) return 0;

  return games
    .filter((game) => gameMatchesStage(game, stageId))
    .reduce((sum, game) => {
      if (
        game.status !== "FT" ||
        game.homeScore == null ||
        game.awayScore == null
      ) {
        return sum;
      }

      const involvesTeam =
        sameTeam(game.homeTeam, teamName) || sameTeam(game.awayTeam, teamName);

      if (!involvesTeam) return sum;

      const isDraw = game.homeScore === game.awayScore;

      if (isDraw) {
        return sum + 0.5;
      }

      const teamWonInScore =
        (sameTeam(game.homeTeam, teamName) && game.homeScore > game.awayScore) ||
        (sameTeam(game.awayTeam, teamName) && game.awayScore > game.homeScore);

      if (teamWonInScore) {
        return sum + 1;
      }

      return sum;
    }, 0);
}

function getSelectedTeamStageBonus(
  games: any[],
  teamName?: string,
  stageId?: string
) {
  if (!teamName || !stageId) return 0;

  const stage = normalize(stageId);

  if (stage === "16 avos") {
    return teamWonAnyGameInStage(games, teamName, "16 avos") ||
      teamAppearsInStage(games, teamName, "Oitavos")
      ? 1
      : 0;
  }

  if (stage === "oitavos") {
    return teamWonAnyGameInStage(games, teamName, "Oitavos") ||
      teamAppearsInStage(games, teamName, "Quartos")
      ? 1
      : 0;
  }

  if (stage === "quartos") {
    return teamWonAnyGameInStage(games, teamName, "Quartos") ||
      teamAppearsInStage(games, teamName, "Meias-finais")
      ? 1
      : 0;
  }

  if (stage === "meias-finais") {
    return teamWonAnyGameInStage(games, teamName, "Meias-finais") ||
      teamAppearsInStage(games, teamName, "Final")
      ? 1
      : 0;
  }

  if (
    stage === "final" ||
    stage === "final e 3º lugar" ||
    stage === "final e 3o lugar"
  ) {
    return teamWonAnyGameInStage(games, teamName, "Final") ? 2 : 0;
  }

  return 0;
}

function getStageExtraPlayerPoints(entry: any, cleanStageId: string) {
  const stage = normalize(cleanStageId);

  // Para já, conta marcador/assistente só na Jornada 1,
  // para não duplicar os mesmos pontos em todas as fases.
  if (stage !== "jornada 1") return 0;

  return Number(entry.topScorerPoints ?? 0) + Number(entry.topAssistPoints ?? 0);
}

function getEntryRealTotalPoints(entry: any) {
  // Este é o ponto importante: não dependemos só de entry.totalPoints,
  // porque no teu caso ele podia estar 8 enquanto as categorias somavam 9.
  const totalFromCategories =
    Number(entry.predictionPoints ?? 0) +
    Number(entry.topScorerPoints ?? 0) +
    Number(entry.topAssistPoints ?? 0) +
    Number(entry.selectedTeamPoints ?? 0);

  const storedTotal = Number(entry.totalPoints ?? 0);

  return Math.max(storedTotal, totalFromCategories);
}

export async function saveStageLeaderboardSnapshot(
  stageId: string,
  label: string
) {
  const cleanStageId = normalize(stageId);
  const snapshotRef = doc(db, "leaderboardSnapshots", cleanStageId);

  // Usa os resultados reais guardados em gameResults, não só o games.ts.
  const games = await getGamesWithResults(baseGames);
  const entries = await getAllFantasyEntries();

  const previousStageOrder = [
    "jornada 1",
    "jornada 2",
    "jornada 3",
    "16 avos",
    "oitavos",
    "quartos",
    "meias-finais",
    "final e 3º lugar",
  ];

  const currentStageIndex = previousStageOrder.indexOf(cleanStageId);
  const previousStageId =
    currentStageIndex > 0 ? previousStageOrder[currentStageIndex - 1] : null;

  const previousSnapshotEntriesByUserId = new Map<string, any>();

  if (previousStageId) {
    const previousSnapshotRef = doc(db, "leaderboardSnapshots", previousStageId);
    const previousSnapshot = await getDoc(previousSnapshotRef);

    if (previousSnapshot.exists()) {
      const previousData = previousSnapshot.data();
      const previousEntries = Array.isArray(previousData.entries)
        ? previousData.entries
        : [];

      previousEntries.forEach((item: any) => {
        previousSnapshotEntriesByUserId.set(item.userId, item);
      });
    }
  }

  const rows = await Promise.all(
    entries.map(async (entry) => {
      const predictions = await getPredictionsForUser(entry.userId);

      const predictionStagePoints = predictions.reduce((sum, prediction) => {
        const game = games.find((g: any) => Number(g.id) === Number(prediction.gameId));
        if (!game) return sum;

        if (!gameMatchesStage(game, cleanStageId)) return sum;

        return sum + getPredictionPoints(prediction, game);
      }, 0);

      const selectedTeamStageMatchPoints = getSelectedTeamMatchPointsForStage(
        games,
        entry.championPick?.teamName,
        cleanStageId
      );

      const selectedTeamStageBonus = getSelectedTeamStageBonus(
        games,
        entry.championPick?.teamName,
        cleanStageId
      );

      const extraPlayerStagePoints = getStageExtraPlayerPoints(
        entry,
        cleanStageId
      );

      const previousEntry = previousSnapshotEntriesByUserId.get(entry.userId);
      const previousTotalPoints = Number(
        previousEntry?.realTotalPointsAtThatMoment ??
          previousEntry?.totalPointsAtThatMoment ??
          0
      );

      const realTotalPoints = getEntryRealTotalPoints(entry);
      const storedTotalPoints = Number(entry.totalPoints ?? 0);

      const diffStagePoints = Math.max(0, realTotalPoints - previousTotalPoints);

      const calculatedStagePoints =
        Number(predictionStagePoints ?? 0) +
        Number(selectedTeamStageMatchPoints ?? 0) +
        Number(selectedTeamStageBonus ?? 0) +
        Number(extraPlayerStagePoints ?? 0);

      // Usa o maior dos dois para evitar snapshots antigos/incompletos.
      // No teu caso: predictionStagePoints=8 mas realTotalPoints=9, então fica 9.
      const stagePoints = Math.max(diffStagePoints, calculatedStagePoints);

      return {
        userId: entry.userId,
        teamName: entry.teamName ?? "Sem nome",
        managerName: entry.managerName ?? "",
        championPick: entry.championPick ?? null,

        stagePoints,
        predictionStagePoints,
        selectedTeamStageMatchPoints,
        selectedTeamStageBonus,
        extraPlayerStagePoints,

        previousTotalPoints,
        storedTotalPointsAtThatMoment: storedTotalPoints,
        realTotalPointsAtThatMoment: realTotalPoints,
        totalPointsAtThatMoment: realTotalPoints,
      };
    })
  );

  const sorted = rows.sort((a, b) => {
    if (b.stagePoints !== a.stagePoints) return b.stagePoints - a.stagePoints;
    return b.totalPointsAtThatMoment - a.totalPointsAtThatMoment;
  });

  let currentRank = 1;

  const ranked = sorted.map((row, index) => {
    if (index > 0) {
      const prev = sorted[index - 1];
      const same =
        row.stagePoints === prev.stagePoints &&
        row.totalPointsAtThatMoment === prev.totalPointsAtThatMoment;

      if (!same) currentRank = index + 1;
    }

    return {
      ...row,
      rank: currentRank,
    };
  });

  await setDoc(snapshotRef, {
    stageId: cleanStageId,
    label,
    createdAt: serverTimestamp(),
    isLocked: true,
    entries: ranked,
  });

  return { alreadyExists: false };
}

export async function getStageLeaderboardSnapshot(stageId: string) {
  const snapshotRef = doc(db, "leaderboardSnapshots", normalize(stageId));
  const snap = await getDoc(snapshotRef);

  if (!snap.exists()) return null;

  return snap.data();
}

export async function getAllLeaderboardSnapshots() {
  const snap = await getDocs(collection(db, "leaderboardSnapshots"));

  return snap.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  }));
}
