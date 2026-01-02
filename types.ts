
export interface SurveyRow {
  [key: string]: string;
}

export interface QuestionSummary {
  question: string;
  counts: {
    [answer: string]: number;
  };
  total: number;
  averageScore: number;
  category: 'Klimatas' | 'Mokymas' | 'Grįžtamasis ryšys' | 'Įsitraukimas' | 'Kita';
  isReverse?: boolean; // Jei aukštas balas reiškia blogą situaciją
}

export interface ReflectionData {
  observations: string;
  strengths: string;
  improvements: string;
  surprises: string;
  bestPractices: string;
  heartFeelings: string;
  headThoughts: string;
  actionStop: string;
  actionStart: string;
  actionContinue: string;
  nextSteps: string;
}

export enum AppStep {
  UPLOAD = 'UPLOAD',
  ANALYSIS = 'ANALYSIS',
  REFLECTION = 'REFLECTION',
  REPORT = 'REPORT'
}

export const LIKERT_VALUES: { [key: string]: number } = {
  "Visiškai sutinku": 5,
  "Labiau sutinku": 4,
  "Iš dalies": 3,
  "Labiau nesutinku": 2,
  "Visiškai nesutinku": 1,
  "Visiškai nesutinku.": 1,
  "Visiškai sutinku.": 5
};

export const CATEGORY_MAP: { [key: string]: QuestionSummary['category'] } = {
  "Mokytis yra įdomu": "Įsitraukimas",
  "Mums užduodami įdomūs namų darbai": "Įsitraukimas",
  "Mano mokytojas skiria laiko apibendrinti": "Mokymas",
  "Mano mokytojas nori, kad aš paaiškinčiau savo atsakymus": "Mokymas",
  "Mano mokytojas nori, kad pasidalintume savo mintimis": "Klimatas",
  "Mano mokytojas klausia klausimus, kad įsitikintų": "Mokymas",
  "Mokytis mokykloje nėra labai malonu": "Klimatas",
  "Mano mokytojas skatina mus įdėti visas pastangas": "Įsitraukimas",
  "Namų darbai padeda man mokytis": "Įsitraukimas",
  "Kai mokytojas žymi mano darbą, jis užrašo": "Grįžtamasis ryšys",
  "Mano mokytojas pasako mums, ką ir kodėl mes mokomės": "Mokymas",
  "Mokiniai išreiškia savo nuomonę ir dalijasi mintimis": "Klimatas",
  "Mokytojas aiškindamas klausia, ar mes suprantame": "Mokymas",
  "Mano mokytojas patikrina, kad įsitikintų": "Grįžtamasis ryšys",
  "Mano bendraklasiai elgiasi taip, kaip mokytojas norėtų": "Klimatas",
  "Mano mokytojas skatina visus sunkiai dirbti": "Įsitraukimas",
  "Mano mokytojas žino, kai mokiniai supranta": "Mokymas",
  "Jei kažko nesupranti, mokytojas paaiškina kitu būdu": "Mokymas",
  "Mūsų klasė būna užimta veiklomis": "Klimatas",
  "Man patinka, kaip mokytojas su manimi elgiasi": "Klimatas",
  "Klasė yra tvarkinga": "Klimatas",
  "Šiose pamokose mes turime gerai pagalvoti": "Mokymas",
  "Mokiniai per pamokas elgiasi taip blogai": "Klimatas",
  "Mano mokytojas duoda mums laiko paaiškinti": "Mokymas",
  "Mano mokytojas suprantamai paaiškina sudėtingus dalykus": "Mokymas",
  "Jaučiu, kad mano mokytojui aš rūpiu": "Klimatas",
  "Aš suprantu, ką turėčiau mokytis": "Mokymas",
  "Mano mokytojas būna malonus, kai aš užduodu klausimus": "Klimatas"
};

export const REVERSE_QUESTIONS = [
  "Mokytis mokykloje nėra labai malonu",
  "Mokiniai per pamokas elgiasi taip blogai"
];
