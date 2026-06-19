export interface CityData {
  id: string;
  nameEn: string;
  nameKa: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'veryHard';
  difficultyScore: 1 | 2 | 3 | 4;
  lat: number; // for map pin placement (% from top-left of Georgia SVG)
  lng: number;
  descEn: string;
  descKa: string;
  landmarks: string[];
  ambientSound: string;
  skyColor: string; // CSS gradient for sky
  hasNightMode: boolean;
  hasWeatherEffects: boolean;
  practicalBackdrop: string;
  layoutPreset: 'grid' | 'boulevard' | 'roundabout' | 'valley';
}

export const cities: CityData[] = [
  {
    id: 'rustavi',
    nameEn: 'Rustavi',
    nameKa: 'რუსთავი',
    difficulty: 'medium',
    difficultyScore: 2,
    lat: 52,
    lng: 70,
    descEn: 'Soviet-era grid streets with wide avenues and industrial zones.',
    descKa: 'საბჭოთა ეპოქის ბადისებური ქუჩები, ფართო გამზირები და სამრეწველო ზონები.',
    landmarks: ['Rustavi Metallurgical Plant', 'Rustavi Arc Stadium', 'Central Park'],
    ambientSound: 'urban-industrial',
    skyColor: 'linear-gradient(180deg, #87CEEB 0%, #E0F0FF 100%)',
    hasNightMode: false,
    hasWeatherEffects: false,
    practicalBackdrop: 'Industrial park with wide open flat area',
    layoutPreset: 'grid'
  },
  {
    id: 'telavi',
    nameEn: 'Telavi',
    nameKa: 'თელავი',
    difficulty: 'easy',
    difficultyScore: 1,
    lat: 48,
    lng: 78,
    descEn: 'Historic wine-country town with fortress walls and vineyard landscapes.',
    descKa: 'ისტორიული მეღვინეობის ქალაქი ციხესიმაგრის კედლებით და ვენახების ლანდშაფტით.',
    landmarks: ['Batonis Tsikhe Fortress', 'Vineyards', 'Kakhetian Houses', 'Central Market'],
    ambientSound: 'nature-birds',
    skyColor: 'linear-gradient(180deg, #6BA3BE 0%, #C8E6F5 100%)',
    hasNightMode: false,
    hasWeatherEffects: false,
    practicalBackdrop: 'Vineyard landscape with fortress silhouette',
    layoutPreset: 'valley'
  },
  {
    id: 'kutaisi',
    nameEn: 'Kutaisi',
    nameKa: 'ქუთაისი',
    difficulty: 'hard',
    difficultyScore: 3,
    lat: 40,
    lng: 42,
    descEn: 'Second largest city — complex intersections and Rioni River crossings.',
    descKa: 'მეორე უდიდესი ქალაქი — რთული გზაჯვარედინები და მდ. რიონის გადასასვლელები.',
    landmarks: ['Bagrati Cathedral', 'Rioni River', 'Colchic Fountain', 'White Bridge'],
    ambientSound: 'urban-busy',
    skyColor: 'linear-gradient(180deg, #5A8FA8 0%, #B8D8E8 100%)',
    hasNightMode: false,
    hasWeatherEffects: true,
    practicalBackdrop: 'Open area near riverbank',
    layoutPreset: 'roundabout'
  },
  {
    id: 'batumi',
    nameEn: 'Batumi',
    nameKa: 'ბათუმი',
    difficulty: 'veryHard',
    difficultyScore: 4,
    lat: 62,
    lng: 25,
    descEn: 'Coastal city with a famous boulevard, palm trees, and heavy tourist traffic.',
    descKa: 'სანაპირო ქალაქი ცნობილი ბულვარით, პალმის ხეებით და ძლიერი ტურისტული ტრაფიკით.',
    landmarks: ['Batumi Boulevard', 'Alphabetic Tower', 'Ali and Nino Sculpture', 'Port of Batumi', 'Black Sea'],
    ambientSound: 'coastal-waves',
    skyColor: 'linear-gradient(180deg, #2C7BB6 0%, #87C4E8 60%, #B8DDF0 100%)',
    hasNightMode: true,
    hasWeatherEffects: true,
    practicalBackdrop: 'Port area flat ground with sea view',
    layoutPreset: 'boulevard'
  },
  {
    id: 'akhaltsikhe',
    nameEn: 'Akhaltsikhe',
    nameKa: 'ახალციხე',
    difficulty: 'medium',
    difficultyScore: 2,
    lat: 55,
    lng: 42,
    descEn: 'Medieval castle town with narrow old streets and steep inclines.',
    descKa: 'შუასაუკუნეების ციხის ქალაქი ვიწრო ძველი ქუჩებით და ციცაბო ასვლებით.',
    landmarks: ['Rabati Castle', 'Mktvari River', 'Old Bazaar', 'Mosque'],
    ambientSound: 'urban-light',
    skyColor: 'linear-gradient(180deg, #7A9EBC 0%, #C4DCF0 100%)',
    hasNightMode: false,
    hasWeatherEffects: false,
    practicalBackdrop: 'Open area outside castle walls',
    layoutPreset: 'roundabout'
  },
  {
    id: 'zugdidi',
    nameEn: 'Zugdidi',
    nameKa: 'ზუგდიდი',
    difficulty: 'medium',
    difficultyScore: 2,
    lat: 38,
    lng: 28,
    descEn: 'Green city with Dadiani Palace and a well-structured grid layout.',
    descKa: 'მწვანე ქალაქი დადიანის სასახლით და კარგად ორგანიზებული ბადისებური გეგმით.',
    landmarks: ['Dadiani Palace', 'Botanical Garden', 'Central Park', 'Public Market'],
    ambientSound: 'nature-park',
    skyColor: 'linear-gradient(180deg, #4A9E7A 0%, #A8D8C0 50%, #C8ECD8 100%)',
    hasNightMode: false,
    hasWeatherEffects: false,
    practicalBackdrop: 'Botanical garden adjacent flat area',
    layoutPreset: 'grid'
  },
  {
    id: 'gori',
    nameEn: 'Gori',
    nameKa: 'გორი',
    difficulty: 'medium',
    difficultyScore: 2,
    lat: 46,
    lng: 55,
    descEn: 'Wide Soviet-era boulevards and the famous Gori Fortress on the hill.',
    descKa: 'ფართო საბჭოთა ეპოქის გამზირები და ცნობილი გორის ციხე გორაზე.',
    landmarks: ['Gori Fortress', 'Stalin Museum', 'Stalin Avenue', 'Goris Tsikhe'],
    ambientSound: 'urban-medium',
    skyColor: 'linear-gradient(180deg, #8AACBE 0%, #C8E4F5 100%)',
    hasNightMode: false,
    hasWeatherEffects: false,
    practicalBackdrop: 'Wide area near fortress base',
    layoutPreset: 'grid'
  },
  {
    id: 'poti',
    nameEn: 'Poti',
    nameKa: 'ფოთი',
    difficulty: 'hard',
    difficultyScore: 3,
    lat: 45,
    lng: 22,
    descEn: 'Port city with cranes, cargo ships, and coastal weather effects.',
    descKa: 'სანავსადგური ქალაქი ამწეებით, სატვირთო გემებით და სანაპირო ამინდის ეფექტებით.',
    landmarks: ['Port of Poti', 'Lake Paliastomi', 'Lighthouse', 'Cargo Terminal'],
    ambientSound: 'port-harbor',
    skyColor: 'linear-gradient(180deg, #3A7EA8 0%, #7ABADC 60%, #AADCF0 100%)',
    hasNightMode: false,
    hasWeatherEffects: true,
    practicalBackdrop: 'Port entrance flat area with crane silhouettes',
    layoutPreset: 'boulevard'
  },
  {
    id: 'ozurgeti',
    nameEn: 'Ozurgeti',
    nameKa: 'ოზურგეთი',
    difficulty: 'easy',
    difficultyScore: 1,
    lat: 58,
    lng: 28,
    descEn: 'Peaceful Gurian town with a clean grid layout — perfect for learners.',
    descKa: 'მშვიდი გურული ქალაქი სუფთა ბადისებური გეგმით — იდეალურია დამწყებებისთვის.',
    landmarks: ['Town Square', 'Orthodox Church', 'Gurian Houses', 'Park'],
    ambientSound: 'rural-peaceful',
    skyColor: 'linear-gradient(180deg, #5A9E6E 0%, #A0D8B0 50%, #C8ECD8 100%)',
    hasNightMode: false,
    hasWeatherEffects: false,
    practicalBackdrop: 'Open town square area',
    layoutPreset: 'grid'
  },
  {
    id: 'sachkhere',
    nameEn: 'Sachkhere',
    nameKa: 'საჩხერე',
    difficulty: 'easy',
    difficultyScore: 1,
    lat: 42,
    lng: 47,
    descEn: 'Mountain town with winding roads and dramatic gorge scenery.',
    descKa: 'მთის ქალაქი ხვეულ გზებსა და დრამატული ხეობის ხედებთან ერთად.',
    landmarks: ['Sachkhere River Gorge', 'Mountain Church', 'Old Bridge', 'Pine Forest'],
    ambientSound: 'mountain-wind',
    skyColor: 'linear-gradient(180deg, #4A6E8E 0%, #8AAEC8 50%, #C0D8E8 100%)',
    hasNightMode: false,
    hasWeatherEffects: true,
    practicalBackdrop: 'Flat open area at town entrance with mountain vista',
    layoutPreset: 'valley'
  },
  {
    id: 'ambrolauri',
    nameEn: 'Ambrolauri',
    nameKa: 'ამბროლაური',
    difficulty: 'medium',
    difficultyScore: 2,
    lat: 36,
    lng: 48,
    descEn: 'Scenic Racha region capital surrounded by vineyards and Caucasus peaks.',
    descKa: 'რაჭის მხარის ლამაზი დედაქალაქი ვენახებითა და კავკასიის მწვერვალებით გარშემორტყმული.',
    landmarks: ['Rioni River', 'Racha Vineyards', 'Caucasus Mountain Peaks', 'Khvanchkara Winery'],
    ambientSound: 'mountain-nature',
    skyColor: 'linear-gradient(180deg, #2E5472 0%, #5E84A2 40%, #A8CAE0 100%)',
    hasNightMode: false,
    hasWeatherEffects: true,
    practicalBackdrop: 'Mountain meadow with Caucasus peaks backdrop',
    layoutPreset: 'valley'
  },
  {
    id: 'akhalkalaki',
    nameEn: 'Akhalkalaki',
    nameKa: 'ახალქალაქი',
    difficulty: 'medium',
    difficultyScore: 2,
    lat: 62,
    lng: 50,
    descEn: 'Highland border city on the Javakheti plateau with unique architecture.',
    descKa: 'ჯავახეთის მაღალმთიანი სასაზღვრო ქალაქი უნიკალური არქიტექტურით.',
    landmarks: ['Akhalkalaki Fortress', 'Armenian Church', 'Paravani Lake', 'Javakheti Plateau'],
    ambientSound: 'highland-wind',
    skyColor: 'linear-gradient(180deg, #1E3E5A 0%, #4A6E8E 40%, #8AAEC8 100%)',
    hasNightMode: false,
    hasWeatherEffects: true,
    practicalBackdrop: 'High plateau open area with dramatic open sky',
    layoutPreset: 'valley'
  }
];

export const getCityById = (id: string): CityData | undefined =>
  cities.find(c => c.id === id);

export const difficultyColors: Record<string, string> = {
  easy: '#4CAF50',
  medium: '#FF9800',
  hard: '#F44336',
  veryHard: '#9C27B0'
};

export const difficultyStars: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  veryHard: 4
};
