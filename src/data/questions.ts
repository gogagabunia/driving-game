// Theory exam question bank
// Format: { id, category, question_en, question_ka, options (A-D in both languages), correct, explanation_en, explanation_ka, image?, lawRef? }

export type QuestionCategory = 'signs' | 'rules' | 'safety' | 'vehicle' | 'firstAid' | 'ecology' | 'legal';

export type TheoryQuestion = {
  id: string;
  category: QuestionCategory;
  question_en: string;
  question_ka: string;
  options_en: [string, string, string, string]; // A, B, C, D
  options_ka: [string, string, string, string];
  correct: 0 | 1 | 2 | 3; // index 0=A, 1=B, 2=C, 3=D
  explanation_en: string;
  explanation_ka: string;
  image?: string;
  lawRef?: string;
};

export const questionBank: TheoryQuestion[] = [
  // ===== ROAD SIGNS =====
  {
    id: 'q001',
    category: 'signs',
    question_en: 'What does a triangular sign with a red border and an exclamation mark mean?',
    question_ka: 'რას ნიშნავს სამკუთხა ნიშანი წითელი კიდით და ძახილის ნიშნით?',
    options_en: ['No entry', 'General danger warning', 'Speed limit ahead', 'Mandatory stop'],
    options_ka: ['შესვლა აკრძალულია', 'ზოგადი საშიშროების გაფრთხილება', 'სიჩქარის შეზღუდვა წინ', 'სავალდებულო გაჩერება'],
    correct: 1,
    explanation_en: 'Triangular signs with a red border are warning signs. The exclamation mark indicates a general danger warning where the specific hazard is not indicated by another sign.',
    explanation_ka: 'სამკუთხა ნიშნები წითელი კიდით გამაფრთხილებელი ნიშნებია. ძახილის ნიშანი ზოგად საშიშ სიტუაციას მიუთითებს, სადაც კონკრეტული საფრთხე სხვა ნიშნით არ არის მითითებული.',
    lawRef: 'Article 8.1'
  },
  {
    id: 'q002',
    category: 'signs',
    question_en: 'What shape and color are prohibitory signs in Georgia?',
    question_ka: 'როგორი ფორმა და ფერი აქვს საქართველოში მაკრძალავ ნიშნებს?',
    options_en: ['Triangular, red border', 'Circular, red border or cross', 'Rectangular, blue background', 'Octagonal, red background'],
    options_ka: ['სამკუთხა, წითელი კიდე', 'მრგვალი, წითელი კიდე ან გადახაზვა', 'მართკუთხა, ლურჯი ფონი', 'რვაკუთხა, წითელი ფონი'],
    correct: 1,
    explanation_en: 'Prohibitory signs are circular with a red border or red diagonal cross. They forbid specific actions.',
    explanation_ka: 'მაკრძალავი ნიშნები მრგვალია წითელი კიდით ან წითელი დიაგონალური ხაზით. ისინი კონკრეტულ მოქმედებებს კრძალავს.',
    lawRef: 'Article 8.3'
  },
  {
    id: 'q003',
    category: 'signs',
    question_en: 'A round blue sign with a white arrow pointing right means:',
    question_ka: 'მრგვალი ლურჯი ნიშანი თეთრი ისრით მარჯვნივ ნიშნავს:',
    options_en: ['You may turn right', 'No left turn', 'Mandatory direction — turn right only', 'Recommended direction'],
    options_ka: ['შეგიძლია მარჯვნივ მოხვიო', 'მარცხნივ შემობრუნება აკრძალულია', 'სავალდებულო მიმართულება — მხოლოდ მარჯვნივ', 'რეკომენდებული მიმართულება'],
    correct: 2,
    explanation_en: 'Blue circular signs with white symbols are mandatory signs. A right arrow means you must turn right — no other direction is permitted.',
    explanation_ka: 'ლურჯი მრგვალი ნიშნები თეთრი სიმბოლოებით სავალდებულო ნიშნებია. მარჯვენა ისარი ნიშნავს, რომ მხოლოდ მარჯვნივ უნდა მოხვიო.',
    lawRef: 'Article 8.4'
  },
  {
    id: 'q004',
    category: 'signs',
    question_en: 'What does the STOP sign require you to do?',
    question_ka: 'რის გაკეთებას გავალდებულებს STOP ნიშანი?',
    options_en: ['Slow down and give way if necessary', 'Come to a complete stop and give way to all traffic', 'Stop only if there is traffic coming', 'Reduce speed to 20 km/h'],
    options_ka: ['შეანელე და გზა დაუთმე საჭიროების შემთხვევაში', 'სრულად გაჩერდი და ყველა მოძრავ მანქანას გზა დაუთმე', 'გაჩერდი მხოლოდ თუ მოდის მანქანა', 'სიჩქარე 20 კმ/სთ-მდე შეამცირე'],
    correct: 1,
    explanation_en: 'The STOP sign requires a complete stop at the stop line. You must give way to all traffic on the intersecting road before proceeding.',
    explanation_ka: 'STOP ნიშანი სავალდებულო სრულ გაჩერებას მოითხოვს გაჩერების ხაზთან. გაგრძელებამდე უნდა გზა დაუთმო ყველა მომავალ მანქანას.',
    lawRef: 'Article 16.1'
  },
  {
    id: 'q005',
    category: 'signs',
    question_en: 'A yellow diamond-shaped sign means:',
    question_ka: 'ყვითელი ბრილიანტის ფორმის ნიშანი ნიშნავს:',
    options_en: ['Warning: dangerous intersection ahead', 'You are on a priority road', 'End of priority road', 'Yield to oncoming traffic'],
    options_ka: ['გაფრთხილება: საშიში გზაჯვარედინი წინ', 'პრიორიტეტულ გზაზე ხარ', 'პრიორიტეტული გზის დასასრული', 'შემომავალ მოძრაობას გზა დაუთმე'],
    correct: 1,
    explanation_en: 'The yellow diamond sign indicates that you are on a priority road. Drivers entering from side roads must yield to you.',
    explanation_ka: 'ყვითელი ბრილიანტი მიუთითებს, რომ პრიორიტეტულ გზაზე ხარ. გვერდითი გზებიდან შემომავალი მანქანები ვალდებულნი არიან გზა დაგითმონ.',
    lawRef: 'Article 15.1'
  },
  // ===== TRAFFIC RULES =====
  {
    id: 'q006',
    category: 'rules',
    question_en: 'At a roundabout with no signs, who has priority?',
    question_ka: 'ნიშნების გარეშე რგოლიან გზაჯვარედინზე ვის აქვს პრიორიტეტი?',
    options_en: ['The vehicle entering the roundabout', 'The vehicle already inside the roundabout', 'The vehicle coming from the right', 'Whoever arrived first'],
    options_ka: ['რგოლში შემსვლელი მანქანა', 'უკვე რგოლში მყოფი მანქანა', 'მარჯვნიდან მომავალი მანქანა', 'ვინც პირველი მოვიდა'],
    correct: 1,
    explanation_en: 'In Georgia, vehicles already inside a roundabout have priority over vehicles entering, unless road signs indicate otherwise.',
    explanation_ka: 'საქართველოში რგოლში უკვე მყოფ მანქანას აქვს პრიორიტეტი შემომავლებთან მიმართებაში, თუ საგზაო ნიშნები სხვას არ მიუთითებს.',
    lawRef: 'Article 42.3'
  },
  {
    id: 'q007',
    category: 'rules',
    question_en: 'At an uncontrolled intersection, who has priority?',
    question_ka: 'არარეგულირებულ გზაჯვარედინზე ვის აქვს პრიორიტეტი?',
    options_en: ['The vehicle going straight', 'The vehicle on the left', 'The vehicle on the right (right-hand priority)', 'The faster vehicle'],
    options_ka: ['პირდაპირ მიმავალი მანქანა', 'მარცხნიდან მომავალი მანქანა', 'მარჯვნიდან მომავალი მანქანა (მარჯვენა ხელის წესი)', 'უფრო სწრაფი მანქანა'],
    correct: 2,
    explanation_en: 'At uncontrolled intersections, the vehicle coming from the right has priority (right-hand priority rule).',
    explanation_ka: 'არარეგულირებულ გზაჯვარედინზე, მარჯვნიდან მომავალ მანქანას აქვს პრიორიტეტი (მარჯვენა ხელის წესი).',
    lawRef: 'Article 36.1'
  },
  {
    id: 'q008',
    category: 'rules',
    question_en: 'You want to turn left at an intersection. An oncoming vehicle is going straight. Who has priority?',
    question_ka: 'გინდა მარცხნივ გახვე გზაჯვარედინზე. შემომავალი მანქანა პირდაპირ მიდის. ვის აქვს პრიორიტეტი?',
    options_en: ['You, because you are turning', 'The oncoming vehicle going straight', 'Whoever signals first', 'Both must stop and negotiate'],
    options_ka: ['შენ, რადგან მოხვევ', 'შემომავალი პირდაპირ მოძრავი მანქანა', 'ვინც პირველი მისცა სიგნალი', 'ორივემ უნდა გაჩერდეს და შეთანხმდეს'],
    correct: 1,
    explanation_en: 'Oncoming vehicles going straight always have priority over vehicles turning left. You must wait until it is safe to turn.',
    explanation_ka: 'შემომავალ პირდაპირ მოძრავ მანქანას ყოველთვის აქვს პრიორიტეტი მარცხნივ მომხვევ მანქანასთან შედარებით. უნდა დაელოდო, სანამ მოხვევა უსაფრთხო გახდება.',
    lawRef: 'Article 37.2'
  },
  {
    id: 'q009',
    category: 'rules',
    question_en: 'When must you give way to pedestrians?',
    question_ka: 'როდის უნდა დაუთმო გზა ქვეითთა?',
    options_en: ['Only when they are on a zebra crossing with lights', 'Only when a traffic officer signals', 'At all marked and unmarked pedestrian crossings', 'Only in school zones'],
    options_ka: ['მხოლოდ შუქნიანი ზებრაზე', 'მხოლოდ სამოძრაო პოლიციის სიგნალზე', 'ყველა მონიშნულ და ნიშნებიანი ქვეითთა გადასასვლელზე', 'მხოლოდ სასკოლო ზონებში'],
    correct: 2,
    explanation_en: 'Pedestrians always have the right of way at all marked crossings. You must slow down and give way whenever pedestrians are crossing or about to cross.',
    explanation_ka: 'ქვეითთა ყოველთვის აქვთ პრიორიტეტი ყველა მონიშნულ გადასასვლელზე. ყოველთვის უნდა შეანელო და გზა დაუთმო.',
    lawRef: 'Article 60.1'
  },
  {
    id: 'q010',
    category: 'rules',
    question_en: 'What is the correct procedure when an emergency vehicle with siren approaches?',
    question_ka: 'რა უნდა გააკეთო, როდესაც სირენ-ჩართული სამსახურებრივი მანქანა უახლოვდება?',
    options_en: ['Speed up to get out of the way faster', 'Move to the right side of the road and stop if necessary', 'Stop immediately wherever you are', 'Flash your headlights and continue'],
    options_ka: ['დააჩქარე, რომ გზა სწრაფად გაათავისუფლო', 'გადაიხვიე მარჯვნივ და საჭიროების შემთხვევაში გაჩერდი', 'დაუყოვნებლივ გაჩერდი სადაც ხარ', 'ფარები მოციმციმე და გააგრძელე'],
    correct: 1,
    explanation_en: 'When an emergency vehicle with sirens/lights approaches, you must move to the right side of the road and stop if necessary to allow it to pass.',
    explanation_ka: 'სამსახურებრივი მანქანის მიახლოებისას სირენი/ფარებით, უნდა გადახვიდე მარჯვნივ და საჭიროების შემთხვევაში გაჩერდე, რათა გაუშვა.',
    lawRef: 'Article 3.1'
  },
  // ===== SAFETY =====
  {
    id: 'q011',
    category: 'safety',
    question_en: 'What is the minimum safe following distance at 60 km/h?',
    question_ka: 'რა არის მინიმალური უსაფრთხო დისტანცია 60 კმ/სთ სიჩქარეზე?',
    options_en: ['15 meters', '20 meters', '30 meters', '50 meters'],
    options_ka: ['15 მეტრი', '20 მეტრი', '30 მეტრი', '50 მეტრი'],
    correct: 2,
    explanation_en: 'At 60 km/h, the minimum safe following distance is 30 meters. A useful rule is to keep at least 1 meter of distance for every km/h of speed.',
    explanation_ka: '60 კმ/სთ-ზე მინიმალური უსაფრთხო დისტანცია 30 მეტრია. სასარგებლო წესი: მინიმუმ 1 მეტრი თითო კმ/სთ სიჩქარეზე.',
    lawRef: 'Article 17.1'
  },
  {
    id: 'q012',
    category: 'safety',
    question_en: 'What is the speed limit on Georgian motorways (highways) unless otherwise signed?',
    question_ka: 'რა სიჩქარის ლიმიტია საქართველოს ავტომაგისტრალებზე, თუ სხვა ნიშანი არ არის?',
    options_en: ['90 km/h', '100 km/h', '110 km/h', '120 km/h'],
    options_ka: ['90 კმ/სთ', '100 კმ/სთ', '110 კმ/სთ', '120 კმ/სთ'],
    correct: 3,
    explanation_en: 'The default speed limit on Georgian motorways is 120 km/h unless signs indicate otherwise.',
    explanation_ka: 'საქართველოს ავტომაგისტრალებზე ნაგულისხმევი სიჩქარის ლიმიტი 120 კმ/სთ-ია, თუ ნიშნები სხვას არ მიუთითებს.',
    lawRef: 'Article 25.3'
  },
  {
    id: 'q013',
    category: 'safety',
    question_en: 'What is the speed limit in a residential (living) zone in Georgia?',
    question_ka: 'რა სიჩქარის ლიმიტია საცხოვრებელ ზონაში საქართველოში?',
    options_en: ['10 km/h', '20 km/h', '30 km/h', '40 km/h'],
    options_ka: ['10 კმ/სთ', '20 კმ/სთ', '30 კმ/სთ', '40 კმ/სთ'],
    correct: 1,
    explanation_en: 'In residential zones (living zones), the speed limit is 20 km/h. Pedestrians and children playing have absolute priority.',
    explanation_ka: 'საცხოვრებელ ზონაში სიჩქარის ლიმიტი 20 კმ/სთ-ია. ქვეითებს და თამაშობ ბავშვებს აქვთ სრული პრიორიტეტი.',
    lawRef: 'Article 26.1'
  },
  {
    id: 'q014',
    category: 'safety',
    question_en: 'Is it permitted to use a mobile phone while driving in Georgia?',
    question_ka: 'ნებადართულია მართვის დროს მობილური ტელეფონის გამოყენება საქართველოში?',
    options_en: ['Yes, if you use one hand', 'Yes, for short calls only', 'No, unless using a hands-free device', 'Yes, at low speeds only'],
    options_ka: ['კი, ერთი ხელით', 'კი, მხოლოდ მოკლე ზარებისთვის', 'არა, გარდა ხელთავისუფალი მოწყობილობის', 'კი, მხოლოდ დაბალ სიჩქარეზე'],
    correct: 2,
    explanation_en: 'Using a handheld mobile phone while driving is prohibited. Only hands-free devices (Bluetooth headsets, car speakerphone) are permitted.',
    explanation_ka: 'მართვის დროს ხელში მობილური ტელეფონის გამოყენება კრძალია. დასაშვებია მხოლოდ ხელთავისუფალი მოწყობილობები.',
    lawRef: 'Article 13.1'
  },
  {
    id: 'q015',
    category: 'safety',
    question_en: 'When is it mandatory to wear a seatbelt?',
    question_ka: 'როდის არის სავალდებულო უსაფრთხოების ღვედის გამოყენება?',
    options_en: ['Only on motorways', 'Only for the driver', 'For the driver and all passengers at all times', 'Only when children are in the car'],
    options_ka: ['მხოლოდ ავტომაგისტრალებზე', 'მხოლოდ მძღოლისთვის', 'მძღოლისა და ყველა მგზავრისთვის ყოველთვის', 'მხოლოდ ბავშვების ყოფნისას'],
    correct: 2,
    explanation_en: 'Wearing a seatbelt is mandatory for the driver and all passengers at all times when the vehicle is in motion.',
    explanation_ka: 'უსაფრთხოების ღვედი სავალდებულოა მძღოლისა და ყველა მგზავრისთვის ყოველთვის, სანამ მანქანა მოძრაობს.',
    lawRef: 'Article 12.1'
  },
  // ===== VEHICLE KNOWLEDGE =====
  {
    id: 'q016',
    category: 'vehicle',
    question_en: 'When should you turn on your headlights?',
    question_ka: 'როდის უნდა ჩართო ფარები?',
    options_en: ['Only at night in the city', 'At night and in poor visibility conditions, and always outside city limits', 'Only in tunnels', 'Only when it is raining'],
    options_ka: ['მხოლოდ ღამით ქალაქში', 'ღამით და ცუდი ხილვადობისას, და ყოველთვის დასახლების გარეთ', 'მხოლოდ გვირაბებში', 'მხოლოდ წვიმისას'],
    correct: 1,
    explanation_en: 'Headlights are required at night, in poor visibility (fog, heavy rain, snow), and at all times when driving outside city limits in Georgia.',
    explanation_ka: 'ფარები სავალდებულოა ღამით, ცუდი ხილვადობისას (ნისლი, ძლიერი წვიმა, თოვლი) და ყოველთვის დასახლების ფარგლებს გარეთ.',
    lawRef: 'Article 20.1'
  },
  {
    id: 'q017',
    category: 'vehicle',
    question_en: 'What is the legal minimum tread depth for car tyres in Georgia?',
    question_ka: 'რა არის სამართლებრივი მინიმალური პროტექტორის სიღრმე სამგზავრო მანქანის საბურავებისთვის?',
    options_en: ['0.8 mm', '1.0 mm', '1.6 mm', '3.0 mm'],
    options_ka: ['0.8 მმ', '1.0 მმ', '1.6 მმ', '3.0 მმ'],
    correct: 2,
    explanation_en: 'The legal minimum tread depth for passenger car tyres is 1.6 mm. Driving with worn tyres is dangerous and illegal.',
    explanation_ka: 'სამგზავრო მანქანის საბურავებისთვის კანონიერი მინიმალური პროტექტორის სიღრმე 1.6 მმ-ია. ცვეთილ საბურავებზე მართვა საშიში და უკანონოა.',
    lawRef: 'Article 22.4'
  },
  // ===== FIRST AID =====
  {
    id: 'q018',
    category: 'firstAid',
    question_en: 'You arrive at a traffic accident scene. What is the correct order of actions?',
    question_ka: 'ჩამოხვედი ავტოავარიის ადგილზე. რა არის ქმედებების სწორი თანმიმდევრობა?',
    options_en: [
      'Call police → Move casualties → Secure scene',
      'Secure scene → Call 112 → Provide first aid if safe',
      'Take photos → Call insurance → Wait for police',
      'Move vehicles → Provide first aid → Call police'
    ],
    options_ka: [
      'დაურეკე პოლიციას → გადაიყვანე დაშავებულები → უზრუნველყავი ადგილი',
      'უზრუნველყავი ადგილი → დაურეკე 112 → გაუწიე პირველი დახმარება თუ უსაფრთხოა',
      'გადაიღე ფოტოები → დაურეკე სადაზღვევო → დაელოდე პოლიციას',
      'გადაიყვანე მანქანები → გაუწიე პირველი დახმარება → დაურეკე პოლიციას'
    ],
    correct: 1,
    explanation_en: 'The correct order is: secure the scene (warning triangle, hazard lights), call 112 (emergency services), then provide first aid if it is safe to do so. Never move casualties unless they are in immediate danger.',
    explanation_ka: 'სწორი თანმიმდევრობა: უზრუნველყავი ადგილი (სამკუთხედი, ავარიული შუქები), დაურეკე 112, შემდეგ გაუწიე პირველი დახმარება თუ უსაფრთხოა. არასოდეს გადაიყვანო დაშავებულები, გარდა სასიცოცხლო საფრთხის შემთხვევაში.',
    lawRef: 'Article 75.1'
  },
  {
    id: 'q019',
    category: 'firstAid',
    question_en: 'If a person is unconscious but breathing after an accident, what position should they be placed in?',
    question_ka: 'თუ ავარიის შემდეგ ადამიანი გონება დაკარგული მაგრამ სუნთქავს, რა პოზაში უნდა მოათავსო?',
    options_en: ['Flat on their back', 'Sitting up', 'Recovery position (on their side)', 'Face down'],
    options_ka: ['ზურგზე გაშოტილ', 'მჯდომ პოზაში', 'გამოჯანმრთელების პოზიცია (გვერდზე)', 'სახით ქვემოთ'],
    correct: 2,
    explanation_en: 'An unconscious but breathing person should be placed in the recovery position (on their side) to prevent choking if they vomit.',
    explanation_ka: 'გონებადაკარგული მაგრამ სუნთქავი ადამიანი გამოჯანმრთელების პოზიციაში (გვერდზე) უნდა მოათავსო, ღებინების შემთხვევაში ასფიქსიის თავიდან ასაცილებლად.',
    lawRef: 'First Aid Guidelines'
  },
  // ===== ECOLOGY =====
  {
    id: 'q020',
    category: 'ecology',
    question_en: 'Which driving habit most reduces fuel consumption and emissions?',
    question_ka: 'რომელი მართვის ჩვევა ყველაზე მეტად ამცირებს საწვავის მოხმარებას და გამონაბოლქვს?',
    options_en: ['Driving at high RPM', 'Smooth acceleration and early gear changes', 'Keeping engine warm by idling', 'Using air conditioning at all times'],
    options_ka: ['მაღალ ბრუნვებზე მართვა', 'გლუვი აჩქარება და ადრე გადაცემის შეცვლა', 'ძრავის გათბობა ტრიალით', 'კლიმატ-კონტროლის მუდმივი გამოყენება'],
    correct: 1,
    explanation_en: 'Smooth acceleration and changing up gears early (at lower RPM) significantly reduces fuel consumption and CO2 emissions — known as eco-driving.',
    explanation_ka: 'გლუვი აჩქარება და ადრე გადაცემის ზემოთ შეცვლა (დაბალ ბრუნვებზე) მნიშვნელოვნად ამცირებს საწვავის მოხმარებასა და CO2 გამონაბოლქვს.',
    lawRef: 'Eco-driving guidelines'
  },
  // ===== LEGAL =====
  {
    id: 'q021',
    category: 'legal',
    question_en: 'What is the legal blood alcohol limit for a driver who has held their license for less than 2 years in Georgia?',
    question_ka: 'რა არის კანონიერი სისხლში ალკოჰოლის ნორმა მძღოლისთვის, ვინც 2 წელზე ნაკლები ხნის მოწმობა აქვს?',
    options_en: ['0.2‰ (per mille)', '0.5‰', '0.0‰ (zero tolerance)', '0.8‰'],
    options_ka: ['0.2‰ (პრომილე)', '0.5‰', '0.0‰ (ნულოვანი ტოლერანტობა)', '0.8‰'],
    correct: 2,
    explanation_en: 'In Georgia, drivers with less than 2 years of driving experience have a zero-tolerance alcohol policy — 0.0‰. Experienced drivers are allowed up to 0.3‰.',
    explanation_ka: 'საქართველოში 2 წელზე ნაკლები გამოცდილების მქონე მძღოლებს ალკოჰოლის ნულოვანი ტოლერანტობა ეხება — 0.0‰. გამოცდილ მძღოლებს 0.3‰-მდე ეხება.',
    lawRef: 'Article 95.1'
  },
  {
    id: 'q022',
    category: 'legal',
    question_en: 'What document must you always carry while driving?',
    question_ka: 'რომელი დოკუმენტი უნდა ყოველთვის თან გქონდეს მართვის დროს?',
    options_en: ['Only your driver\'s license', 'Driver\'s license and vehicle registration', 'Driver\'s license, vehicle registration, and insurance certificate', 'Passport only'],
    options_ka: ['მხოლოდ მართვის მოწმობა', 'მართვის მოწმობა და სარეგისტრაციო მოწმობა', 'მართვის მოწმობა, სარეგისტრაციო მოწმობა და სადაზღვევო პოლისი', 'მხოლოდ პასპორტი'],
    correct: 2,
    explanation_en: 'When driving, you must carry your driver\'s license, vehicle registration document (technical passport), and valid insurance certificate (mandatory MTPL insurance).',
    explanation_ka: 'მართვის დროს სავალდებულოა თან გქონდეს: მართვის მოწმობა, სარეგისტრაციო მოწმობა (ტექ-პასპორტი) და მოქმედი სადაზღვევო პოლისი (OSAGO).',
    lawRef: 'Article 10.1'
  },
  {
    id: 'q023',
    category: 'rules',
    question_en: 'You are driving on a two-lane road. When is overtaking permitted?',
    question_ka: 'ორზოლიან გზაზე მართავ. როდის არის სხვას გასწრება ნებადართული?',
    options_en: ['At any time if you drive fast', 'When there is a solid yellow center line', 'When there is a broken center line and the road ahead is clear', 'Only on dual carriageways'],
    options_ka: ['ნებისმიერ დროს თუ სწრაფად მართავ', 'მყარი ყვითელი ცენტრალური ხაზის არსებობისას', 'შესაფერხებელი ცენტრალური ხაზის და თავისუფალი გზის შემთხვევაში', 'მხოლოდ ორკარიბჭიან გზებზე'],
    correct: 2,
    explanation_en: 'Overtaking is only permitted when the center line is broken (dashed) and you have a clear view that the road ahead is safe. A solid line means NO overtaking.',
    explanation_ka: 'გასწრება ნებადართულია მხოლოდ მაშინ, როდესაც ცენტრალური ხაზი შეფერხებულია (ჰეჭვური) და წინ გზა ნათლად ჩანს. მყარი ხაზი ნიშნავს გასწრება ᲙᲠᲫᲐᲚᲘᲐ.',
    lawRef: 'Article 48.1'
  },
  {
    id: 'q024',
    category: 'rules',
    question_en: 'What must you do when approaching a railway crossing without barriers?',
    question_ka: 'რა უნდა გააკეთო, როცა ბარიერების გარეშე სარკინიგზო გადასასვლელს უახლოვდები?',
    options_en: ['Cross quickly to avoid delays', 'Slow down and cross if you can see no train coming', 'Stop completely, look both ways, and only cross when it is safe', 'Honk your horn and cross'],
    options_ka: ['სწრაფად გაიარე, რომ დაყოვნება თავიდან აიცილო', 'შეანელე და გაიარე, თუ მატარებელი არ ჩანს', 'სრულად გაჩერდი, ორივე მხარეს გახედე, გაიარე მხოლოდ სრული უსაფრთხოებისას', 'სიგნალი მიეცი და გაიარე'],
    correct: 2,
    explanation_en: 'At railway crossings without barriers, you must stop completely before the crossing, look both ways to check for trains, and only cross when it is completely safe.',
    explanation_ka: 'ბარიერების გარეშე სარკინიგზო გადასასვლელზე, სრულად გაჩერდი გადასასვლელის წინ, ორივე მხარეს გახედი მატარებლის შესამოწმებლად და გაიარე მხოლოდ სრული უსაფრთხოებისას.',
    lawRef: 'Article 57.1'
  },
  {
    id: 'q025',
    category: 'safety',
    question_en: 'What is the correct action when driving in heavy fog?',
    question_ka: 'რა არის სწორი ქმედება მძიმე ნისლში მართვისას?',
    options_en: ['Use full beam headlights to see further', 'Turn on fog lights, reduce speed, increase following distance', 'Flash hazard lights and drive at normal speed', 'Stop immediately on the road'],
    options_ka: ['ჩართე სრული სხივების ფარები, რომ უფრო შორს დაინახო', 'ჩართე სანისლე ფარები, შეამცირე სიჩქარე, გაზარდე დისტანცია', 'ჩართე ავარიული შუქები და ჩვეული სიჩქარით მართე', 'დაუყოვნებლივ გაჩერდი გზაზე'],
    correct: 1,
    explanation_en: 'In heavy fog, use fog lights (not full beam — they cause glare), significantly reduce speed, and increase your following distance to compensate for reduced visibility.',
    explanation_ka: 'მძიმე ნისლში ჩართე სანისლე ფარები (არა სრული სხივები — ციმციმებს იწვევს), მნიშვნელოვნად შეამცირე სიჩქარე და გაზარდე დისტანცია ხილვადობის შემცირების გამო.',
    lawRef: 'Article 21.3'
  },
  {
    id: 'q026',
    category: 'rules',
    question_en: 'Where is it forbidden to park?',
    question_ka: 'სად არის პარკინგი აკრძალული?',
    options_en: [
      'In front of driveways and within 5m of intersections',
      'Only in no-parking zones',
      'On all city streets',
      'Only near schools'
    ],
    options_ka: [
      'სასახლის შესასვლელებთან და გზაჯვარედინებიდან 5 მ-ის ფარგლებში',
      'მხოლოდ პარკინგ-აკრძალვის ზონებში',
      'ყველა ქალაქის ქუჩაზე',
      'მხოლოდ სკოლებთან'
    ],
    correct: 0,
    explanation_en: 'Parking is forbidden in front of driveways, within 5m of intersections, at pedestrian crossings, bus stops, fire hydrants, and anywhere that would obstruct traffic.',
    explanation_ka: 'პარკინგი კრძალია შესასვლელების წინ, გზაჯვარედინებიდან 5 მ-ის ფარგლებში, ქვეითთა გადასასვლელებზე, ავტობუსის გაჩერებებთან, ხანძარსაქრობ ჰიდრანტებთან და ნებისმიერ ადგილას, სადაც მოძრაობას შეაფერხებს.',
    lawRef: 'Article 73.1'
  },
  {
    id: 'q027',
    category: 'signs',
    question_en: 'A road sign shows "50" inside a red circle. What does this mean?',
    question_ka: 'საგზაო ნიშანი "50"-ს გვიჩვენებს წითელ წრეში. რას ნიშნავს ეს?',
    options_en: ['Minimum speed: 50 km/h', 'Maximum speed: 50 km/h', 'Recommended speed: 50 km/h', 'Speed warning: 50 km/h ahead'],
    options_ka: ['მინიმალური სიჩქარე: 50 კმ/სთ', 'მაქსიმალური სიჩქარე: 50 კმ/სთ', 'რეკომენდებული სიჩქარე: 50 კმ/სთ', 'სიჩქარის გაფრთხილება: 50 კმ/სთ წინ'],
    correct: 1,
    explanation_en: 'A number inside a red circle is a speed limit (maximum speed) sign. You must not exceed 50 km/h in this zone.',
    explanation_ka: 'ნომერი წითელ წრეში სიჩქარის ლიმიტის (მაქსიმალური სიჩქარე) ნიშანია. ამ ზონაში 50 კმ/სთ-ს არ უნდა გადააჭარბო.',
    lawRef: 'Article 25.1'
  },
  {
    id: 'q028',
    category: 'legal',
    question_en: 'What is the minimum age to obtain a Category B (car) driving license in Georgia?',
    question_ka: 'რა არის მინიმალური ასაკი B კატეგორიის (მსუბუქი ავტომობილი) მართვის მოწმობისთვის საქართველოში?',
    options_en: ['16 years', '17 years', '18 years', '21 years'],
    options_ka: ['16 წელი', '17 წელი', '18 წელი', '21 წელი'],
    correct: 2,
    explanation_en: 'In Georgia, the minimum age to obtain a Category B (passenger car) driving license is 18 years.',
    explanation_ka: 'საქართველოში B კატეგორიის (სამგზავრო ავტომობილი) მართვის მოწმობის მინიმალური ასაკი 18 წელია.',
    lawRef: 'Article 100.1'
  },
  {
    id: 'q029',
    category: 'firstAid',
    question_en: 'What is the emergency services number in Georgia?',
    question_ka: 'რა არის სასწრაფო სამსახურის ნომერი საქართველოში?',
    options_en: ['911', '999', '112', '103'],
    options_ka: ['911', '999', '112', '103'],
    correct: 2,
    explanation_en: 'In Georgia, 112 is the unified emergency number for police, ambulance, and fire services.',
    explanation_ka: 'საქართველოში 112 არის გაერთიანებული სასწრაფო ნომერი პოლიციისთვის, სასწრაფო სამედიცინო დახმარებისთვის და მეხანძრეებისთვის.',
    lawRef: 'Emergency Services Law'
  },
  {
    id: 'q030',
    category: 'rules',
    question_en: 'What does a solid yellow (double) center line mean?',
    question_ka: 'რას ნიშნავს მყარი ყვითელი (ორმაგი) ცენტრალური ხაზი?',
    options_en: ['Overtaking is restricted to one side only', 'No overtaking from either side', 'Overtaking is permitted for larger vehicles only', 'End of overtaking restriction'],
    options_ka: ['გასწრება შეზღუდულია მხოლოდ ერთი მხრიდან', 'ორივე მხრიდან გასწრება კრძალია', 'გასწრება ნებადართულია მხოლოდ მსხვილი მანქანებისთვის', 'გასწრების შეზღუდვის დასასრული'],
    correct: 1,
    explanation_en: 'A solid double yellow center line prohibits overtaking from both directions. Neither you nor oncoming traffic may cross it to overtake.',
    explanation_ka: 'მყარი ორმაგი ყვითელი ცენტრალური ხაზი ორივე მხრიდან გასწრებას კრძალავს. არც შენ, არც შემომავალ მოძრაობას არ შეუძლია გადაკვეთა.',
    lawRef: 'Article 49.2'
  }
];
