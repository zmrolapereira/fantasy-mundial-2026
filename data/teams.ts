export type Team = {
  id: string;
  name: string;
  code: string; // 3-letter
  flag: string; // URL da bandeira
  group: string;
};

// helper para flags (usa ISO 2-letter)
const flag = (code: string) =>
  `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

export const teams: Team[] = [
  // Grupo A
  { id: "mex", name: "México", code: "MEX", flag: flag("mx"), group: "A" },
  { id: "rsa", name: "África do Sul", code: "RSA", flag: flag("za"), group: "A" },
  { id: "kor", name: "Coreia do Sul", code: "KOR", flag: flag("kr"), group: "A" },
  { id: "cze", name: "República Checa", code: "CZE", flag: flag("cz"), group: "A" },

  // Grupo B
  { id: "can", name: "Canadá", code: "CAN", flag: flag("ca"), group: "B" },
  { id: "bih", name: "Bósnia e Herzegovina", code: "BIH", flag: flag("ba"), group: "B" },
  { id: "qat", name: "Qatar", code: "QAT", flag: flag("qa"), group: "B" },
  { id: "sui", name: "Suíça", code: "SUI", flag: flag("ch"), group: "B" },
  
  // Grupo C
  { id: "bra", name: "Brasil", code: "BRA", flag: flag("br"), group: "C" },
  { id: "mar", name: "Marrocos", code: "MAR", flag: flag("ma"), group: "C" },
  { id: "hai", name: "Haiti", code: "HAI", flag: flag("ht"), group: "C" },
  { id: "sco", name: "Escócia", code: "SCO", flag: flag("gb-sct"), group: "C" },

  // Grupo D
  { id: "usa", name: "Estados Unidos", code: "USA", flag: flag("us"), group: "D" },
  { id: "par", name: "Paraguai", code: "PAR", flag: flag("py"), group: "D" },
  { id: "aus", name: "Austrália", code: "AUS", flag: flag("au"), group: "D" },
  { id: "tur", name: "Turquia", code: "TUR", flag: flag("tr"), group: "D" },

  // Grupo E
  { id: "ger", name: "Alemanha", code: "GER", flag: flag("de"), group: "E" },
  { id: "cur", name: "Curaçao", code: "CUW", flag: flag("cw"), group: "E" },
  { id: "civ", name: "Costa do Marfim", code: "CIV", flag: flag("ci"), group: "E" },
  { id: "ecu", name: "Equador", code: "ECU", flag: flag("ec"), group: "E" },

  // Grupo F
  { id: "ned", name: "Holanda", code: "NED", flag: flag("nl"), group: "F" },
  { id: "jpn", name: "Japão", code: "JPN", flag: flag("jp"), group: "F" },
  { id: "swe", name: "Suécia", code: "SWE", flag: flag("se"), group: "F" },
  { id: "tun", name: "Tunísia", code: "TUN", flag: flag("tn"), group: "F" },

  // Grupo G
  { id: "bel", name: "Bélgica", code: "BEL", flag: flag("be"), group: "G" },
  { id: "egy", name: "Egito", code: "EGY", flag: flag("eg"), group: "G" },
  { id: "irn", name: "Irão", code: "IRN", flag: flag("ir"), group: "G" },
  { id: "nzl", name: "Nova Zelândia", code: "NZL", flag: flag("nz"), group: "G" },

  // Grupo H
  { id: "esp", name: "Espanha", code: "ESP", flag: flag("es"), group: "H" },
  { id: "cpv", name: "Cabo Verde", code: "CPV", flag: flag("cv"), group: "H" },
  { id: "ksa", name: "Arábia Saudita", code: "KSA", flag: flag("sa"), group: "H" },
  { id: "uru", name: "Uruguai", code: "URU", flag: flag("uy"), group: "H" },

  // Grupo I
  { id: "fra", name: "França", code: "FRA", flag: flag("fr"), group: "I" },
  { id: "sen", name: "Senegal", code: "SEN", flag: flag("sn"), group: "I" },
  { id: "irq", name: "Iraque", code: "IRQ", flag: flag("iq"), group: "I" },
  { id: "nor", name: "Noruega", code: "NOR", flag: flag("no"), group: "I" },

  // Grupo J
  { id: "arg", name: "Argentina", code: "ARG", flag: flag("ar"), group: "J" },
  { id: "alg", name: "Argélia", code: "ALG", flag: flag("dz"), group: "J" },
  { id: "aut", name: "Áustria", code: "AUT", flag: flag("at"), group: "J" },
  { id: "jor", name: "Jordânia", code: "JOR", flag: flag("jo"), group: "J" },

  // Grupo K
  { id: "por", name: "Portugal", code: "POR", flag: flag("pt"), group: "K" },
  { id: "cod", name: "RD Congo", code: "COD", flag: flag("cd"), group: "K" },
  { id: "uzb", name: "Uzbequistão", code: "UZB", flag: flag("uz"), group: "K" },
  { id: "col", name: "Colômbia", code: "COL", flag: flag("co"), group: "K" },

  // Grupo L
  { id: "eng", name: "Inglaterra", code: "ENG", flag: flag("gb-eng"), group: "L" },
  { id: "cro", name: "Croácia", code: "CRO", flag: flag("hr"), group: "L" },
  { id: "gha", name: "Gana", code: "GHA", flag: flag("gh"), group: "L" },
  { id: "pan", name: "Panamá", code: "PAN", flag: flag("pa"), group: "L" },
];