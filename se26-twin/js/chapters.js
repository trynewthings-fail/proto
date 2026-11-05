// Chapters: text, camera view, which layers and labels show, and what animates.
// Facts come from museum-brain.md (tnt.local read-only 2026-10-29 + the public SE26 case study).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ALL = [
  {
    id: 'start', nav: 'Start', cover: true,
    title: 'Inside',
    body: '<p>Inside är en digital tvilling av SE26, utställningen om Skellefteås omställning på Skellefteå museum under Society Expo 2026. Gå runt i utställningen och se vad varje installation gör. Följ hur allt hänger ihop: från din hand till ljus och ljud, ut till staden och älven och in till atomerna.</p>',
    flow: 'din hand → ljus → kub → molnet → växthuset',
    view: { at: 'museum', d: 1300, az: -0.5, el: 0.62 },
    labels: ['city'], show: { lift: 0 },
  },
  {
    id: 'plats', nav: 'Platsen',
    hops: ['kusten', 'alvdalen'],   // scale hops (js/scales.js)
    src: [{ t: 'fallstudien trynewthings.fail/se26 och skelleftea.se (2026)', level: 'belagd' }],
    tags: ['Skellefteå', 'Nordanå'],
    title: 'Utställningen ligger på andra våningen i Skellefteå museum',
    body: '<p>SE26 är utställningsdelen av Society Expo 2026, Skellefteås satsning på hållbar samhällsomställning. Try New Things har formgett och byggt den på uppdrag av Skellefteå kommun, Skellefteå museum och Skellefteå Kraft.</p><p>Staden runt omkring är data från Skellefteå-tvillingen: byggnader från OpenStreetMap med höjder från Lantmäteriets laserdata, vägar och älven. Museet är placerat från OSM-noden för Skellefteå Museum.</p>',
    facts: [['Yta', '380 m², fyra rum'], ['Öppnade', '27 maj 2026, pågår till januari 2027'], ['Besökare', 'cirka 20 000 hittills'], ['Innehåll', 'över 50 interaktiva installationer i hela utställningen enligt fallstudien; här visas ett urval']],
    view: { at: 'museum', d: 190, az: -0.75, el: 0.5 },
    labels: ['city'], show: { lift: 0, museum: true },
  },
  {
    id: 'rum', nav: 'Fyra rum',
    src: [{ t: 'Unreal-modellen LV_SE26_Master', level: 'belagd' }, { t: 'OpenStreetMap och Lantmäteriet', level: 'belagd' }],
    tags: ['380 m²', 'Rum 1–4'],
    title: 'Fyra rum på andra våningen i Skellefteå museum',
    body: '<p>Här lyfts våningen upp ur museet så att vi kan titta in. Du går från rum 1 till rum 4, från Urtiden till Framtiden.</p><p>Rum 4 är byggt runt ett moln i taket, ett växthus och fem stationer. Varje station har en kub i sin färg: Bostäder, Rörlighet, Kompetens, Social hållbarhet och Klimat & miljö.</p><p>Modellen är utställningens egen ritning, förenklad till skiss. Staden runt museet bygger på öppna data från OpenStreetMap och Lantmäteriet.</p>',
    facts: [['Rum 1', 'Urtiden · korridoren med floden, skogen och vattentunneln'], ['Rum 2', 'Dåtiden · Boliden, Maskinisterna, Alimak, Dokumentärväggen'], ['Rum 3', 'Nutiden · Dialogen, Framtidsbåset, Tvivlarnas kulle'], ['Rum 4', 'Framtiden · växthuset, molnet, kuberna, 40+ initiativ']],
    view: { at: [-3.5, 0, 1.5], d: 80, az: -0.45, el: 0.9 },
    labels: ['rooms'], show: { lift: 1 },
  },
  {
    id: 'ide', nav: 'Idén',
    hops: ['kloroplast'],   // scale hops (js/scenes/natur.js)
    src: [{ t: 'fallstudien trynewthings.fail/se26 och skelleftea.se (2026)', level: 'belagd' }, { t: 'Peders export av koden (30 okt 2026)', level: 'belagd' }],
    focus: 'vaxthuset',   // lit like its card in Utforska
    tags: ['Koncept', 'Allt hänger ihop'],
    title: 'Idén: energin från fyra tider samlas i växthuset',
    body: '<p>SE26 berättar om Skellefteå genom energi, ett rum i taget.</p><p>Urtiden visar naturens energi: berget, älven och skogen. Dåtiden visar historiens energi: människorna som byggde kraftverk, gruvor och hissar. Nutiden visar samhällets energi: det folk tycker och drömmer om. Framtiden visar framtidens energi: det som byggs nu.</p><p>Det du gör blir en del av energin. I rum 1–3 svarar ljus och ljud där du står; i rum 4 går energin hela vägen till växthuset. Där går en ljuspuls längs en tråd till en kub, vidare till molnet i taket och till sist till växthuset, som lyser upp.</p>',
    flow: 'interaktion → tråd → kub → molnet → växthuset',
    view: { at: [3.2, 0.8, 6.6], d: 30, az: 0.35, el: 0.95 },
    labels: ['inst'], show: { lift: 1 },
    enter: (x) => { x.ambient(true, { viaHub: false, every: 700 }); },
  },
  {
    id: 'hur', nav: 'Så fungerar det',
    src: [{ t: 'tnt.local, avläst 29 okt 2026', level: 'belagd' }],
    tags: ['Museum Brain'],
    title: 'Bakom väggarna finns ett nervsystem',
    body: '<p>Sensorer känner av besökarna: avstånd, rörelse, knapptryck, röster. Små datorer skickar korta meddelanden till en central dator, tnt.local, som tänder ljus, spelar ljud och frågar AI. Hela utställningen pratar med sig själv. Därför kan ett tryck i ett rum synas i ett annat.</p><p>Eftersom allt ska kunna påverka allt går varje sensor och varje lampa genom samma meddelandebuss, MQTT. Reglerna för vilken sensor som tänder vilken lampa står i ett program som heter switchboarden. Bara händelser i rum 4 får molnet och växthuset att blinka. Maskinisterna, Alimak och Dialogen hörs ändå i rum 4, som ljud.</p><p>Bakom väggarna finns omkring 15 ESP32-kort och några Raspberry Pi som läser sensorerna. 27 WLED-styrenheter driver cirka 28 000 lysdioder, och smarta uttag från Shelly mäter och slår av och på. Mac mini och Windows-datorer kör musik, video och spel, och två AI-flöden går till tjänsten Berget.</p><p>Det systemet kallar vi Museum Brain. Det har en egen berättelse i Utforska.</p>',
    flow: 'besökare → sensor → MQTT → tnt.local → ljus · ljud · AI',
    extra: '<div class="big-n"><div><b>17 + 4</b><span>datorer + iPadar</span></div><div><b>15</b><span>ESP32-noder</span></div><div><b>27</b><span>WLED · ~28 000 lysdioder</span></div></div><div class="hops story-links"><button data-story="brain"><i>berättelse</i>Museum Brain: systemet steg för steg</button><button data-story="explore"><i>nästa</i>Utforska utställningen</button></div>',
    view: { at: [-0.5, 3, 2.1], d: 62, az: 0.6, el: 0.55 },
    labels: ['hubname'], show: { lift: 1, hub: true, wires: true },
  },
  {
    id: 'hjartat', nav: 'Hjärtat',
    hops: ['mqtt'],   // scale hops (js/scenes/fler.js)
    src: [{ t: 'tnt.local, avläst 29 okt 2026', level: 'belagd' }],
    tags: ['tnt.local', 'MQTT'],
    title: 'Alla signaler går via en Raspberry Pi som kallas tnt',
    body: '<p>I mitten av systemet sitter en liten dator, en Raspberry Pi, som teamet kallar hjärtat. Alla sensorer skickar sina signaler dit. Därifrån går besked ut till ljus, ljud och skärmar.</p><p>Här ritas den ovanför rummen så att man ser alla kopplingar. Den streckade linjen från varje sak är dess koppling till hjärtat.</p><p><b>tnt.local</b> (192.168.51.41) kör mosquitto som MQTT-broker. Webbsidor ansluter via WebSocket på port 9001. Sidorna skickar också meddelanden via HTTP POST (mosquitto_pub) som reserv när WebSocket krånglar. Shelly-uttag styrs alltid från servern, eftersom klienter utanför tnt-nätet inte når dem.</p>',
    flow: 'sensor → publish → mosquitto → subscribe → ljus · ljud · skärm',
    facts: [['Nät', '192.168.51.0/24 · *.local och *.tnt'], ['Broker', 'mosquitto · MQTT + WS :9001'], ['Ström', 'UPS: EcoFlow River 3 Plus']],
    view: { at: [-5.3, 8.4, 2.1], d: 13, az: -0.3, el: 0.78 },
    labels: ['hub'], show: { lift: 1, hub: true, wires: true },
    enter: (x) => { x.ambient(true, { every: 1300 }); },
  },
  {
    id: 'inuti', nav: 'Inuti tnt',
    src: [{ t: 'tnt.local, avläst 29 okt 2026', level: 'belagd' }],
    tags: ['Raspberry Pi', '7 tjänster'],
    title: 'Sju program på tnt har var sin uppgift',
    body: '<p>Ett program tar emot och skickar vidare alla meddelanden. Ett annat bestämmer vilka lampor som ska reagera. Ett sköter rattarna och taklamporna i rum 3, ett läser av elbilsladdaren, ett visar webbsidorna som personalen använder, och två håller koll på att allt fungerar.</p><p>Tjänsterna körs som systemd-enheter. <code>tnt-diagnose</code> startas regelbundet av en timer och gör en hälsokörning som tar cirka 34 sekunder. nginx skickar dessutom vidare <code>/dialogen</code> till Dialogens instrumentpanel på macmini1:8080.</p>',
    facts: [['mosquitto', 'MQTT-brokern, ryggraden'], ['nginx', 'webbserver, proxy, wss-brygga'], ['se26', 'main.py: rattar, tystnad, MiLight, nattsläckning'], ['emobility-bridge', 'läser elbilsladdarens Shelly-plugg'], ['switchboard', 'kopplar sensorer till ljus och rumsström'], ['mqtt-watcher', 'bevakar trafik och hjärtslag'], ['diagnose', 'hälsokörning + Slack-rapport']],
    view: { at: 'pi', d: 0.26, az: 0.85, el: 0.62 },
    labels: ['pi'], show: { lift: 1, hub: true },
  },
  {
    id: 'sensorer', nav: 'Sensorerna',
    hops: ['ultraljud', 'pir', 'esp32', 'knapp', 'mqtt'],   // scale hops (js/scales.js, js/scenes/)
    src: [{ t: 'tnt.local, avläst 29 okt 2026', level: 'belagd' }, { t: 'sensorernas platser i modellen', level: 'antagen' }],
    tags: ['ESP32', 'publish'],
    title: 'Sensorerna skickar korta meddelanden till tnt',
    body: '<p>Runt om i rummen sitter små kretskort (ESP32) med sensorer: ultraljud som mäter avstånd, rörelsevakter, knappar, en skakningssensor och magnetsensorer. När något händer skickar kortet ett kort meddelande till hjärtat.</p><p>Varje meddelande har ett ämne (vem det kommer från) och ett innehåll (vad som hände). De gröna lapparna i modellen är sådana meddelanden.</p><p>Korten rapporterar också OTA-status och händelser (ansluten, tappad, omstart). Den pratsammaste sensorn är <code>spinningboxes</code> med 475 000 meddelanden. Den mest tryckta saken i utställningen är Ja-knappen, <code>pushbutton1</code>, med cirka 79 000 meddelanden.</p>',
    flow: 'pushbutton1 → {"pressed": true}',
    facts: [['Sensornoder', '15 ESP32 (4 aktiva när datan hämtades)'], ['Typer', 'ultraljud, PIR, Hall-sensor (magnet), knapp, skak, ANT+']],
    view: { at: [-0.5, 0, 3], d: 56, az: 0.55, el: 0.8 },
    labels: ['sensors'], show: { lift: 1, hub: true, wires: true },
    enter: (x) => { x.ambient(true, { every: 1000 }); },
  },
  {
    id: 'ljus', nav: 'Ljus och ljud',
    hops: ['lysdiod', 'hogtalare', 'mikrofon'],   // scale hops (js/scales.js, js/scenes/)
    src: [{ t: 'tnt.local, avläst 29 okt 2026', level: 'belagd' }, { t: 'Peders export av koden (30 okt 2026)', level: 'belagd' }],
    tags: ['WLED', 'Shelly', 'Ableton'],
    title: 'Från tnt går besked ut till ljus, ljud och skärmar',
    body: '<p>När ett meddelande kommer in avgör program i hjärtat vad som ska hända: vilken ljusslinga som ska blinka och vilket ljud som ska spelas. Reglerna står i switchboarden på tnt. Slingorna i rum 1 och 2 styr den direkt, och slingorna i rum 3 och 4 ritas live av Resolume, som får en puls för varje händelse.</p><p>Ljuset styrs av små ljuskontroller (WLED) och strömmen av smarta uttag (Shelly). Ljudet kommer från små datorer som spelar ljudfiler eller skickar MIDI till musikprogrammet Ableton.</p><p>Rattarna <code>intensity/knob-1…8</code> sparas i brokern (retained) och glider tillbaka till standardnivån efter 15 minuter. Ratt 1 är låst, 2 och 3 är volymen i rum 1 och 2, 4 och 5 Dialogens arkiv och svar, och 6 rum 4. <code>system/silence</code> tystar rattarna 3–6, och på stängda dagar sätter switchboarden den själv. Tonerna <code>ljudkonst/note</code> är pentatoniska (C D E G B).</p>',
    facts: [['WLED', '27 kontroller · cirka 28 000 lysdioder'], ['Shelly', '12 pluggar och dimrar'], ['Resolume', 'ritar slingorna i rum 3 och 4 via Art-Net'], ['MiLight', 'rum 3, alltid strobe'], ['Ljud', 'rpi6 (6 kanaler) · rpi10 · macmini1 · macmini3 → Ableton']],
    view: { at: [-0.5, 0, 2.1], d: 56, az: -0.95, el: 0.76 },
    labels: ['fixtures'], show: { lift: 1, hub: true, wires: true },
    enter: (x) => { x.ambient(true, { every: 1000 }); },
  },
  {
    id: 'exempel', nav: 'Exempel: rutschkanan',
    hops: ['ultraljud', 'lysdiod'],   // scale hops (js/scales.js)
    src: [{ t: 'Peders export av koden (30 okt 2026)', level: 'belagd' }],
    focus: 'rutschkanan',   // lit like its card in Utforska
    tags: ['Rum 4', 'ultraljud1'],
    title: 'En signal steg för steg, från rutschkanan till växthuset',
    body: '<p>Rutschkanan heter ”Bli spillvärme!”.</p><p>Kortet räknar bara åkningen om någon kommer ner, stannar en kort stund och kanan sedan blir tom. Varje giltig åktur får klimatslingan att pulsera. Två sekunder senare blinkar molnet och växthuset, och det åskar i mitthögtalaren. Kommer tre åskor inom en halv sekund svarar växthuset med ett eget ljud.</p><p>Så här går signalen när ett barn åker:</p>',
    steps: ['Ett barn åker. ESP32-kortet ser att åkningen är giltig.', 'Kortet skickar <code>ultraljud1 {"event":"slide"}</code> till tnt.', 'Switchboarden skickar en puls till Resolume, som får klimatslingan att lysa längs kanan till klimatkuben.', 'Två sekunder senare blinkar molnet i taket, och switchboarden skickar <code>cloud</code>.', 'Växthuset blinkar samtidigt, och det åskar i mitthögtalaren.', 'Ljuddatorn rpi6 spelar en fågel i klimathörnet.'],
    view: { at: [0.6, 0.8, 7.6], d: 25, az: 0.35, el: 0.95 },
    labels: [], show: { lift: 1, hub: true, wires: false },
    enter: async (x) => { while (x.alive()) { await x.slideStory(x.step, x.alive); await sleep(800); } },
  },
  {
    id: 'dialogen', nav: 'Dialogen',
    hops: ['neuron'],   // scale hops (js/scales.js)
    src: [{ t: 'Dialogens admin på tnt.local, avläst 29 okt 2026', level: 'belagd' }],
    focus: 'dialogen',   // lit like its card in Utforska
    tags: ['Rum 3', 'AI', 'Berget'],
    title: 'Dialogen: AI granskar svaren innan de spelas upp',
    body: '<p>I rum 3 kan man lyssna på Skellefteåbors svar från 2013 och själv svara på samma tio frågor genom att prata i ett färgat rör. Svaret görs om till text och bedöms av en språkmodell. Godkända svar spelas upp för nästa besökare.</p><p>Tio mikrofoner, en per rör, lyssnar hela tiden, och tystnadsdetektering avgör när någon pratar. Det finns 20 högtalarkanaler (10 med svar från 2013, 10 med nya). En svensk talmodell är anpassad för lokala ortnamn. Språkmodellen ger varje svar ett betyg från 1 till 10, och redan 3 räcker för att svaret sparas. AI-beräkningarna görs hos AI-tjänsten Berget (EU), och allt säkerhetskopieras varje natt.</p>',
    steps: ['Någon pratar i rör 5: <code>speech/4</code>, och panelen lyser.', 'macmini1 spelar in (recorder.py).', 'Ljudet skickas till Berget AI.', 'Ljudet transkriberas, och en språkmodell (LLM) ger poäng.', 'Godkända svar läggs i rotation för frågan.', 'Svaret spelas upp för nästa besökare.'],
    extra: '<div class="pipe"><div>INSPELAT</div><div>GRANSKAS</div><div class="ok">GODKÄNT<b>558</b></div><div class="no">BORTSORTERAT<b>3 748</b></div></div><div class="big-n"><div><b>4,79 M</b><span>tokens totalt i Dialogen</span></div></div>',
    view: { at: [-12.3, 1, 5.3], d: 24, az: 0.35, el: 1.0 },
    shots: { close: { at: [-12.3, 1, 5.3], d: 24, az: 0.35, el: 1.0 }, wide: { w: [-380, 20, 1250], d: 4700, az: 2.75, el: 0.8, fogF: 6 } },
    labels: ['remote'], show: { lift: 1, hub: true, remote: true },
    enter: async (x) => { while (x.alive()) { await x.cloudTrip('dialog', x.step, x.alive); await sleep(900); } },
  },
  {
    id: 'baset', nav: 'Framtidsbåset',
    src: [{ t: 'inspelningsadmin på tnt.local, avläst 29 okt 2026', level: 'belagd' }],
    focus: 'framtidsbaset',   // lit like its card in Utforska
    tags: ['Rum 3 → Rum 4', 'youthrecorder'],
    title: 'Framtidsbåset: videomeddelanden från rum 3 visas i rum 4',
    body: '<p>I ett bås med röd ridå spelar besökare in ett kort videomeddelande om omställningen: vad vi ska börja med, sluta med eller fortsätta med. Videon görs om till text och modereras, dels med AI-stöd och dels av en människa. Godkända klipp visas i rummet intill, alltså ”i framtiden”.</p><p>ipad-recorder kör webbappen youthrecorder, och varje klipp får en förhandsvisningsfil. Kostnaden är uppskattad eftersom det saknas ett fakturerings-API. Största delen av kostnaden är transkribering, medan anropen till språkmodellen är billiga.</p>',
    steps: ['ipad-recorder filmar cirka 30 sekunder.', 'Videon skickas för transkribering.', 'Texten kommer tillbaka till tnt.', 'Moderering: godkänd eller avvisad.', 'ipad-player visar klippet i rum 4.'],
    extra: '<div class="pipe"><div>BÖRJA MED<b>890</b></div><div>SLUTA MED<b>123</b></div><div>FORTSÄTTA MED<b>259</b></div></div><div class="big-n"><div><b>1 272</b><span>videor · ca 5 GB</span></div><div><b>0,33 euro</b><span>AI-kostnad 30 dagar, båda flödena</span></div></div>',
    view: { at: [-7.5, 1, 6.0], d: 28, az: 0.45, el: 0.98 },
    shots: { close: { at: [-7.5, 1, 6.0], d: 28, az: 0.45, el: 0.98 }, wide: { w: [-380, 20, 1250], d: 4700, az: 2.75, el: 0.8, fogF: 6 } },
    labels: ['remote'], show: { lift: 1, hub: true, remote: true },
    enter: async (x) => { while (x.alive()) { await x.cloudTrip('booth', x.step, x.alive); await sleep(900); } },
  },
  {
    id: 'datorer', nav: 'Datorerna',
    hops: ['macmini'],   // scale hops (js/scenes/komponenter.js)
    src: [{ t: 'tnt.local, avläst 29 okt 2026', level: 'belagd' }],
    tags: ['8 Pi', '6 Mac', '3 Win', '4 iPad'],
    title: '17 datorer och 4 iPadar driver installationerna',
    body: '<p>Vissa installationer behöver mer än ett kretskort, till exempel en spelmotor, videouppspelning eller ett AI-flöde. Då står en dator vid installationen: en Raspberry Pi, en Mac mini eller en Windows-dator.</p><p>Mac-datorerna kör bland annat TouchDesigner (Snurra huset, SkyKraft), Dialogens AI-flöde och en MQTT→MIDI-brygga till Ableton. Windows-datorerna kör ACE, Floden och Dokumentärväggen. iPadarna kör webbappar som skickar hjärtslag över MQTT och kan laddas om på distans.</p>',
    facts: [['Raspberry Pi', 'Droneport, Maskinisterna, Skellefteåtriangeln, ljud, video, återvinning, Sara-loop'], ['Mac mini', 'Snurra huset, Dialogen, Ableton, SkyKraft, Skellefteåtriangeln, Resolume'], ['Windows', 'ACE, Floden, Dokumentärväggen'], ['iPad', 'inspelning, uppspelning, återvinning, frågeväggen']],
    view: { at: [-0.5, 0, 2.1], d: 58, az: -0.15, el: 0.95 },
    labels: ['hosts'], show: { lift: 1 },
    enter: async (x) => { const ids = x.hostIds(); while (x.alive()) { for (const id of ids) { if (!x.alive()) return; x.blinkHost(id, 900); await sleep(260); } await sleep(1200); } },
  },
  {
    id: 'halsa', nav: 'Systemhälsa',
    src: [{ t: 'Systemhälsa på tnt.local, avläst 29 okt 2026', level: 'belagd' }],
    tags: ['tnt-diagnose', 'Slack'],
    title: 'tnt kontrollerar alla maskiner och rapporterar varje morgon',
    body: '<p>Med över 60 enheter i drift varje dag behövs en översikt. tnt loggar regelbundet in på varje dator, kollar att rätt program körs, mäter temperatur och belastning, tar skärmdumpar och lyssnar efter iPadarnas hjärtslag. Varje morgon skickas en rapport till Slack.</p><p>Pi/Mac/PC kontrolleras via SSH (systemd, launchd, tmux, processer, journal, fel per timme). WLED, Shelly och MiLight frågas av tnt via HTTP (fps, heap, RSSI, effekt). iPadarna har frysdetektering och kan laddas om. Personalen har sidorna Ljud och ljus, Signalkontroll, Dialogen-admin och bås-admin.</p>',
    extra: '<div class="big-n"><div><b>60/62</b><span>noder OK</span></div><div><b>25/27</b><span>WLED online</span></div><div><b>kl. 9</b><span>Slack-rapport · kl. 10 på sommartid</span></div></div>',
    view: { at: [-0.5, 3, 2.1], d: 62, az: 0.6, el: 0.55 },
    labels: ['hosts', 'hubname'], show: { lift: 1, hub: true, wires: true, remote: true },
    enter: async (x) => { while (x.alive()) { await x.sweep(); await sleep(1600); } },
  },
  {
    id: 'helhet', nav: 'Hela systemet',
    hops: ['kraftverk', 'alvdalen', 'shelly'],   // scale hops (js/scales.js)
    src: [{ t: 'tnt.local, avläst 29 okt 2026', level: 'belagd' }, { t: 'fallstudien trynewthings.fail/se26 och skelleftea.se (2026)', level: 'belagd' }],
    tags: ['10⁻¹ → 10³ m'],
    title: 'Hela kedjan, från ett kretskort på 8 cm till molntjänster utanför museet',
    body: '<p>Allt det här är ett och samma system. Det har varit i drift varje dag sedan maj 2026, startar själv på morgonen och låter skogen sova på natten. En guide kan sänka ljudet när hen pratar.</p><p>Källkoden har vi läst i Peders export: reglerna för ljus och ljud står i switchboarden. Placeringen av Berget och Slack i modellen är logisk, inte geografisk.</p>',
    extra: '<div class="big-n"><div><b>1</b><span>broker</span></div><div><b>17 + 4</b><span>datorer + iPadar</span></div><div><b>15</b><span>ESP32-noder</span></div><div><b>27</b><span>WLED · ~28 000 lysdioder</span></div><div><b>12</b><span>Shelly</span></div><div><b>2</b><span>AI-flöden</span></div></div>',
    view: { w: [200, 0, 1000], d: 7600, az: 2.45, el: 0.72, fogF: 6 },
    labels: ['remote', 'hubname'], show: { lift: 1, hub: true, remote: true, quiet: true },
    enter: (x) => { x.ambient(true, { every: 500 }); x.remoteLoop(); },
  },
  {
    id: 'utforska', nav: 'Utforska fritt', explore: true,
    title: 'Utforska',
    view: { at: [-0.5, 0, 2.1], d: 58, az: 0.45, el: 0.82 },
    labels: ['inst', 'rooms'], show: { lift: 1, hub: false, wires: false },
  },
];

// two stories: the introduction (ends in free exploring) and Museum Brain, the system behind it, opened from Utforska
const pick = (ids) => ids.map((id) => ALL.find((c) => c.id === id));
export const INTRO = pick(['start', 'ide', 'rum', 'hur', 'utforska']);   // 'plats' is left out; its data credits are a line in 'rum'
export const BRAIN = pick(['hjartat', 'inuti', 'sensorer', 'ljus', 'exempel', 'dialogen', 'baset', 'datorer', 'halsa', 'helhet']);
