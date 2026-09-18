import { QuestionSummary } from '../types';

export interface AIInsightsResponse {
  strengths: string;
  improvements: string;
  insights: string;
  sentimentScore: number;
  themes: Array<{
    label: string;
    description: string;
    sentiment: string;
  }>;
}

export function generatePedagogicalInsights(
  summaries: QuestionSummary[],
  openFeedback: string[] = []
): AIInsightsResponse {
  if (!summaries || summaries.length === 0) {
    return {
      strengths: "Duomenų apie mokinių atsakymus kol kas nepakanka išsamiai analizei.",
      improvements: "Įkelkite išsamesnius apklausos duomenis su vertinimo klausimais.",
      insights: "Laukiama atsakymų duomenų analizei atlikti.",
      sentimentScore: 50,
      themes: []
    };
  }

  // Calculate overall average
  const totalSum = summaries.reduce((acc, s) => acc + s.averageScore, 0);
  const overallAvg = Number((totalSum / summaries.length).toFixed(2));
  const sentimentScore = Math.min(100, Math.max(10, Math.round((overallAvg / 5) * 100)));

  // Calculate category averages
  const categories = ['Klimatas', 'Mokymas', 'Grįžtamasis ryšys', 'Įsitraukimas'] as const;
  const categoryStats = categories.map(cat => {
    const items = summaries.filter(s => s.category === cat);
    if (items.length === 0) return { cat, avg: 0, count: 0, items: [] };
    const avg = items.reduce((acc, i) => acc + i.averageScore, 0) / items.length;
    return { cat, avg: Number(avg.toFixed(2)), count: items.length, items };
  }).filter(c => c.count > 0);

  // Sort items for strengths and improvements
  const sorted = [...summaries].sort((a, b) => b.averageScore - a.averageScore);
  const topItems = sorted.filter(s => !s.isReverse).slice(0, 3);
  const bottomItems = [...sorted].reverse().filter(s => !s.isReverse).slice(0, 3);

  // Synthesize Strengths text
  let strengthsText = '';
  if (topItems.length > 0) {
    const itemDescriptions = topItems.map(i => `„${i.question}“ (${i.averageScore.toFixed(2)}/5)`).join(' ir ');
    strengthsText = `Mokiniai labiausiai vertina saugią, pagarbą skatinančią atmosferą bei mokytojo aiškumą. Ypač aukštai įvertinti aspektai: ${itemDescriptions}. Tai rodo didelį mokinių pasitikėjimą mokytojo profesionalumu ir palaikančiu santykiu.`;
  } else {
    strengthsText = "Mokiniai palankiai atsiliepia apie pamokų struktūrą bei mokymosi aplinką.";
  }

  // Synthesize Improvements text
  let improvementsText = '';
  if (bottomItems.length > 0) {
    const itemDescriptions = bottomItems.map(i => `„${i.question}“ (${i.averageScore.toFixed(2)}/5)`).join(' bei ');
    improvementsText = `Didžiausio dėmesio ir tobulinimo erdvės pastebima šiose srityse: ${itemDescriptions}. Rekomenduojama daugiau dėmesio skirti grįžtamojo ryšio detalumui, užduočių diferencijavimui ir aiškesniam vertinimo kriterijų aptarimui iš anksto.`;
  } else {
    improvementsText = "Rekomenduojama stiprinti formatyvųjį vertinimą bei individualizuotą pagalbą mokiniams.";
  }

  // Synthesize Pedagogical Insights text
  const bestCategory = [...categoryStats].sort((a, b) => b.avg - a.avg)[0];
  const lowestCategory = [...categoryStats].sort((a, b) => a.avg - b.avg)[0];

  let insightsText = `Bendras mokinių pasitenkinimo vidurkis siekia ${overallAvg.toFixed(2)} iš 5 galimų balų. `;
  if (bestCategory) {
    insightsText += `Stipriausia sritis yra „${bestCategory.cat}“ (vidurkis ${bestCategory.avg}/5), kas rodo tvarią ir sėkmingą pedagoginę praktiką. `;
  }
  if (lowestCategory && lowestCategory.cat !== bestCategory?.cat) {
    insightsText += `Didžiausią potencialą augimui turi „${lowestCategory.cat}“ (vidurkis ${lowestCategory.avg}/5). `;
  }
  if (openFeedback.length > 0) {
    insightsText += `Iš ${openFeedback.length} atvirų mokinių komentarų ryškėja noras aktyvesniam bendradarbiavimui pamokoje bei aiškesniam atsiskaitymo reikalavimų suderinimui.`;
  }

  // Synthesize Themes
  const themes = [
    {
      label: "Emocinis saugumas ir klasės klimatas",
      description: categoryStats.find(c => c.cat === 'Klimatas')?.avg && (categoryStats.find(c => c.cat === 'Klimatas')?.avg || 0) >= 4.0
        ? "Mokiniai jaučiasi išklausyti, gerbiami ir drąsiai užduoda klausimus pamokoje."
        : "Svarbu toliau kurti pasitikėjimu grįstą atmosferą ir skatinti mokinių saviraišką.",
      sentiment: (categoryStats.find(c => c.cat === 'Klimatas')?.avg || 0) >= 4.0 ? "Labai teigiamas" : "Neutralus"
    },
    {
      label: "Ugdymo turinio perteikimas ir aiškumas",
      description: "Mokiniai vertina vaizdų ir praktišką temų aiškinimą bei pakartotinį paaiškinimą kitu būdu.",
      sentiment: (categoryStats.find(c => c.cat === 'Mokymas')?.avg || 0) >= 4.0 ? "Teigiamas" : "Tobulintinas"
    },
    {
      label: "Formatyvus grįžtamasis ryšys ir palaikymas",
      description: "Mokiniams svarbu gauti ne tik pažymį, bet ir konkrečias nuorodas, kaip pasiekti geresnį rezultatą.",
      sentiment: (categoryStats.find(c => c.cat === 'Grįžtamasis ryšys')?.avg || 0) >= 3.8 ? "Teigiamas" : "Rekomenduojama stiprinti"
    },
    {
      label: "Mokinių įsitraukimas ir motyvacija",
      description: "Saviraišką ir aktyvumą skatinantys metodai didina mokinių atsakomybę už savo mokymosi pažangą.",
      sentiment: (categoryStats.find(c => c.cat === 'Įsitraukimas')?.avg || 0) >= 4.0 ? "Teigiamas" : "Vidutinis"
    }
  ];

  return {
    strengths: strengthsText,
    improvements: improvementsText,
    insights: insightsText,
    sentimentScore: sentimentScore,
    themes: themes
  };
}

