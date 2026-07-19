(function initStyleReference(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const url = './assets/images/style-reference.webp';
  let cached = '';
  let loading = null;

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(new Error('参考图读取失败'));
      reader.readAsDataURL(blob);
    });
  }

  async function load() {
    if (cached) return cached;
    if (loading) return loading;
    loading = fetch(url).then((response) => {
      if (!response.ok) throw new Error(`参考图加载失败: ${response.status}`);
      return response.blob();
    }).then((blob) => {
      const allowed = ['image/webp', 'image/png', 'image/jpeg'];
      if (blob.type && blob.type !== 'application/octet-stream' && !allowed.includes(blob.type)) {
        throw new Error('参考图格式不受支持');
      }
      if (blob.size > 10 * 1024 * 1024) throw new Error('参考图超过10MB');
      const normalized = allowed.includes(blob.type) ? blob : new Blob([blob], { type: 'image/webp' });
      return blobToDataUrl(normalized);
    }).then((dataUrl) => {
      if (!dataUrl) throw new Error('参考图内容为空');
      cached = dataUrl;
      return cached;
    }).catch((err) => {
      loading = null;
      throw err;
    });
    return loading;
  }

  Game.styleReference = Object.freeze({ load });
}(window));
