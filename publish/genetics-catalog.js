(function initGeneticsCatalog(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const values = (entries) => entries.map(([value, dominance, weight]) => ({
    value, dominance, weight: weight || 1,
  }));

  Game.geneticsCatalog = Object.freeze({
    mutationRate: 0.025,
    loci: Object.freeze({
      hairColor: { values: values([
        ['黑色', 5, 8], ['深棕', 4, 6], ['栗色', 3, 4], ['亚麻棕', 2, 2], ['黑灰', 2, 1], ['银灰', 1, 1],
      ]) },
      hairStyleTendency: { mode: 'blend', blends: ['柔顺自然', '蓬松层次', '轻微卷曲'], values: values([
        ['直顺', 4, 6], ['自然层次', 3, 5], ['轻微卷曲', 2, 3], ['明显卷曲', 1, 1], ['浓密蓬松', 3, 3],
      ]) },
      eyeColor: { values: values([
        ['深棕色', 5, 8], ['棕色', 4, 6], ['浅棕色', 3, 3], ['琥珀色', 2, 1], ['灰褐色', 1, 1],
      ]) },
      faceShape: { mode: 'blend', blends: ['柔和鹅蛋脸', '清晰椭圆脸', '圆润长圆脸'], values: values([
        ['鹅蛋脸', 4, 5], ['圆脸', 3, 4], ['长圆脸', 2, 3], ['方圆脸', 3, 2], ['心形脸', 2, 2],
      ]) },
      featureProportions: { mode: 'blend', blends: ['均衡柔和五官', '精致舒展五官', '清晰立体五官'], values: values([
        ['均衡柔和五官', 4, 6], ['精致小巧五官', 2, 3], ['清晰立体五官', 3, 3], ['舒展大气五官', 3, 2],
      ]) },
      bodyFrame: { mode: 'blend', blends: ['匀称骨架', '修长匀称骨架'], values: values([
        ['纤细骨架', 2, 3], ['匀称骨架', 4, 6], ['结实骨架', 3, 3], ['娇小骨架', 2, 2], ['丰润骨架', 2, 2],
      ]) },
      temperament: { mode: 'blend', blends: ['清朗元气', '可爱青涩', '清冷病弱'], values: values([
        ['清朗', 3, 4], ['可爱', 4, 4], ['青涩', 3, 3], ['清冷', 2, 2], ['元气', 3, 3], ['病弱', 2, 2], ['阴暗', 1, 2],
      ]) },
      developmentTendency: { values: values([
        ['均衡发育', 4, 6], ['早发育', 2, 2], ['晚发育', 2, 2], ['渐进发育', 3, 3],
      ]) },
      molePosition: { values: values([
        ['无明显痣', 5, 9], ['左眼下小痣', 1, 1], ['右眼下小痣', 1, 1], ['鼻侧小痣', 1, 1], ['唇边小痣', 1, 1], ['颈侧小痣', 1, 1],
      ]) },
      freckles: { values: values([
        ['无雀斑', 5, 9], ['鼻梁淡雀斑', 1, 2], ['双颊淡雀斑', 1, 2], ['鼻梁与双颊雀斑', 1, 1],
      ]) },
      distinctiveFeature: { values: values([
        ['无显著特征', 5, 7], ['浅酒窝', 2, 2], ['眉形清晰', 3, 3], ['鼻梁挺秀', 2, 2], ['眼尾微挑', 2, 2], ['唇峰清晰', 2, 2],
      ]) },
    }),
  });
}(window));