export function generateFieldDraft(
  fieldKey: string,
  fieldLabel: string,
  currentNotes: string = '',
  summaries: QuestionSummary[] = [],
  openFeedback: string[] = [],
  aiInsights?: any
): string {
  const sorted = [...(summaries || [])].sort((a, b) => b.averageScore - a.averageScore);
  const topItems = sorted.filter(s => !s.isReverse).slice(0, 3);
  const bottomItems = [...sorted].reverse().filter(s => !s.isReverse).slice(0, 3);
  const topStr = topItems.length > 0 ? topItems.map(i => `„${i.question}“`).join(', ') : 'aiškus temų dėstymas ir saugi atmosfera';
  const bottomStr = bottomItems.length > 0 ? bottomItems.map(i => `„${i.question}“`).join(', ') : 'grįžtamojo ryšio detalumas ir atsiskaitymų terminai';

  const totalSum = (summaries || []).reduce((acc, s) => acc + s.averageScore, 0);
  const overallAvg = summaries?.length > 0 ? (totalSum / summaries.length).toFixed(2) : '4.50';

  let baseDraft = '';

  switch (fieldKey) {
    case 'observations':
      baseDraft = `Išanalizavęs mokinių apklausos duomenis (bendras pasitenkinimo vidurkis siekia ${overallAvg} iš 5 balų), pastebiu didelį mokinių pasitikėjimą ir teigiamą požiūrį į pamokų eigą. Labiausiai išsiskiria aukšti įvertinimai srityse: ${topStr}. Kartu pastebimas mokinių lūkestis skirti daugiau dėmesio klausimams, susijusiems su: ${bottomStr}.`;
      break;

    case 'strengths':
      baseDraft = `Mokiniai labiausiai džiaugiasi pagarbiu bendravimu, palaikančiu mikroklimatu bei tuo, kad pamokose jaučiasi išklausyti. Ypač teigiamai įvertinti šie aspektai: ${topStr}. Tai rodo, kad mano taikomi metodai padeda sukurti saugią erdvę mokytis.`;
      break;

    case 'improvements':
      baseDraft = `Mokinių vertinimai rodo, kad jie norėtų daugiau aiškumo ir pagalbos šiose srityse: ${bottomStr}. Mokiniai norėtų gauti konkretesnį grįžtamąjį ryšį po užduočių atlikimo bei turėti daugiau laiko įsigilinti į sudėtingesnes temas.`;
      break;

    case 'surprises':
      baseDraft = `Mane maloniai nustebino mokinių atvirumas ir brandus požiūris į grįžtamojo ryšio reikšmę. Taip pat buvo netikėta, kaip stipriai mokiniai vertina net trumpus asmeninius padrąsinimus bei norą dirbti porose su aiškiai apibrėžtomis rolėmis.`;
      break;

    case 'bestPractices':
      baseDraft = `Mano pamokose labiausiai pasiteisina vaizdus ir nuoseklus temos aiškinimas, aiški pamokos struktūra ir darbas bendradarbiaujant. Mokiniai vertina galimybę drąsiai užduoti klausimus ir gauti pagalbą be baimės suklysti.`;
      break;

    case 'heartFeelings':
      baseDraft = `Pamačius mokinių atsakymus, širdyje jaučiu didelį profesinį džiaugsmą, prasmę ir dėkingumą vaikams už nuoširdumą. Toks aukštas pasitikėjimas įkvepia ir patvirtina, kad pastangos kurti saugų santykį su kiekvienu mokiniu atsiperka.`;
      break;

    case 'headThoughts':
      baseDraft = `Racionaliai vertinant, būtina iš anksto pateikti aiškius vertinimo kriterijus prieš kiekvieną atsiskaitymą ir subalansuoti užduočių apimtį. Svarbu numatyti bent 5 minutes kiekvienos pamokos pabaigoje refleksijai ir rezultatų apibendrinimui.`;
      break;

    case 'actionStop':
      baseDraft = `Nustosiu skubėti tikrinant visų užduočių atlikimą pamokoje ir nustosiu reikalauti greito atsakymo be laiko pagalvoti. Skirsiu pakankamai laiko mokinių refleksijai ir savarankiško mąstymo pauzėms.`;
      break;

    case 'actionStart':
      baseDraft = `Pradėsiu taikyti aiškias sėkmės rubrikas prieš kiekvieną atsiskaitymą ir įvesiu 2 minučių formatyvų „išėjimo bilietą“ (exit ticket), kad laiku pastebėčiau mokinių nesuprastas temas ir galėčiau jas paaiškinti kitu būdu.`;
      break;

    case 'actionContinue':
      baseDraft = `Tęsiu nuolatinį padrąsinimą, atvirą dialogą su mokiniais ir saugios, pagarbios atmosferos palaikymą, ką mokiniai apklausoje įvardijo kaip vieną didžiausių mano pamokų stiprybių.`;
      break;

    case 'nextSteps':
      baseDraft = `Sėkmę matuosiu atlikdamas trumpą 3 klausimų grįžtamojo ryšio apklausą po pirmojo pusmečio, stebėdamas mokinių savarankiškumą praktinėse užduotyse bei fiksuodamas sumažėjusį nerimą prieš atsiskaitymus.`;
      break;

    default:
      baseDraft = `Remdamasis mokinių apklausos rezultatais (vidurkis ${overallAvg}/5), toliau stiprinsiu mokinių įsitraukimą, aiškų užduočių struktūravimą ir formatyvų grįžtamąjį ryšį.`;
      break;
  }

  if (currentNotes && currentNotes.trim().length > 0) {
    return `${currentNotes.trim()}\n\n${baseDraft}`;
  }

  return baseDraft;
}

