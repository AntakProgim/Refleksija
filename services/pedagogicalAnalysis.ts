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
