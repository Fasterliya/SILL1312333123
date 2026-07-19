(function initWorldData(root) {
  'use strict';

  const C = root.LifeGame.config;
  const japaneseSurnames = ['佐藤', '铃木', '高桥', '田中', '伊藤', '渡边', '山本', '中村'];
  const japaneseNames = ['葵', '凛', '悠真', '结衣', '阳菜', '莲', '美月', '拓海', '千夏', '直树'];
  C.cities.forEach((city) => { city.country ||= '华夏'; });
  C.cities.push(
    { city: '东京', province: '东京都', country: '日本', tier: 1, cost: 24000 },
    { city: '大阪', province: '大阪府', country: '日本', tier: 1, cost: 19000 },
    { city: '横滨', province: '神奈川县', country: '日本', tier: 2, cost: 17000 },
    { city: '京都', province: '京都府', country: '日本', tier: 2, cost: 16000 },
    { city: '福冈', province: '福冈县', country: '日本', tier: 2, cost: 13500 },
    { city: '札幌', province: '北海道', country: '日本', tier: 3, cost: 12000 },
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
  });
  C.jobs.push(
    { id: 'nurse', name: '护理师', company: '安宁医疗中心', industry: '医疗', salary: 7600, need: 58, category: '社交', majors: ['临床医学'], tier: 3, cities: [] },
    { id: 'lab', name: '实验室研究员', company: '华科生命研究院', industry: '科技', salary: 13800, need: 82, category: '科学', majors: ['数据科学', '临床医学'], tier: 2, cities: ['北京', '上海', '深圳', '杭州'] },
    { id: 'translator', name: '中日翻译', company: '海桥文化', industry: '传媒', salary: 10500, need: 70, category: '文学', majors: ['教育学', '数字媒体'], tier: 2, cities: ['上海', '东京', '大阪', '京都'] },
    { id: 'animator', name: '动画原画师', company: '青空动画', industry: '创意', salary: 11800, need: 76, category: '艺术', majors: ['数字媒体'], tier: 2, cities: ['上海', '成都', '东京', '大阪'] },
    { id: 'robotics', name: '机器人工程师', company: '未来机械', industry: '科技', salary: 18200, need: 86, category: '科学', majors: ['智能制造', '机电技术'], tier: 1, cities: ['深圳', '上海', '东京', '横滨'] },
    { id: 'gamejp', name: '游戏开发工程师', company: '樱岛互动', industry: '游戏', salary: 16500, need: 82, category: '科学', majors: ['计算机科学', '数字媒体'], tier: 1, cities: ['东京', '大阪', '福冈'] },
    { id: 'shrine', name: '神社文化专员', company: '古都文化社', industry: '文化', salary: 7200, need: 58, category: '文学', majors: ['教育学', '现代服务'], tier: 3, cities: ['京都', '东京'] },
    { id: 'tourguide', name: '国际旅行顾问', company: '远行旅业', industry: '服务', salary: 7800, need: 55, category: '社交', majors: ['现代服务', '工商管理'], tier: 3, cities: [] },
    { id: 'fashion', name: '服装搭配师', company: '织梦时尚', industry: '创意', salary: 8600, need: 64, category: '艺术', majors: ['数字媒体'], tier: 2, cities: ['上海', '杭州', '东京', '大阪'] },
    { id: 'rail', name: '轨道交通调度员', company: '都市轨道集团', industry: '交通', salary: 9200, need: 68, category: '科学', majors: ['智能制造', '机电技术'], tier: 2, cities: [] },
    { id: 'professor', name: '大学助教', company: '城市大学', industry: '教育', salary: 9000, need: 78, category: '文学', majors: ['教育学', '计算机科学', '法学'], tier: 2, cities: [] },
    { id: 'psych', name: '心理咨询助理', company: '心语成长中心', industry: '医疗', salary: 8200, need: 70, category: '社交', majors: ['教育学', '临床医学'], tier: 2, cities: [] },
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
    japaneseName() {
      const surname = japaneseSurnames[Math.floor(Math.random() * japaneseSurnames.length)];
      const name = japaneseNames[Math.floor(Math.random() * japaneseNames.length)];
      return surname + name;
    },
  });
}(window));
