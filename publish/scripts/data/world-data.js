(function initWorldData(root) {
  'use strict';

  const C = root.LifeGame.config;
  C.cities.forEach((city) => { city.country ||= '华夏'; });
  C.cities.push(
    { city: '东京', province: '东京都', country: '日本', tier: 1, cost: 24000 },
    { city: '大阪', province: '大阪府', country: '日本', tier: 1, cost: 19000 },
    { city: '横滨', province: '神奈川县', country: '日本', tier: 2, cost: 17000 },
    { city: '京都', province: '京都府', country: '日本', tier: 2, cost: 16000 },
    { city: '福冈', province: '福冈县', country: '日本', tier: 2, cost: 13500 },
    { city: '札幌', province: '北海道', country: '日本', tier: 3, cost: 12000 },
    { city: '首尔', province: '首尔特别市', country: '韩国', tier: 1, cost: 22000 },
    { city: '釜山', province: '釜山广域市', country: '韩国', tier: 2, cost: 16000 },
    { city: '新加坡', province: '新加坡', country: '新加坡', tier: 1, cost: 26000 },
    { city: '巴黎', province: '法兰西岛', country: '法国', tier: 1, cost: 30000 },
    { city: '伦敦', province: '大伦敦', country: '英国', tier: 1, cost: 32000 },
    { city: '纽约', province: '纽约州', country: '美国', tier: 1, cost: 33000 },
    { city: '旧金山', province: '加利福尼亚州', country: '美国', tier: 1, cost: 31000 },
  );

  const companyMap = {
    software: ['云帆科技', '科技'], algorithm: ['星环智能', '科技'], data: ['数澜研究院', '科技'],
    product: ['远景互联', '科技'], finance: ['东海证券', '金融'], bank: ['民生银行', '金融'],
    doctor: ['仁和医院', '医疗'], teacher: ['启明教育集团', '教育'], lawyer: ['衡正律师事务所', '法律'],
    civil: ['城市公共服务中心', '公共'], architect: ['筑境设计院', '建筑'], engineer: ['华工制造', '制造'],
    designer: ['无界视觉', '创意'], planner: ['山海游戏', '游戏'], journalist: ['城市观察', '传媒'],
    operator: ['万象生活', '服务'], sales: ['新程商业', '商业'], logistics: ['迅达物流', '物流'],
    chef: ['四季餐饮', '餐饮'], photo: ['光影工房', '创意'], socialwork: ['社区发展中心', '公共'],
    electrician: ['恒星机电', '制造'], freelance: ['个人工作室', '自由'],
  };
  C.jobs.forEach((job) => {
    [job.company, job.industry] = companyMap[job.id] || ['城市企业', '综合'];
    job.cities ||= [];
    job.education ??= job.need >= 70 ? 3 : (job.need >= 55 ? 1 : 0);
    job.minAge ??= 18;
    job.freelance ??= job.id === 'freelance';
  });
  C.jobs.push(
    { id: 'nurse', name: '护理师', company: '安宁医疗中心', industry: '医疗', salary: 7600, need: 58, category: '社交', majors: ['临床医学'], education: 2, tier: 3, cities: [] },
    { id: 'lab', name: '实验室研究员', company: '华科生命研究院', industry: '科技', salary: 13800, need: 82, category: '科学', majors: ['数据科学', '临床医学'], education: 3, tier: 2, cities: ['北京', '上海', '深圳', '杭州'] },
    { id: 'translator', name: '中日翻译', company: '海桥文化', industry: '传媒', salary: 10500, need: 70, category: '文学', majors: ['教育学', '数字媒体'], education: 2, tier: 2, cities: ['上海', '东京', '大阪', '京都'] },
    { id: 'animator', name: '动画原画师', company: '青空动画', industry: '创意', salary: 11800, need: 76, category: '艺术', majors: ['数字媒体'], education: 2, tier: 2, cities: ['上海', '成都', '东京', '大阪'] },
    { id: 'robotics', name: '机器人工程师', company: '未来机械', industry: '科技', salary: 18200, need: 86, category: '科学', majors: ['智能制造', '机电技术'], education: 3, tier: 1, cities: ['深圳', '上海', '东京', '横滨'] },
    { id: 'gamejp', name: '游戏开发工程师', company: '樱岛互动', industry: '游戏', salary: 16500, need: 82, category: '科学', majors: ['计算机科学', '数字媒体'], education: 3, tier: 1, cities: ['东京', '大阪', '福冈'] },
    { id: 'shrine', name: '神社文化专员', company: '古都文化社', industry: '文化', salary: 7200, need: 58, category: '文学', majors: ['教育学', '现代服务'], education: 1, tier: 3, cities: ['京都', '东京'] },
    { id: 'tourguide', name: '国际旅行顾问', company: '远行旅业', industry: '服务', salary: 7800, need: 55, category: '社交', majors: ['现代服务', '工商管理'], education: 1, tier: 3, cities: [] },
    { id: 'fashion', name: '服装搭配师', company: '织梦时尚', industry: '创意', salary: 8600, need: 64, category: '艺术', majors: ['数字媒体'], education: 1, tier: 2, cities: ['上海', '杭州', '东京', '大阪'] },
    { id: 'rail', name: '轨道交通调度员', company: '都市轨道集团', industry: '交通', salary: 9200, need: 68, category: '科学', majors: ['智能制造', '机电技术'], education: 1, tier: 2, cities: [] },
    { id: 'professor', name: '大学助教', company: '城市大学', industry: '教育', salary: 9000, need: 78, category: '文学', majors: ['教育学', '计算机科学', '法学'], education: 3, tier: 2, cities: [] },
    { id: 'psych', name: '心理咨询助理', company: '心语成长中心', industry: '医疗', salary: 8200, need: 70, category: '社交', majors: ['教育学', '临床医学'], education: 2, tier: 2, cities: [] },
    { id: 'auto', name: '汽车维修技师', company: '迅驰汽车工坊', industry: '技能服务', salary: 7200, need: 48, category: '科学', majors: ['机电技术'], education: 1, tier: 3, cities: [] },
    { id: 'cnc', name: '数控设备操作员', company: '精工制造中心', industry: '技能服务', salary: 7800, need: 52, category: '科学', majors: ['机电技术'], education: 1, tier: 3, cities: [] },
    { id: 'beauty', name: '美妆造型师', company: '映彩造型工作室', industry: '技能服务', salary: 6800, need: 50, category: '艺术', majors: ['现代服务'], education: 1, tier: 3, cities: [] },
    { id: 'pastry', name: '西点烘焙师', company: '晨光烘焙工房', industry: '技能服务', salary: 6500, need: 46, category: '艺术', majors: ['现代服务'], education: 1, tier: 3, cities: [] },
    { id: 'vtuber', name: '虚拟主播', company: '个人虚拟频道', industry: '内容创作', salary: 8800, need: 58, category: '社交', majors: [], education: 1, tier: 3, cities: [], freelance: true, recommendedGender: '女' },
    { id: 'beautyblog', name: '美妆博主', company: '个人美妆频道', industry: '内容创作', salary: 8000, need: 55, category: '艺术', majors: ['数字媒体', '现代服务'], education: 1, tier: 3, cities: [], freelance: true, recommendedGender: '女' },
    { id: 'portraitblog', name: '写真博主', company: '个人影像频道', industry: '内容创作', salary: 7600, need: 54, category: '艺术', majors: ['数字媒体'], education: 1, tier: 3, cities: [], freelance: true, recommendedGender: '女' },
    { id: 'styleblog', name: '穿搭博主', company: '个人穿搭频道', industry: '内容创作', salary: 8200, need: 56, category: '艺术', majors: ['数字媒体', '现代服务'], education: 1, tier: 3, cities: [], freelance: true, recommendedGender: '女' },
    { id: 'coser', name: '职业Coser', company: '个人角色创作室', industry: '内容创作', salary: 8500, need: 58, category: '艺术', majors: ['数字媒体'], education: 1, tier: 3, cities: [], freelance: true, recommendedGender: '女' },
    { id: 'welfare', name: '福利姬', company: '个人福利频道', industry: '内容创作', salary: 9500, need: 48, category: '艺术', majors: ['数字媒体'], education: 1, tier: 3, cities: [], freelance: true, recommendedGender: '女' },
    { id: 'prostitute', name: '妓女', company: '风月场所', industry: '风俗业', salary: 12000, need: 35, category: '社交', majors: [], education: 0, tier: 3, cities: [], freelance: false, recommendedGender: '女', adultOnly: true },
    { id: 'idoltrainee', name: '偶像练习生', company: '偶像事务所', industry: '娱乐业', salary: 1500, need: 45, category: '艺术', majors: [], education: 0, tier: 3, cities: ['北京', '上海', '深圳', '成都', '长沙', '首尔', '东京'], freelance: false, recommendedGender: '女', adultOnly: false, minAge: 12 },
    { id: 'idol', name: '偶像艺人', company: '偶像事务所', industry: '娱乐业', salary: 8000, need: 55, category: '艺术', majors: ['数字媒体'], education: 1, tier: 2, cities: ['北京', '上海', '深圳', '成都', '长沙', '首尔', '东京'], freelance: false, recommendedGender: '女', adultOnly: false, minAge: 16 },
    { id: 'illustrator', name: '自由插画师', company: '个人插画工作室', industry: '内容创作', salary: 7800, need: 62, category: '艺术', majors: ['数字媒体'], education: 1, tier: 3, cities: [], freelance: true },
    { id: 'convention', name: '漫展活动执行', company: '次元城市会展', industry: '会展活动', salary: 7000, need: 50, category: '社交', majors: ['现代服务', '数字媒体'], education: 1, tier: 3, cities: [] },
    { id: 'pimp', name: '皮条客', company: '自营妓院', industry: '风俗业', salary: 8000, need: 30, category: '社交', majors: [], education: 0, tier: 3, cities: [], freelance: true, recommendedGender: '男' },
    { id: 'blackmarket', name: '黑市商人', company: '地下市场', industry: '黑市', salary: 5000, need: 25, category: '商业', majors: [], education: 0, tier: 3, cities: [], freelance: true },
  );

  C.houses.push(
    { name: '老城学区一居', price: 520000, comfort: 9 }, { name: '湖畔改善三居', price: 1880000, comfort: 25 },
    { name: '城市联排住宅', price: 3280000, comfort: 34 }, { name: '东京通勤公寓', price: 2150000, comfort: 18 },
    { name: '京都町屋', price: 2680000, comfort: 26 }, { name: '海景度假住宅', price: 4200000, comfort: 38 },
  );
  Object.assign(C.stocks, {
    智能制造: 41.2, 医疗创新: 27.6, 城市交通: 16.8, 文化传媒: 22.3,
    东亚机器人: 53.1, 樱花消费: 19.4, 全球指数: 88.6,
  });
  C.businesses.push(
    { id: 'stall', name: '街角小摊', price: 18000, income: 900 },
    { id: 'cafe', name: '社区咖啡馆', price: 120000, income: 5200 },
    { id: 'studio', name: '创意工作室', price: 260000, income: 9800 },
    { id: 'shop', name: '便利商店', price: 360000, income: 13200 },
    { id: 'restaurant', name: '主题餐厅', price: 680000, income: 23800 },
    { id: 'factory', name: '小型制造厂', price: 1600000, income: 52000 },
    { id: 'hotel', name: '精品旅馆', price: 2800000, income: 76000 },
    { id: 'techfirm', name: '科技创业公司', price: 5200000, income: 148000 },
  );
  C.vehicles.push(
    { id: 'bike', name: '通勤自行车', price: 1800, mood: 1 },
    { id: 'scooter', name: '城市电动车', price: 6800, mood: 2 },
    { id: 'compact', name: '紧凑型轿车', price: 98000, mood: 4 },
    { id: 'suv', name: '家庭旅行车', price: 260000, mood: 7 },
    { id: 'sports', name: '双门跑车', price: 880000, mood: 12 },
  );
  root.LifeGame.worldData = Object.freeze({
    japaneseName(gender) {
      return root.LifeGame.nameSystem.makeName('', gender, 'ja-JP');
    },
  });
}(window));