export function generateReflectionSuggestions(): Record<string, string[]> {
  return {
    observationSuggestions: [
      "Mokiniai itin pozityviai vertina aiškų temos aiškinimą ir pagarbų bendravimą pamokose.",
      "Pastebimas poreikis lankstesniam atsiskaitymų terminui ir išankstiniams vertinimo kriterijams.",
      "Dauguma mokinių jaučiasi saugiai, tačiau norėtų aktyvesnio įsitraukimo praktinėse veiklose.",
      "Mokinių atsiliepimai rodo, kad vaikai labai vertina darbą porose ir praktinius pavyzdžius."
    ],
    analysisSuggestions: [
      "Stiprybė: aiški pamokos struktūra ir pagarbus, palaikantis mikroklimatas.",
      "Tobulintina sritis: atsiskaitymo reikalavimų ir vertinimo kriterijų išankstinis aptarimas.",
      "Netikėtumas: mokiniai labiau vertina individualų mokytojo padrąsinimą nei formalius pažymius.",
      "Galimybė: įtraukti daugiau gyvenimiškų, praktinių pavyzdžių į temos aiškinimą."
    ],
    bestPracticeSuggestions: [
      "Trumpas formatyvus grįžtamasis ryšys (pvz., '2 žvaigždutės ir 1 noras') iš karto po atliktos užduoties.",
      "Sėkmės kriterijų (rubrikų) vizualizavimas lentoje prieš pradedant savarankišką darbą.",
      "Diferencijuotos užduotys pagal mokinių pasirengimo lygį ir tempą.",
      "Mini refleksijos 'exit ticket' (išėjimo bilietai) pamokos pabaigoje."
    ],
    emotionSuggestions: [
      "Jaučiu profesinį džiaugsmą ir prasmę matydamas aukštą mokinių pasitikėjimą.",
      "Kyla natūralus atsakomybės jausmas dėl atsiskaitymų krūvio, kurį įvardijo dalis vaikų.",
      "Jaučiu įkvėpimą atnaujinti mokymo metodus ir suteikti daugiau autonomijos mokiniams."
    ],
    actionSuggestions: [
      "Nustosiu skubėti tikrinant visų užduočių atlikimą – skirsiu 5 minutes pamokos apibendrinimui.",
      "Pradėsiu taikyti aiškius vertinimo kriterijus prieš kiekvieną atsiskaitymą.",
      "Tęsiu nuolatinį padrąsinimą ir atvirą dialogą su mokiniais.",
      "Pradėsiu diferencijuoti praktinių užduočių apimtis pagal mokinių tempą."
    ],
    nextStepSuggestions: [
      "Atlikti trumpą tarpinę 3 klausimų apklausą po pirmojo mėnesio.",
      "Stebėti, ar sumažėjo mokinių nerimas dėl atsiskaitymų.",
      "Aptarti pamokų taisykles kartu su klase kitos savaitės pradžioje."
    ]
  };
}
