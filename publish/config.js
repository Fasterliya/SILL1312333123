(function initConfig(root) {
  'use strict';

  const config = {
    version: 1,
    title: '华夏人生',
    storageKey: 'huaxia-life:v1',
    startYear: 2026,
    locations: [
      ['北京', '朝阳区'], ['上海', '浦东新区'], ['广东', '深圳'],
      ['四川', '成都'], ['湖北', '武汉'], ['陕西', '西安'],
      ['浙江', '杭州'], ['江苏', '南京'], ['山东', '青岛'],
      ['云南', '昆明'], ['辽宁', '沈阳'], ['福建', '厦门'],
      ['河南', '郑州'], ['湖南', '长沙'], ['黑龙江', '哈尔滨'],
    ],
    surnames: ['李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙'],
    givenNames: ['安然', '星河', '知夏', '景行', '雨桐', '子衿', '明远', '若溪', '嘉禾', '清越'],
    parentJobs: ['教师', '会计', '工程师', '医生', '店主', '司机', '公务员', '设计师', '厨师'],
    stages: [
      { max: 2, name: '幼儿期', icon: '芽' },
      { max: 5, name: '幼儿园', icon: '童' },
      { max: 11, name: '小学', icon: '小' },
      { max: 14, name: '初中', icon: '中' },
      { max: 17, name: '高中', icon: '高' },
      { max: 21, name: '大学', icon: '大' },
      { max: 59, name: '职场人生', icon: '业' },
      { max: 200, name: '从心之年', icon: '享' },
    ],
    subjectCaps: {
      primary: { 语文: 100, 数学: 100, 英语: 100, 科学: 100 },
      middle: { 语文: 130, 数学: 130, 英语: 130, 政治: 50, 历史: 50, 物理: 100, 化学: 100 },
      highBase: { 语文: 150, 数学: 150, 英语: 150 },
      highChoice: { 物理: 100, 历史: 100, 生物: 100, 地理: 100, 化学: 100, 政治: 100 },
    },
    universities: [
      { name: '华夏大学', min: 660, major: '计算机科学', tier: '顶尖' },
      { name: '东海财经大学', min: 610, major: '金融学', tier: '重点' },
      { name: '南山师范大学', min: 560, major: '教育学', tier: '重点' },
      { name: '江城理工大学', min: 510, major: '智能制造', tier: '本科' },
      { name: '锦华学院', min: 430, major: '数字媒体', tier: '本科' },
      { name: '城市职业学院', min: 300, major: '现代服务', tier: '专科' },
    ],
    jobs: [
      { name: '软件工程师', salary: 11500, need: 76, majors: ['计算机科学', '智能制造'] },
      { name: '金融分析师', salary: 12800, need: 80, majors: ['金融学'] },
      { name: '中学教师', salary: 7600, need: 68, majors: ['教育学'] },
      { name: '产品设计师', salary: 9200, need: 72, majors: ['数字媒体'] },
      { name: '运营专员', salary: 6800, need: 56, majors: [] },
      { name: '销售顾问', salary: 6200, need: 48, majors: [] },
      { name: '自由职业者', salary: 5000, need: 35, majors: [] },
    ],
    houses: [
      { name: '城市单身公寓', price: 320000, comfort: 6 },
      { name: '近郊两居室', price: 680000, comfort: 12 },
      { name: '市中心三居室', price: 1380000, comfort: 20 },
    ],
    stocks: {
      华夏科技: 32.4,
      民生消费: 18.6,
      绿色能源: 24.8,
    },
  };

  root.LifeGame = root.LifeGame || {};
  root.LifeGame.config = Object.freeze(config);
}(window));
