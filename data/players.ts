export type Position = "GR" | "DEF" | "MED" | "ATA";

export type Player = {
  id: number;
  name: string;
  team: string;
  position: Position;
  goals: number;
  assists: number;
  points: number;
};

// Função de cálculo de pontos (simples)
const calculatePoints = (goals: number, assists: number) => {
  return goals + assists;
};

export const players: Player[] = [
  {
    id: 1,
    name: "Diogo Costa",
    team: "Portugal",
    position: "GR",
    goals: 0,
    assists: 0,
    points: calculatePoints(0, 0),
  },
  {
    id: 2,
    name: "Rúben Dias",
    team: "Portugal",
    position: "DEF",
    goals: 0,
    assists: 0,
    points: calculatePoints(0, 0),
  },
  {
    id: 3,
    name: "Nuno Mendes",
    team: "Portugal",
    position: "DEF",
    goals: 0,
    assists: 0,
    points: calculatePoints(0, 0),
  },
  {
    id: 4,
    name: "Bruno Fernandes",
    team: "Portugal",
    position: "MED",
    goals: 0,
    assists: 0,
    points: calculatePoints(0, 0),
  },
  {
    id: 5,
    name: "Bernardo Silva",
    team: "Portugal",
    position: "MED",
    goals: 0,
    assists: 0,
    points: calculatePoints(0, 0),
  },
  {
    id: 6,
    name: "Rafael Leão",
    team: "Portugal",
    position: "ATA",
    goals: 0,
    assists: 0,
    points: calculatePoints(0, 0),
  },
  {
    id: 7,
    name: "Cristiano Ronaldo",
    team: "Portugal",
    position: "ATA",
    goals: 0,
    assists: 0,
    points: calculatePoints(0, 0),
  },
];