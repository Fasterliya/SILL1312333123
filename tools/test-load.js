global.window = global;
var root = global;
root.LifeGame = { config: { cities: [], jobs: [], universities: [], stocks: {}, companies: [], houses: [], businesses: [], vehicles: [], stages: [{max:2,name:'a'},{max:5,name:'b'}], subjects: [], appearance: {hairColor:[],temperament:[],bodyType:[],hairstyle:[],top:[],socks:[],shoes:[]}, personalities: [], traits: [], highSchools: [], parentJobs: [], locations: [] }, content: { clamp: function(v,a,b){return Math.max(a,Math.min(b,Number(v)||0))}, between: function(a,b){return Math.floor(Math.random()*(b-a+1))+a}, random: function(arr){return arr[Math.floor(Math.random()*arr.length)]}, age: function(){return 20}, personAge: function(){return 25}, makeName: function(){return 'test'}, setUniqueName: function(){}, person: function(){return {id:'p-'+Date.now(),name:'test',gender:'女',status:'健康',clothing:{},affection:50,trait:'温柔',personality:'内向',baseAge:0,bornAt:0,birthMonth:0,interactions:0,phoneUnlocked:false,relation:'朋友',school:'',educationStage:'home',educationName:'',metCity:'',currentCity:'',cosplay:'无',npcMarried:false,childrenCount:0,childIds:[],parentIds:[]}}, createState: function(){return {totalMonths:0,stats:{健康:80,心情:70,智力:50,魅力:50},money:1000,family:[],contacts:[],worldPeople:[],career:{job:null,jobId:null,company:null,salary:0,exp:0,performance:0,applications:[]},romance:{partnerId:null,married:false,pendingBirth:0},travel:{encounters:[],history:[],localHistory:[],journey:null},education:{school:'家中',schoolStage:'home',study:0},cityLife:{familiarity:{},reputation:0,residenceMonths:0,lastCity:'北京'},health:{diet:'均衡饮食',sleep:7,conditions:[],insurance:'基础医保',retirementFund:0,pension:0,retired:false,careLevel:0},location:{city:'北京',country:'华夏'},matchmaking:{candidates:[]},assets:{stocks:{},businesses:[],vehicles:[],house:null},specialModes:{possessed:[]},logs:[],pendingDecision:null,gameOver:false,month:1,totalMonths:0,workplace:{companyId:null,departmentId:null,leaderId:null,rosterIds:[],reportIds:[]} } } }, economy: { spend: function(){return 0}, message: function(s,m){return m} }, view: { money: function(v){return '¥'+(v||0)} }, lifeDirector: { addLog: function(){}, advance: function(){return {advanced:1}} }, legacySystem: { prepareDeath: function(){} }, people: { all: function(){return []}, find: function(){return null} }, worldCulture: { profile: function(){return {locale:'zh-CN',etiquette:'礼貌',code:'ZH',cost:1}}, applyPerson: function(){}, populationCulture: function(){return '华夏'}, format: function(v){return '¥'+v} }, social: { card: function(){return ''} }, workplace: { join: function(){}, leave: function(){}, departmentId: function(){return ''}, departmentName: function(){return ''} }, demography: { ensureWoman: function(){}, ensureState: function(){}, baseFertility: function(){return 20}, fertility: function(){return 50}, fertilityAt: function(){return 50}, npcMarriageChance: function(){return 0.05}, twinCountAt: function(){return 1} }, geneticsGrowth: { applyAppearance: function(){}, updateGrowth: function(){} }, genetics: {}, npcFashion: { ensurePerson: function(){} }, familyNaming: { forPlayer: function(){return {surname:'张'}}, assign: function(){}, surnameOf: function(){return '张'}, forParents: function(){return {surname:'张'}} }, nameSystem: { normalizeName: function(n){return n}, surnames: function(){return ['张','李','王']}, makeName: function(){return '测试'}, setUnique: function(){} }, relationshipSecrets: { ensure: function(){return {records:[],pregnancies:[]}}, addEncounterRecord: function(){return {id:'test'}}, schedulePregnancy: function(){}, addHookRecord: function(){return {id:'test'}} }, hunterMode: { ensure: function(){}, identity: function(){return {name:'test',birthMonth:0}} }, propertySystem: { ensure: function(){} }, companyMarket: { ensure: function(){}, record: function(){return {price:10,shares:0,totalShares:100000,availableShares:1000}} }, socialWorld: { cityPeople: function(){return []}, ensure: function(){}, archiveClassmates: function(){} }, encounterSystem: { init: function(){return {ok:true}}, ensure: function(){} }, brothelSystem: { ensure: function(){}, start: function(){return {ok:true}}, render: function(){return ''} }, hookupSystem: { ensure: function(){}, start: function(){return {ok:true}} }, familyConflict: { ensure: function(){}, addSuspicion: function(){} }, idolSystem: { ensure: function(){}, monthly: function(){} }, companyCatalog: { find: function(){return null} }, educationSystem: { ensure: function(){return {schoolStage:'home'}}, ensurePerson: function(){} }, civicSystem: { ensure: function(){} }, householdSystem: { ensure: function(){return {conflict:0,cohesion:50}} }, creatorCareer: { ensure: function(){return {followers:0,totalViews:0,brandTrust:50,scandalRisk:0}} }, timeSystem: { syncCalendar: function(){}, ageMonths: function(){return 200} }, npcLife: { syncGrowth: function(){} }, cosplayCatalog: { items:[] }, cityPopulation: { ensure: function(){}, activate: function(){} }, populationSimulation: { monthly: function(){} }, careerGrowth: { monthly: function(){} }, careerSpecialties: { monthly: function(){} }, relationshipMemory: { monthly: function(){}, record: function(){} }, parenting: { monthly: function(){} }, npcCareerLife: { monthly: function(){} }, healthSystem: { monthly: function(){}, checkSTD: function(){}, ensure: function(){return {diseases:[],stdHistory:[]}} }, npcCulturalStyle: { update: function(){} } };
var fs = require('fs');
var files = [
'publish/config.js','publish/genetics-catalog.js','publish/genetics.js',
'publish/scripts/engine/genetics-growth.js','publish/content.js',
'publish/scripts/engine/female-youth-style.js','publish/scripts/engine/demography.js',
'publish/scripts/engine/civic-system.js','publish/scripts/engine/economy.js',
'publish/scripts/engine/company-market.js','publish/scripts/engine/time-system.js',
'publish/scripts/engine/education-system.js','publish/scripts/engine/people.js',
'publish/scripts/engine/world-culture.js','publish/scripts/engine/social-world.js',
'publish/scripts/engine/npc-fashion.js','publish/scripts/engine/hunter-mode.js',
'publish/scripts/engine/property-system.js','publish/scripts/engine/systems-state.js',
'publish/scripts/engine/state-upgrade.js','publish/scripts/features/life-events.js',
'publish/scripts/features/relationship-memory.js','publish/scripts/features/household-system.js',
'publish/scripts/features/relationship-secrets.js','publish/scripts/features/parenting.js',
'publish/scripts/features/career-specialties.js','publish/scripts/features/city-life.js',
'publish/scripts/features/legacy-system.js','publish/scripts/features/health-safety.js',
'publish/scripts/features/health-system.js','publish/scripts/engine/monthly-systems.js',
'publish/scripts/engine/npc-life-support.js','publish/scripts/engine/npc-cultural-style.js',
'publish/scripts/features/social.js','publish/scripts/features/matchmaking.js',
'publish/scripts/features/career.js','publish/scripts/features/creator-economy.js',
'publish/scripts/features/creator-style-growth.js','publish/scripts/features/creator-growth-actions.js',
'publish/scripts/features/creator-career.js','publish/scripts/features/travel.js',
'publish/scripts/features/travel-interactions.js','publish/scripts/features/encounter-system.js',
'publish/scripts/features/brothel-system.js','publish/scripts/features/hookup-system.js',
'publish/scripts/features/plastic-surgery.js','publish/scripts/features/idol-system.js',
'publish/scripts/features/family-conflict.js',
'publish/scripts/features/criminal-system.js','publish/scripts/features/psychology-system.js',
'publish/scripts/features/npc-initiative.js','publish/scripts/features/rape-encounter.js',
'publish/scripts/features/tax-system.js','publish/scripts/features/bank-system.js',
'publish/scripts/features/company-system.js','publish/scripts/features/stock-director.js',
'publish/scripts/features/idol-underground.js','publish/scripts/features/journey.js',
'publish/scripts/features/assets-system.js','publish/scripts/engine/npc-life.js',
'publish/scripts/engine/npc-career-life.js','publish/scripts/engine/family-links.js',
'publish/scripts/engine/board-system.js','publish/scripts/engine/workplace.js',
'publish/scripts/engine/city-population.js','publish/scripts/engine/special-population.js',
'publish/scripts/engine/population-renewal.js','publish/scripts/engine/mortality.js',
'publish/scripts/engine/population-simulation.js','publish/scripts/engine/career-growth.js',
'publish/scripts/ui/market-view.js','publish/scripts/ui/life-loop.js',
'publish/scripts/ui/navigation.js','publish/scripts/ui/appearance.js',
'publish/scripts/ui/career-panels.js','publish/scripts/controllers/extended-interactions.js',
'publish/scripts/controllers/interaction-router.js',
];
var ok=0, fail=0;
files.forEach(function(f) {
  try {
    var code = fs.readFileSync(f, 'utf8');
    new Function('window', code)(root);
    ok++;
  } catch(e) {
    fail++;
    console.log('FAIL: ' + f + ' — ' + e.message);
    if (fail >= 5) { console.log('...stopping'); process.exit(1); }
  }
});
console.log('RESULTS: ' + ok + ' OK, ' + fail + ' FAIL');
