(function initCradlePatronEvents(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;

  function eff(obj) {
    return {
      a: Number(obj.a) || 0,
      b: Number(obj.b) || 0,
      t: Number(obj.t) || 0,
      h: Number(obj.h) || 0,
      e: Number(obj.e) || 0,
      m: Number(obj.m) || 0,
    };
  }

  var EVENTS = [
    /* ======= 日常起居 Daily Life (14 events, weight 20) ======= */
    { cat: 'daily', w: 20, t: function(n) { return n + '站在你的房门口，看着你穿和服。他说你系腰带的方式"终于像个日本女人了"。'; }, e: eff({a:3,b:-1,t:1}) },
    { cat: 'daily', w: 20, t: function(n) { return '今晚' + n + '没有回家。守卫说他在银座俱乐部应酬。你拥有了一整天的安静——虽然门外仍有脚步声。'; }, e: eff({a:0,b:-2,t:-2}) },
    { cat: 'daily', w: 20, t: function(n) { return '你在厨房帮佣人准备晚餐。' + n + '尝了一口你做的味噌汤，皱着眉头说"太咸了"——但还是喝完了。'; }, e: eff({a:5,b:-1,t:0}) },
    { cat: 'daily', w: 20, t: function(n) { return '庭院里的樱花开了。' + n + '难得允许你在树下坐了一个小时。落樱飘在你的肩头，你短暂地觉得这个院子也有它美丽的一面。'; }, e: eff({a:4,b:-2,t:-3}) },
    { cat: 'daily', w: 20, t: function(n) { return n + '带回来一只三毛猫，说是"给你解闷的"。猫咪蹭了蹭你的脚踝——这是你在宅邸里遇到的第一个不带恶意的生命。'; }, e: eff({a:6,b:-3,t:-5,e:3}) },
    { cat: 'daily', w: 20, t: function(n) { return '突然停电了。在监控失效的黑暗中，走廊尽头传来了其他女人的低语声——原来这里还关着别人。一个声音穿过墙壁说："你也是华夏人吗？"'; }, e: eff({a:0,b:0,t:3,e:6}) },
    { cat: 'daily', w: 20, t: function(n) { return n + '今天心情很好，带你去了附近的温泉旅馆。你泡在热水里，抬头看到围墙上方的铁蒺藜——自由就在那些尖刺的另一边，不到三米远。'; }, e: eff({a:8,b:-5,t:-4,e:5}) },
    { cat: 'daily', w: 20, t: function(n) { return '你在整理' + n + '的书房时发现了一本华夏出版的小说。你用它在角落里偷偷阅读母语——手指划过每一个熟悉的汉字时，泪水糊了眼。'; }, e: eff({a:0,b:0,t:-5,e:2}) },
    { cat: 'daily', w: 20, t: function(n) { return n + '的司机请假了，来了一个年轻的代驾。他帮你开车门时对你点了点头——那种不含审视的、正常的社交礼节。你几乎忘记了这种感觉。'; }, e: eff({a:0,b:0,t:1,e:4}) },
    { cat: 'daily', w: 20, t: function(n) { return '你学会了自己打抹茶。' + n + '第一次喝的时候没有挑剔，只是默默地喝完了一整碗。这是他为数不多的、不附带任何要求的沉默时刻。'; }, e: eff({a:7,b:-3,t:-2}) },
    { cat: 'daily', w: 20, t: function(n) { return '电视里播出了一则关于"失踪外国女性"的新闻。' + n + '迅速换了台——但你看到了画面中那张焦虑的华夏面孔。那是别人的家人，在找她。有没有人也在找你？'; }, e: eff({a:0,b:2,t:8,e:3}) },
    { cat: 'daily', w: 20, t: function(n) { return '你在洗衣房找到了' + n + '的一件旧毛衣。你把它拆了重新织成一条围巾。织每一针的时候，你都想起很久以前有人教过你——那个人的手指也是这么动的。'; }, e: eff({a:5,b:-1,t:-3}) },
    { cat: 'daily', w: 20, t: function(n) { return '今天是你被抓进摇篮的周年纪念日。你知道这个日期，但' + n + '不知道。你对着镜子说了一句"我还记得自己是谁"——然后你看到了嘴角因紧张而起的细纹。'; }, e: eff({a:0,b:0,t:10,e:4}) },
    { cat: 'daily', w: 20, t: function(n) { return '深夜，你在走廊尽头听到' + n + '在打电话。他的语气卑微而紧张——他正在对电话那头的人鞠躬，尽管对方看不到。原来他也有害怕的人。'; }, e: eff({a:2,b:-1,t:2,e:3}) },

    /* ======= 亲密接触 Intimacy (16 events, weight 15) ======= */
    { cat: 'intimacy', w: 15, t: function(n) { return n + '今晚喝了很多酒。他粗暴地把你按在榻榻米上，你没有反抗——你知道反抗会让事情更糟。事后他扔给你一件新和服作为"补偿"。'; }, e: eff({a:-5,b:12,t:8,h:-3}) },
    { cat: 'intimacy', w: 15, t: function(n) { return n + '罕见地温柔了一次。他轻轻地抚摸了你的头发，在你耳边说"你真美"——用的是日语。你不知道这句话有几分是真心，几分是对着一件商品说的。'; }, e: eff({a:10,b:-8,t:5}) },
    { cat: 'intimacy', w: 15, t: function(n) { return n + '让你穿上他最喜欢的那套和服。你跪坐在榻榻米上，他看了你很久，然后说："你比我妻子好看多了。"你不知道该怎么回应这句话。'; }, e: eff({a:12,b:-2,t:6}) },
    { cat: 'intimacy', w: 15, t: function(n) { return n + '今天带回来一些"道具"。你以前只在电影里见过那种东西。他兴奋地一件件介绍，你只感到手脚发凉。'; }, e: eff({a:-8,b:18,t:15,h:-5}) },
    { cat: 'intimacy', w: 15, t: function(n) { return n + '在欢爱后没有立即离开。他躺在你身边，抽着烟，沉默了很久。然后他说了一句"我以前也有过梦想的"——这句话没有任何上下文，但你觉得这是他最接近坦诚的一刻。'; }, e: eff({a:15,b:-5,t:3}) },
    { cat: 'intimacy', w: 15, t: function(n) { return n + '要求你主动。你说你不会。他打了你一巴掌，然后说"学"。你闭上眼睛，想象着自己在另一个地方——一个自由的地方。你的身体在动，但你的灵魂不在那里。'; }, e: eff({a:-10,b:15,t:12,h:-3}) },
    { cat: 'intimacy', w: 15, t: function(n) { return '今晚' + n + '没有碰你。他只是让你坐在他旁边，陪他看了一部很老的日本电影。电影里有人在哭，你不知道为什么也跟着哭了。'; }, e: eff({a:8,b:-3,t:4}) },
    { cat: 'intimacy', w: 15, t: function(n) { return n + '在事后伏在你耳边说："如果你给我生个儿子，我就给你更多的自由。"这句话比任何暴力都更让你害怕——因为其中的交易意味太过清晰。'; }, e: eff({a:5,b:3,t:10}) },
    { cat: 'intimacy', w: 15, t: function(n) { return '你开始学会用日语说那些他爱听的词。每说一个词，你就觉得自己的嘴不再属于自己。但同时，' + n + '会因为这些话而变得温柔——这是你想出来的最有效的自保方式。'; }, e: eff({a:12,b:-10,t:8}) },
    { cat: 'intimacy', w: 15, t: function(n) { return n + '的妻子今天又来过电话了。挂断后他的心情很差。你成了他发泄愤怒的对象。事后他摔门而出，你躺在地板上数着天花板的裂缝——一共二十三条。'; }, e: eff({a:-12,b:20,t:15,h:-5}) },
    { cat: 'intimacy', w: 15, t: function(n) { return n + '今晚没有要求你侍寝。他只是在睡前站在你的房门口，看了你两分钟，然后关上了门。那两分钟比任何身体接触都让你不安——他在想什么？'; }, e: eff({a:2,b:1,t:4}) },
    { cat: 'intimacy', w: 15, t: function(n) { return n + '带来了一个摄影师。他让你摆出各种姿势拍照。"留念，"他说，"你的身体正在最好的时候。"闪光灯每闪一次，你都觉得自己的一小部分被偷走了。'; }, e: eff({a:-3,b:10,t:12}) },
    { cat: 'intimacy', w: 15, t: function(n) { return '你做了一个梦，梦见自己在华夏的老家。醒来时' + n + '正看着你。你说了一句梦话（华夏语），他皱起了眉头——他不喜欢你用那种语言。'; }, e: eff({a:-5,b:5,t:6}) },
    { cat: 'intimacy', w: 15, t: function(n) { return n + '今天似乎有心事。他没有像往常一样粗暴，只是静静地抱着你很久。你感觉到他在发抖——这个囚禁你的男人在他的世界里也不是自由的。但你不想同情他。'; }, e: eff({a:10,b:-5,t:5}) },
    { cat: 'intimacy', w: 15, t: function(n) { return '你在床褥下找到了一根不属于你的长头发。原来你并不是这个房间里唯一的女人。你不知道该感到嫉妒还是某种扭曲的解脱——至少有别人在分担这份重量。'; }, e: eff({a:0,b:2,t:4,e:3}) },
    { cat: 'intimacy', w: 15, t: function(n) { return n + '今晚格外粗暴。你低声用华夏语念了一首童年的童谣——他没有听到。那首童谣里有你妈妈的声音，有你在院子里追逐过的蝴蝶。念完之后，身体上的痛似乎轻了一点点。'; }, e: eff({a:-8,b:15,t:10,h:-2}) },

    /* ======= 暴力惩罚 Violence (12 events, weight 12) ======= */
    { cat: 'violence', w: 12, cond: function(s,c) { return c.patronAbuse < 60; }, t: function(n) { return n + '因为你今天的和服穿歪了而大发雷霆。他拽着你的衣领把你拖到镜子前，强迫你看着自己。"你连穿衣服都做不好？"镜中你的脸因恐惧而扭曲。'; }, e: eff({a:-8,b:12,t:12,h:-3}) },
    { cat: 'violence', w: 12, t: function(n) { return '你试图藏起一封信——那封信是你在打扫时从' + n + '的书房里找到的，上面有华夏大使馆的地址。他发现了，用烟头在你的手臂上留下了新的伤痕。'; }, e: eff({a:-15,b:25,t:18,h:-7}) },
    { cat: 'violence', w: 12, cond: function(s,c) { return c.patronEscapeProgress >= 30; }, t: function(n) { return '你记下的笔记被佣人发现了。' + n + '把那张纸拍在桌上——上面画着宅邸的平面图、守卫换班时间、和后门的锁型。他没有说话，只是笑了。那种笑比任何怒吼都吓人。'; }, e: eff({a:-20,b:28,t:20,h:-8,e:-30}) },
    { cat: 'violence', w: 12, t: function(n) { return n + '今天在公司遇到了挫折。他回家后把公文包砸在墙上，然后对你说"过来"。你知道接下来会发生什么——他已经好几个月没有这样了。你慢慢地、慢慢地走过去。'; }, e: eff({a:-10,b:18,t:14,h:-5}) },
    { cat: 'violence', w: 12, cond: function(s,c) { return c.patronAbuse >= 50; }, t: function(n) { return '你被关进了地下室——一个没有窗户的小房间，只有一盆水和一碗冷饭。' + n + '说你"需要好好反省"。你不知道自己做错了什么。在地下室的黑暗中，你开始和墙壁说话。'; }, e: eff({a:-10,b:15,t:22,h:-6}) },
    { cat: 'violence', w: 12, t: function(n) { return n + '今晚的暴力格外严重。你蜷缩在墙角，嘴角渗血，肋骨处传来刺骨的疼痛。他打完你之后哭了——他说"对不起"，但你不知道这句对不起是给你的，还是给他自己的。'; }, e: eff({a:3,b:20,t:25,h:-12}) },
    { cat: 'violence', w: 12, cond: function(s,c) { return c.patronAbuse >= 70; }, t: function(n) { return '宅邸的邻居报了警。警察来了——但没有进门。' + n + '在门口和他们谈笑风生，给他们递了名片和礼物。警察走了。你的最后一丝希望也走了。'; }, e: eff({a:-5,b:15,t:30,e:-10}) },
    { cat: 'violence', w: 12, t: function(n) { return '你试图反抗了。这是来日本后第一次还手——你抓破了他的脸。他愣了一秒，然后开始笑。那不是愤怒的笑——那是猎人发现猎物还有力气逃跑时的笑。'; }, e: eff({a:-15,b:25,t:10,h:-5,e:8}) },
    { cat: 'violence', w: 12, t: function(n) { return n + '把你锁在卫生间里过了一夜。你蜷缩在冰冷的瓷砖上，听着外面他的脚步声时而走近、时而走远。凌晨三点，他从门缝下塞进来一条毯子。'; }, e: eff({a:2,b:12,t:16,h:-4}) },
    { cat: 'violence', w: 12, t: function(n) { return '今天' + n + '带了一个"朋友"来。那个朋友看着你，对' + n + '说："借我用一晚？"你看到' + n + '犹豫了——但他最终没有拒绝。那个晚上，你知道了什么叫做比深渊更深的黑暗。'; }, e: eff({a:-20,b:30,t:35,h:-10}) },
    { cat: 'violence', w: 12, t: function(n) { return n + '用皮带抽你的时候电话响了。他接了——是他的上司。他用最恭敬的语气说了"是，明白了，马上处理"，一只手还攥着皮带。你第一次看到这个暴君卑微的一面，但你并不因此原谅他。'; }, e: eff({a:-8,b:15,t:14,h:-3}) },
    { cat: 'violence', w: 12, cond: function(s,c) { return c.patronAbuse >= 80 && s.stats['健康'] <= 20; }, t: function(n) { return '你今晚差点死掉。在失去意识之前，你听到有人在尖叫——那是你自己的声音。远方的警笛声越来越近，' + n + '慌乱地穿上衣服跑了出去。你躺在血泊中，盯着天花板上的裂缝——还是那二十三条。'; }, e: eff({a:-25,b:35,t:40,h:-25,e:15}) },

    /* ======= 社交场合 Social (12 events, weight 10) ======= */
    { cat: 'social', w: 10, t: function(n) { return n + '带你参加了一个私人晚宴。其他客人带着他们的"伴侣"——你看到那些女人脸上都是一样的空洞表情。你们交换了眼神，什么都没说，但你们都知道对方在想什么。'; }, e: eff({a:3,b:0,t:5,e:4}) },
    { cat: 'social', w: 10, t: function(n) { return n + '的生意伙伴来家里做客。席间那个男人对你做出了轻浮的举动。' + n + '没有阻止——他甚至说"你看，她不错吧"。你成了他展示财富和人脉的道具。'; }, e: eff({a:-3,b:8,t:12}) },
    { cat: 'social', w: 10, t: function(n) { return n + '带你去了银座的高级料亭。你穿着他指定的振袖和服，以"秘书"的身份坐在角落。没有人看你，也没有人问你——你只是一件安静的装饰品。但至少食物很好。'; }, e: eff({a:5,b:-2,t:3}) },
    { cat: 'social', w: 10, t: function(n) { return '一位穿着和服的老妇人到访。她是' + n + '的母亲。她看着你的眼神像是在看一只害虫。"你父亲是做什么的？"她用英语问你。你说不出话——你也不知道你父亲现在在哪里。'; }, e: eff({a:-8,b:5,t:15}) },
    { cat: 'social', w: 10, t: function(n) { return '今天有穿着西装的陌生人来宅邸"检查"。' + n + '让你躲进储藏室，不要出声。你透过缝隙看到那些人翻遍了宅邸的文件——' + n + '的生意似乎并不干净。'; }, e: eff({a:2,b:0,t:5,e:8}) },
    { cat: 'social', w: 10, t: function(n) { return '又一个和你一样被卖来的女人被带到了宅邸——但她不是来分担你的负担的。她是被"退回来"的。' + n + '当着你的面打了她，然后让人把她拖走。"你看，"他对你说，"我对你算不错的。"'; }, e: eff({a:5,b:8,t:20}) },
    { cat: 'social', w: 10, t: function(n) { return '一位年轻的律师来拜访' + n + '。他在走廊里和你擦肩而过时，压低声音说了一句英文——"Do you need help?"你没有回答。你不敢回答。但他的眼神你记了很久。'; }, e: eff({a:0,b:0,t:6,e:12}) },
    { cat: 'social', w: 10, t: function(n) { return n + '举办了一场家庭宴会。他的正式妻子也来了——那个女人比你想象中优雅得多。她没有看你一眼，仿佛你不存在。那可能是你在这里得到的最接近尊重的待遇——被无视。'; }, e: eff({a:0,b:2,t:8}) },
    { cat: 'social', w: 10, t: function(n) { return n + '带你去了他的高尔夫俱乐部。你坐在休息室里，周围都是富有的日本中年男人和他们的年轻女伴。一个女伴偷偷塞给你一张纸条——上面写着一个电话号码和一行字："周三凌晨3点打"。'; }, e: eff({a:0,b:0,t:4,e:15}) },
    { cat: 'social', w: 10, t: function(n) { return '今天是' + n + '的公司年会。他让你以"海外业务助理"的身份出席。你在自助餐区遇到了一个华夏裔的职员。她问你来自哪个城市——你说出那个城市的名字时，声音抖了一下。'; }, e: eff({a:5,b:-1,t:5,e:6}) },
    { cat: 'social', w: 10, t: function(n) { return n + '的大学同学来家里喝酒。喝多了之后，有人开始谈论"现在华夏来的女孩真不错"。' + n + '笑着附和。你站在屏风后面，手里端着酒壶，听到了每一个字。'; }, e: eff({a:-5,b:6,t:15}) },
    { cat: 'social', w: 10, cond: function(s,c) { return c.patronPhase === 'favored'; }, t: function(n) { return n + '在一个私人聚会上对你格外温柔——他在众人面前搂着你的腰，称你为"我的伴侣"。你知道这是表演。但其他宾客看你的眼神确实不同了。你获得了一种奇怪的、建立在流沙上的地位。'; }, e: eff({a:12,b:-5,t:6}) },

    /* ======= 心理操纵 Manipulation (10 events, weight 10) ======= */
    { cat: 'manipulation', w: 10, t: function(n) { return n + '今天对你说："你知道吗，就算你现在逃出去，你也没有身份、没有钱、不会说流利的日语。你能去哪里？你不知道怎么回去——就算回去了，华夏那边会怎么看你？"'; }, e: eff({a:-2,b:0,t:12,e:-5}) },
    { cat: 'manipulation', w: 10, t: function(n) { return n + '给你看了一段视频——是一个试图逃跑的女人被拖回来的画面。他说他不认识那个女人，但他播放这段视频的眼神让你明白：这是给你的。'; }, e: eff({a:-5,b:8,t:15,e:-8}) },
    { cat: 'manipulation', w: 10, t: function(n) { return '你发现自己开始期待' + n + '温柔的日子。你痛恨这种期待——这意味着你的心理防线正在瓦解。但是当一个暴君偶尔仁慈时，那种仁慈的甜味比持续的善意更让人上瘾。'; }, e: eff({a:5,b:-3,t:8}) },
    { cat: 'manipulation', w: 10, t: function(n) { return n + '今天对你说了一句"其实我是爱你的"。你看着他，试图在他脸上找到这句话的真实性。你分不清——他是在自我欺骗，还是在执行某种更精巧的控制。也许两者都有。'; }, e: eff({a:8,b:-2,t:10}) },
    { cat: 'manipulation', w: 10, t: function(n) { return '你发现自己开始用日语自言自语。不是因为被强迫——只是渐渐地，华夏语在你的日常中越来越少出现。你用日语想事情、做梦、甚至在纸上写字。你坐在镜前，对着那个说日语的女人感到陌生。'; }, e: eff({a:3,b:0,t:8}) },
    { cat: 'manipulation', w: 10, t: function(n) { return n + '今天心情很好，破例给了你一部翻盖手机——"只能打给我"。你握着那块冰冷的塑料，意识到这是你几个月以来第一次触摸到手机。你翻到拨号盘，输入了一个你还记得的华夏号码——然后按了删除。你还没准备好。'; }, e: eff({a:15,b:-8,t:5,e:7}) },
    { cat: 'manipulation', w: 10, t: function(n) { return '你今天拒绝了' + n + '的要求。他什么都没说，只是沉默地看了你很久。然后他站起来，走到门口，回头说："你觉得自己还有选择吗？"门在你面前关上了——但这不是踢门，是轻轻地带上。那种轻柔的力度比任何暴力都更让你窒息。'; }, e: eff({a:-8,b:5,t:12}) },
    { cat: 'manipulation', w: 10, t: function(n) { return n + '带你去了神社。他让你许愿。你闭上眼睛，双手合十——但你不知道该向日本的神明说什么。你最后许的愿和儿时读过的童话中主角许的一样：回家。睁开眼睛时，' + n + '正在看你，面带微笑。你不知道他在想什么。'; }, e: eff({a:8,b:-1,t:6}) },
    { cat: 'manipulation', w: 10, cond: function(s,c) { return c.childrenWithPatron >= 1; }, t: function(n) { return n + '突然带了一个孩子来见你——孩子大约三四岁，长得像他。"这是你的女儿，"他说。你不知道如何反应。那张小脸对你来说是完全陌生的——她被抱走的时候才是个婴儿。现在她怯生生地看着你，似乎不知道你是谁。你伸出手，她后退了一步。'; }, e: eff({a:-3,b:0,t:25}) },
    { cat: 'manipulation', w: 10, t: function(n) { return '你注意到一件事——当你表现得顺从时，' + n + '会给你更多的"自由"。当他觉得你放弃了逃跑的念头，守卫就松懈了。你开始有意识地表演一个"被驯服的女人"。但你自己也分不清——你的表演，是不是正在变成现实？'; }, e: eff({a:10,b:-5,t:7,e:10}) },

    /* ======= 逃离机会 Escape (9 events, weight 8) ======= */
    { cat: 'escape', w: 8, t: function(n) { return '后门的锁今天坏了。守卫临时用了铁丝代替。你看到了那条铁丝——只要一剪，后门就会打开。但你手里没有钳子，而且你还需要知道外面那条巷子通往哪里。'; }, e: eff({a:0,b:0,t:2,e:10}) },
    { cat: 'escape', w: 8, t: function(n) { return '你今天在洗衣房发现了一套守卫的备用制服。它有点大，但在黑暗中可能不会被注意到。你把它藏在了你的衣柜最深处——压在那些和服的下面。'; }, e: eff({a:0,b:0,t:1,e:12}) },
    { cat: 'escape', w: 8, t: function(n) { return '佣人在后院倒垃圾时没有锁门。你假装在帮忙，趁机溜出了后院——看到了外面的街道。那是一条普通的日本住宅区街道。你记住了最近一家便利店的招牌——罗森。这个信息将来可能会有用。'; }, e: eff({a:0,b:0,t:2,e:14}) },
    { cat: 'escape', w: 8, t: function(n) { return n + '连续三天没有来找你。守卫交班时你注意到了规律——凌晨四点到五点之间，守夜人会去院子抽烟。十五分钟的空档。你只需要找到一把钥匙和一双不会发出声响的鞋子。'; }, e: eff({a:0,b:0,t:1,e:15}) },
    { cat: 'escape', w: 8, cond: function(s,c) { return c.patronObserveCount >= 5; }, t: function(n) { return '你今天在清洁楼梯时偷听到守卫的对话——下个月有一场大型祭典，整个街区都会非常混乱。那是逃跑的最佳时机。你只需要坚持到下个月。'; }, e: eff({a:0,b:0,t:3,e:18}) },
    { cat: 'escape', w: 8, t: function(n) { return '配送食材的卡车每周二上午准时到后门。你注意到司机是一个华夏裔老人——看起来六十多岁。他每次都会对佣人微笑。如果他能帮你——如果他愿意帮你——你只需要一个藏身的地方。'; }, e: eff({a:0,b:0,t:1,e:12}) },
    { cat: 'escape', w: 8, t: function(n) { return '你在' + n + '的抽屉里发现了一本护照——不是你的名字，但照片上的人和你长得有几分相似。是被上一任"情人"留下的，还是他给下一任准备的？你把护照放回原处，但记住了它的位置。'; }, e: eff({a:0,b:0,t:0,e:20}) },
    { cat: 'escape', w: 8, cond: function(s,c) { return c.patronEscapeProgress >= 60; }, t: function(n) { return '今天有一个包裹寄到了宅邸——收件人是一个你不认识的名字。佣人把那包东西放在了储藏室。你悄悄打开看了一眼：里面是现金，大约五十万日元，还有一张去往福冈的新干线车票。这不是给你的——但也许是某个人不小心暴露的秘密。'; }, e: eff({a:0,b:0,t:5,e:10,m:5000}) },
    { cat: 'escape', w: 8, cond: function(s,c) { return c.patronEscapeProgress >= 75; }, t: function(n) { return '那个华夏裔律师又来了。这次他故意在经过你身边时掉了一张名片。你捡起来看了一眼——日本法律援助协会，大阪事务所。他走了之后，你把名片藏在和服的腰带夹层里。'; }, e: eff({a:0,b:0,t:5,e:20}) },

    /* ======= 怀孕育儿 Pregnancy (8 events, weight 10) ======= */
    { cat: 'pregnancy', w: 10, cond: function(s,c) { return c.pregnantByPatron; }, t: function(n) { return '你开始感觉到胎动了——第一次，在你腹中有什么东西轻轻地踢了一下。你把手放在肚子上，不知道该如何面对这个新生命。它有' + n + '的血统。但它也是你的。'; }, e: eff({a:5,b:-2,t:8}) },
    { cat: 'pregnancy', w: 10, cond: function(s,c) { return c.pregnantByPatron; }, t: function(n) { return '孕吐很严重。你在卫生间吐得一塌糊涂，' + n + '在门外不耐烦地踱步。"你怎么这么娇气？"他说。你没有力气解释——他只是想要一个孩子，他从来没有想过你需要经历什么才能给他一个。'; }, e: eff({a:-3,b:5,t:8,h:-3}) },
    { cat: 'pregnancy', w: 10, cond: function(s,c) { return c.pregnantByPatron; }, t: function(n) { return n + '开始对你格外小心——不是因为关心你，而是因为他"不希望孩子出问题"。你得到了更多的营养品、更软的床垫、更温暖的房间。你知道这些优待不属于你——它们属于你腹中的货物。'; }, e: eff({a:8,b:-5,t:5}) },
    { cat: 'pregnancy', w: 10, cond: function(s,c) { return c.childrenWithPatron >= 1 && !c.pregnantByPatron; }, t: function(n) { return '你路过婴儿房时听到了哭声——那是另一个被囚禁的女人的孩子。哭声从门缝里挤出来，短促而绝望。你不知道那些孩子们最后都去了哪里。或者你知道——只是不想承认。'; }, e: eff({a:0,b:0,t:15}) },
    { cat: 'pregnancy', w: 10, cond: function(s,c) { return c.pregnantByPatron; }, t: function(n) { return '你害怕了。你开始偷偷做运动——跳跃、爬楼梯、搬运重物。你希望这个孩子不要来到这个世界上。然后你在镜子里看到自己，被这个念头吓得说不出话——你不是这样的人。但这个地方正在把你变成这样的一个人。'; }, e: eff({a:0,b:2,t:18,h:-5}) },
    { cat: 'pregnancy', w: 10, cond: function(s,c) { return !c.pregnantByPatron && c.patronPregnancyCooldown <= 1 && c.childrenWithPatron >= 1; }, t: function(n) { return n + '又开始提孩子的事了。"再要一个"——这句话他已经说了好几天了。你说你还没恢复好。他说你的身体"看起来没问题"。你知道接下来会发生什么。'; }, e: eff({a:-3,b:6,t:10}) },
    { cat: 'pregnancy', w: 10, cond: function(s,c) { return c.pregnantByPatron; }, t: function(n) { return '深夜，你对着隆起的腹部哼了一首华夏语的摇篮曲。那是你妈妈小时候给你唱过的——你早已忘了歌词，但旋律还在心里。你唱完之后小声说了句"对不起"——你也不知道是对谁说的。'; }, e: eff({a:0,b:0,t:6}) },
    { cat: 'pregnancy', w: 10, cond: function(s,c) { return c.patronPregnancyCooldown > 0 && !c.pregnantByPatron; }, t: function(n) { return '医生今天来做例行检查了。他说你的身体"恢复得很好，可以再尝试怀孕了"。' + n + '在门外露出了满意的微笑。你躺在检查椅上，盯着天花板——还是那二十三条裂缝，一条不多，一条不少。'; }, e: eff({a:3,b:5,t:8}) },

    /* ======= 幻梦Cos服 Cosplay (8 events, weight 5) ======= */
    { cat: 'cosplay', w: 5, cond: function(s,c) { return c.cosplayBonded >= 1 || (s.profile && s.profile.cosplay); }, t: function(n) { return '你摸到后背——那块布料已经完全和皮肤长在了一起。你撕了一下，出血了。不是你自己的意愿——是你惊恐地发现：你甚至不知道原本的自己应该是什么样子的了。'; }, e: eff({a:0,b:0,t:12,h:-2}) },
    { cat: 'cosplay', w: 5, cond: function(s,c) { return c.cosplayBonded >= 1; }, t: function(n) { return n + '今天特别兴奋。他让你穿着Cos服做出角色招牌动作。你在镜子前举起手臂——那个姿势你从来没有学过，但你的身体却自然而然地完成了。你感到一阵眩晕：这是谁在做这个动作？'; }, e: eff({a:8,b:-3,t:10}) },
    { cat: 'cosplay', w: 5, cond: function(s,c) { return c.cosplayBonded >= 2; }, t: function(n) { return '你的声音开始变得不像自己了——不是日语口音的问题，是音色本身在变化。说话时你偶尔会用到不属于你的语气和措辞。你不知道那是角色的台词，还是Cos服在替你说话。'; }, e: eff({a:0,b:0,t:10}) },
    { cat: 'cosplay', w: 5, cond: function(s,c) { return c.cosplayBonded >= 2; }, t: function(n) { return '夜里你做了一个梦——梦里你是那个动漫角色，在属于你的世界里奔跑。醒来时你心里有一瞬间的轻松——因为梦里的世界不需要逃跑。然后你意识到：Cos服正在重写你的梦想。'; }, e: eff({a:0,b:0,t:14}) },
    { cat: 'cosplay', w: 5, cond: function(s,c) { return c.cosplayBonded >= 3; }, t: function(n) { return '你在一本旧笔记上找到了自己的华夏语签名。你试着模仿那个笔迹——但是你的手不听使唤。手指已经被重新训练过了，习惯于另一种握笔方式、另一种笔画。你连自己的签名都写不出来了。'; }, e: eff({a:0,b:0,t:20}) },
    { cat: 'cosplay', w: 5, cond: function(s,c) { return c.cosplayBonded >= 1; }, t: function(n) { return 'Cos服今天出现了裂痕——在左肩的位置。你看到裂口下面露出了一点属于你自己的皮肤。你用手遮住了那个裂口，不是因为羞耻，而是因为那一片正常的皮肤看起来太过刺眼、太过"不属于这里"。'; }, e: eff({a:0,b:0,t:8,h:-1}) },
    { cat: 'cosplay', w: 5, cond: function(s,c) { return c.cosplayBonded >= 3; }, t: function(n) { return n + '今天叫你"你角色的名字"。你没有纠正他——因为那一瞬间你确实愣了一下：他在叫谁？你花了一秒才想起自己的本名。那一秒让你浑身发冷。'; }, e: eff({a:3,b:0,t:15}) },
    { cat: 'cosplay', w: 5, cond: function(s,c) { return c.cosplayBonded >= 2; }, t: function(n) { return '你在衣柜深处翻到了一件你自己的旧内衣——华夏品牌的，洗得泛白的棉布。你把脸埋在里面，深吸一口气。它闻起来不像任何日本产品，不像任何Cos服的化纤。那是你在这个房间里能找到的，唯一还属于"你"的东西。'; }, e: eff({a:0,b:0,t:6}) },

    /* ======= 其他人物 Others (8 events, weight 6) ======= */
    { cat: 'others', w: 6, t: function(n) { return '宅邸里新来了一个年轻女仆。她在打扫你房间时悄悄问你："你也是被带来的人吗？"你没有回答。但第二天她给你多放了一份甜点——和式甜馒头。你不知道那是不是她的善意，还是陷阱。'; }, e: eff({a:0,b:0,t:3,e:5}) },
    { cat: 'others', w: 6, t: function(n) { return '一个年长的佣人——大约六十多岁的日本女性——在你哭的时候递给你一条手帕。"我也是那时候过来的"，她用很小的声音说，然后像什么都没发生一样继续打扫。你后来才知道，她年轻时也被卖到这里做过同样的事。'; }, e: eff({a:0,b:0,t:8,e:8}) },
    { cat: 'others', w: 6, t: function(n) { return '守卫换人了。新来的年轻人看上去比之前的更紧张。他不敢正眼看你。也许他接受不了这个工作的本质——或者也许他刚来，还没有学会如何合理化对这些女人的囚禁。'; }, e: eff({a:0,b:-2,t:2,e:5}) },
    { cat: 'others', w: 6, t: function(n) { return '那个被关在地下室的女人你见过一次——在走廊的转角。她看起来比你小很多，可能十五岁？她的眼睛是空洞的，像两颗被摘掉了果肉的杏核。你们对视了一秒，然后守卫把她拖走了。你至今不知道她的名字。'; }, e: eff({a:0,b:0,t:12,e:3}) },
    { cat: 'others', w: 6, t: function(n) { return n + '的管家——一个中年男子，总是穿着黑色西装——今天在你面前叫错了你的名字。他叫了一个你不认识的外国名字。那是上一任被囚禁在这里的女人的名字。原来这个房间不停地有新的女人被带进来、带出去。你是哪一个？'; }, e: eff({a:0,b:0,t:10,e:2}) },
    { cat: 'others', w: 6, cond: function(s,c) { return c.patronPhase === 'favored'; }, t: function(n) { return '那个年轻守卫今天偷偷给了你一张纸条——上面只写了几个字："我在攒钱。"你没有回答。但你去花园散步时特地绕了他值班的路线。也许他不一样，也许他不。你不敢赌。'; }, e: eff({a:0,b:0,t:4,e:10}) },
    { cat: 'others', w: 6, t: function(n) { return '一个穿着粉色衣服的小女孩出现在庭院里。她是' + n + '的孙女。她用稚嫩的日语问你："你为什么一直住在这里？你没有家吗？"你不知道该怎么回答一个小孩子的问题。你只是笑了笑——那是你练习过很多次的微笑。'; }, e: eff({a:0,b:0,t:8}) },
    { cat: 'others', w: 6, t: function(n) { return '有人在半夜敲了你的窗户。不是守卫——是一个女人的声音，用华夏语说："别怕，我也在这里。"你贴到窗边，试图看到她的样子，但夜色太重。你只能听到她离开时轻轻的脚步声。你至今不知道她是谁。'; }, e: eff({a:0,b:0,t:3,e:12}) },

    /* ======= 特殊事件 Special (7 events, weight 3) ======= */
    { cat: 'special', w: 3, cond: function(s,c) { return c.patronAbuse >= 60; }, t: function(n) { return '你今天在浴室里试图用碎瓷片割开Cos服——你想看看下面还有没有你自己的皮肤。血从缝隙里渗出来，但你看到了——下面还是你自己的身体，没有完全被替换。你因为这个发现哭了出来。不是因为疼。是因为你还存在。'; }, e: eff({a:0,b:0,t:10,h:-5,e:5}) },
    { cat: 'special', w: 3, cond: function(s,c) { return s.totalMonths % 12 === 0 || s.totalMonths % 12 === 5; }, t: function(n) { return '今天是华夏的新年。你在这个日本宅邸里默默地包了一盘饺子——用的是你能找到的最接近华夏面粉的材料。你在馅里放了一枚硬币——你小时候你妈妈总是这么做，吃到硬币的孩子会有好运。你没有吃到硬币。你也不知道自己还能不能等到下一个春节。'; }, e: eff({a:0,b:0,t:15,e:3}) },
    { cat: 'special', w: 3, t: function(n) { return n + '今天收到了一个包裹——里面是一套新的Cos服。他兴奋地让你试穿。你把新的服装套在旧的上面——旧的已经长在你的皮肤上了，你无法脱下它。新的和旧的重叠在一起，你感到一种令人窒息的重压。你照了照镜子——镜中的那个人看起来像是一场被反复擦写过的黑板。'; }, e: eff({a:3,b:5,t:15,h:-3}) },
    { cat: 'special', w: 3, cond: function(s,c) { return c.patronEscapeProgress >= 70 && c.patronEscapeCooldown <= 0; }, t: function(n) { return '今天晚上有台风。全城的警报都响了。宅邸里乱成一团——守卫们忙着搬花盆、加固窗户。你站在黑暗的走廊里，听着风雨声夹杂警报声。这是你见过的最好的时机——因为没有人会听到你翻墙的声音。也没有人会听到你在暴风雨中奔跑的脚步声。'; }, e: eff({a:0,b:0,t:5,e:25}) },
    { cat: 'special', w: 3, cond: function(s,c) { return c.patronPhase === 'favored' && c.patronAffection >= 75; }, t: function(n) { return '今晚' + n + '喝了很多酒。他拉着你的手说："如果我先遇到的是你就好了——在我还没有结婚之前。"他的眼泪滴在你的手背上，温热而黏腻。你觉得荒诞——囚禁你的人正在向你袒露脆弱的内心。你把手抽了回去。他怔了一下，然后开始哭——像个孩子一样。你不打算安慰他。'; }, e: eff({a:10,b:-10,t:10}) },
    { cat: 'special', w: 3, cond: function(s,c) { return c.patronAbuse >= 85; }, t: function(n) { return '今天早上，' + n + '没有来吃早餐。你后来听说——他昨晚被逮捕了。经济犯罪。他的公司被查封了，宅邸被贴了封条。没有人知道你该去哪里，你也不知道自己现在算什么。你坐在被封死的后院里，看着那片四方的天空——这不是逃跑，但这扇一直紧锁的门，突然就开了。'; }, e: eff({a:0,b:0,t:10,e:30}) },
    { cat: 'special', w: 3, cond: function(s,c) { return c.childrenWithPatron >= 2 && !c.pregnantByPatron; }, t: function(n) { return '你开始在夜里对着窗户说话——你说华夏语，小声地，把你能记住的每一个故事讲给空气听。你不知道你的孩子们现在在哪里，不知道他们还活着吗，不知道他们会不会知道自己的母亲是谁。但你希望——如果你讲的故事足够多，总有一天，会有一个故事飘出这扇窗户，找到正在世界某个角落长大的他们。'; }, e: eff({a:0,b:0,t:15}) },
    /* ======= 家庭通信 FamilyCall (3 events, weight 2) ======= */
    { cat: 'familycall', w: 2, cond: function(s,c) { return c.patronPhase === 'favored' && c.patronAffection >= 65; }, t: function(n) { return n + '今晚醉得很深。他递给你一部手机——"你可以打一个电话。给你父母。但要开免提。"你颤抖着按下了那个你还记得的号码。电话那头传来了母亲的声音——她说"喂？"你张开了嘴，但' + n + '的手指正放在挂断键上。你只能说了一句"我很好"——然后他挂断了。你妈妈可能永远不会知道那个电话是谁打的。'; }, e: eff({a:3,b:-2,t:20,e:8}) },
    { cat: 'familycall', w: 2, cond: function(s,c) { return c.patronAffection >= 75; }, t: function(n) { return '你趁' + n + '睡着时偷了他的手机。你冲到卫生间，锁上门，拨了你父亲的号码。他接了——你说出了自己的名字。电话那头沉默了五秒。然后你父亲说："你在哪里？我去找你。"你还没来得及回答，门被踢开了。你在' + n + '夺过手机之前对着话筒喊出了最后几个字——你希望它们能传过大洋。'; }, e: eff({a:-15,b:20,t:12,e:15,h:-3}) },
    { cat: 'familycall', w: 2, t: function(n) { return '今天你收到了一封航空信——' + n + '把它扔在茶几上就走了。信封上是你母亲的笔迹。她写道："我们一直在找你。警察说你是自愿出国的——但我不信。如果你能看到这封信，打这个号码。"信纸上有一个华夏的电话号码。你把信藏在和服腰带里，但这号码你能倒背如流。'; }, e: eff({a:0,b:0,t:15,e:8}) },
    /* ======= 大使馆线 Embassy (3 events, weight 2) ======= */
    { cat: 'embassy', w: 2, cond: function(s,c) { return s.totalMonths - (c.imprisonedMonth || s.totalMonths) >= 12; }, t: function(n) { return '今天宅邸来了一位不速之客——一个穿着深蓝色套装的中年女人。她说她是华夏驻日领事馆的工作人员，正在调查"涉及华夏公民的人口贩卖案件"。' + n + '在门口就把她拦住了，礼貌但坚决。"我这里有你们要找的人吗？"他笑着问。那个女人看了你一眼——你站在走廊尽头，手里端着茶盘。你只需要喊出一个字。但你看到她身后还跟着' + n + '的律师。你没有喊。她走了。'; }, e: eff({a:-3,b:5,t:25,e:10}) },
    { cat: 'embassy', w: 2, cond: function(s,c) { return c.patronAbuse >= 60; }, t: function(n) { return '医生今天来给你处理伤口时，注意到了那些不属于"日常意外"的痕迹——陈旧性骨折的疤痕、手腕上的勒痕。他犹豫了一下，压低声音问："需要我帮你联系领事馆吗？"你没有回答。他撕下一张处方笺，在背面写了一个电话号，塞进了你的手心。'; }, e: eff({a:0,b:0,t:5,e:25}) },
    { cat: 'embassy', w: 2, cond: function(s,c) { return c.patronEscapeProgress >= 70 && c.patronObserveCount >= 10; }, t: function(n) { return '你利用几个月来收集的证据——偷拍的照片、记下的车牌号、' + n + '的名片复印件——整理了一份材料。你趁一次外出就医的机会，把信封塞给了诊所前台那位华夏裔护士。两周后，一封来自华夏领事馆的挂号信寄到了宅邸。' + n + '看到信的时候脸白了。你不知道信里具体写了什么——但你的材料显然已经送到了该送的地方。'; }, e: eff({a:-20,b:15,t:10,e:25}) },
  ];

  function pickEvent(state, c) {
    if (!c || !c.underPatron) return null;
    var eligible = EVENTS.filter(function(ev) {
      if (ev.cond && !ev.cond(state, c)) return false;
      return true;
    });
    if (!eligible.length) return EVENTS[0];

    var personaMultiplier = function(cat) {
      if (c.patronPersonaType === '暴君') {
        if (cat === 'violence') return 3.0;
        if (cat === 'intimacy') return 1.5;
        if (cat === 'manipulation') return 0.5;
      }
      if (c.patronPersonaType === '温柔控制') {
        if (cat === 'manipulation') return 3.0;
        if (cat === 'daily') return 1.8;
        if (cat === 'violence') return 0.3;
      }
      if (c.patronPersonaType === '冷漠商人') {
        if (cat === 'social') return 2.5;
        if (cat === 'others') return 2.0;
        if (cat === 'daily') return 0.5;
      }
      return 1.0;
    };

    var totalWeight = eligible.reduce(function(sum, ev) {
      return sum + (ev.w || 10) * personaMultiplier(ev.cat || '');
    }, 0);
    var roll = Math.random() * totalWeight;
    var accumulated = 0;
    for (var i = 0; i < eligible.length; i++) {
      accumulated += (eligible[i].w || 10) * personaMultiplier(eligible[i].cat || '');
      if (roll <= accumulated) return eligible[i];
    }
    return eligible[eligible.length - 1];
  }

  Game.cradlePatronEvents = Object.freeze({ pickEvent: pickEvent });
}(window));
