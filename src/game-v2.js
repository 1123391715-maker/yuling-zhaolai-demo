(function (root) {
  'use strict';
  var YL = root.YL = root.YL || {};
  var A = YL.Art, C = YL.COLORS, W = YL.W, H = YL.H;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function distance(ax, ay, bx, by) { return Math.sqrt(dist2(ax, ay, bx, by)); }
  function choice(list) { return list[(Math.random() * list.length) | 0]; }
  function removeFrom(list, item) { var i = list.indexOf(item); if (i >= 0) list.splice(i, 1); }
  function cover(ctx, img, x, y, w, h) {
    if (!img || !(img.width || img.naturalWidth)) return false;
    var iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
    var scale = Math.max(w / iw, h / ih), sw = w / scale, sh = h / scale;
    ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
    return true;
  }
  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0, tmp = list[i];
      list[i] = list[j]; list[j] = tmp;
    }
    return list;
  }

  var HERO_META = {
    hongyi: {
      name: '红衣', role: '范围灼烧', color: C.fire, sprite: 'heroHongyi', icon: 0,
      attack: ['火羽伤害 +25%', '火羽附加持续灼烧', '火羽命中产生爆燃'],
      passive: ['灼烧时间 +2 秒', '灼烧敌人死亡时传火', '灼烧可叠加并扩大范围'],
      ultimate: ['焚火阵伤害 +35%', '焚火阵范围 +30%', '焚火阵连续爆发三次']
    },
    xuanya: {
      name: '玄鸦', role: '精英猎杀', color: '#d9c7a6', sprite: 'heroXuanya', icon: 4,
      attack: ['斩击伤害 +25%', '对精英与首领增伤 +35%', '斩击追加一道鸦影'],
      passive: ['每四击必定暴击', '生命低于 35% 时闪避提升', '处决生命低于 15% 的非首领'],
      ultimate: ['影袭额外攻击一次', '优先锁定精英并破甲', '影袭结束后获得无敌']
    },
    huangjin: {
      name: '黄巾', role: '多重阻挡', color: C.gold, sprite: 'heroHuangjin', icon: 6,
      attack: ['镇山锤伤害 +25%', '每三击触发范围震地', '震地击退并眩晕敌群'],
      passive: ['受到伤害降低 12%', '阻挡数 +1', '受击反震阻挡中的敌人'],
      ultimate: ['金刚护体护盾 +40%', '嘲讽守备范围内敌人', '护体期间每秒震荡敌群']
    },
    suwen: {
      name: '素问', role: '治疗守护', color: C.jade, sprite: 'heroSuwen', icon: 7,
      attack: ['灵灯伤害 +25%', '灵灯命中为最低血御灵治疗', '灵灯弹射一次并治疗两人'],
      passive: ['治疗量 +25%', '治疗附加短时护盾', '魂归结束时治疗全队'],
      ultimate: ['回春术治疗量 +35%', '回春术覆盖全队', '回春术令一名魂归御灵提前返场']
    },
    qingyi: {
      name: '青衣', role: '减速控场', color: C.blue, sprite: 'heroQingyi', icon: 2,
      attack: ['水刃伤害 +25%', '水刃减速时间 +2 秒', '水刃命中产生寒潮'],
      passive: ['减速强度提高', '每五击击退目标', '被减速敌人受到伤害提高 15%'],
      ultimate: ['渡水锋伤害 +35%', '渡水锋冻结普通敌人', '渡水锋往返斩击两次']
    }
  };

  var ANCHORS = [
    { x: 125, y: 830, name: '左翼' },
    { x: 250, y: 792, name: '左中' },
    { x: 375, y: 770, name: '中军' },
    { x: 500, y: 792, name: '右中' },
    { x: 625, y: 830, name: '右翼' }
  ];
  var SOUL_SLOTS = [
    { x: 205, y: 1090 }, { x: 545, y: 1090 }, { x: 165, y: 1218 },
    { x: 375, y: 1262 }, { x: 585, y: 1218 }
  ];

  function Game(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = options || {};
    this.platform = this.options.platform || 'web';
    this.wx = this.options.wx;
    this.audio = new YL.AudioBus(this.platform);
    this.assets = {};
    this.loaded = 0;
    this.loadTotal = 0;
    this.state = 'loading';
    this.last = 0;
    this.time = 0;
    this.screenW = W;
    this.screenH = H;
    this.dpr = 1;
    this.pointer = { x: W / 2, y: H / 2, down: false };
    this.dragSoul = null;
    this.paused = false;
    this.infoOverlay = null;
    this.shake = 0;
    this.idSeed = 1;
    this.boundLoop = this.loop.bind(this);
  }

  Game.prototype.start = function () {
    this.resize();
    this.bindInput();
    this.loadAssets();
    this.raf(this.boundLoop);
  };

  Game.prototype.resize = function () {
    if (this.platform === 'wechat' && this.wx) {
      var info = this.wx.getSystemInfoSync();
      this.screenW = info.windowWidth; this.screenH = info.windowHeight;
      this.dpr = Math.min(2, info.pixelRatio || 1);
    } else {
      this.screenW = root.innerWidth || W; this.screenH = root.innerHeight || H;
      this.dpr = Math.min(2, root.devicePixelRatio || 1);
    }
    this.canvas.width = Math.floor(W * this.dpr);
    this.canvas.height = Math.floor(H * this.dpr);
  };

  Game.prototype.raf = function (fn) {
    var r = root.requestAnimationFrame || (this.wx && this.wx.requestAnimationFrame);
    if (r) r(fn); else setTimeout(function () { fn(Date.now()); }, 16);
  };

  Game.prototype.makeImage = function () {
    if (this.canvas.createImage) return this.canvas.createImage();
    if (typeof Image !== 'undefined') return new Image();
    return null;
  };

  Game.prototype.loadAssets = function () {
    var self = this, keys = Object.keys(YL.ASSETS);
    this.loadTotal = keys.length;
    keys.forEach(function (key) {
      var img = self.makeImage();
      if (!img) { self.loaded++; return; }
      img.onload = function () { self.loaded++; if (self.loaded >= self.loadTotal) self.state = 'title'; };
      img.onerror = function () { self.loaded++; if (self.loaded >= self.loadTotal) self.state = 'title'; };
      img.src = YL.ASSETS[key];
      self.assets[key] = img;
    });
    setTimeout(function () { if (self.state === 'loading') self.state = 'title'; }, 4500);
  };

  Game.prototype.mapPoint = function (p) {
    if (this.platform === 'wechat') return { x: p.clientX / this.screenW * W, y: p.clientY / this.screenH * H };
    var rect = this.canvas.getBoundingClientRect();
    return { x: (p.clientX - rect.left) / rect.width * W, y: (p.clientY - rect.top) / rect.height * H };
  };

  Game.prototype.bindInput = function () {
    var self = this;
    function start(e) {
      var p = e.touches ? e.touches[0] : e; if (!p) return;
      var q = self.mapPoint(p);
      self.pointer.x = q.x; self.pointer.y = q.y; self.pointer.down = true;
      self.onDown(q.x, q.y);
      if (e.preventDefault) e.preventDefault();
    }
    function move(e) {
      var p = e.touches ? e.touches[0] : e; if (!p) return;
      var q = self.mapPoint(p);
      self.pointer.x = q.x; self.pointer.y = q.y;
      if (e.preventDefault) e.preventDefault();
    }
    function end(e) {
      var p = e.changedTouches ? e.changedTouches[0] : e;
      var q = p ? self.mapPoint(p) : self.pointer;
      self.pointer.down = false; self.onUp(q.x, q.y);
      if (e.preventDefault) e.preventDefault();
    }
    if (this.platform === 'wechat' && this.wx) {
      this.wx.onTouchStart(start); this.wx.onTouchMove(move); this.wx.onTouchEnd(end);
    } else {
      this.canvas.addEventListener('pointerdown', start, { passive: false });
      root.addEventListener('pointermove', move, { passive: false });
      root.addEventListener('pointerup', end, { passive: false });
      root.addEventListener('resize', function () { self.resize(); });
      if (root.document) root.document.addEventListener('visibilitychange', function () {
        if (root.document.hidden && self.state === 'battle') self.paused = true;
      });
    }
  };

  Game.prototype.onDown = function (x, y) {
    this.audio.unlock();
    if (this.state === 'title') {
      if (y > 1030 && y < 1165) { this.audio.tone('bell'); this.beginBattle(); }
      return;
    }
    if (this.state === 'result') {
      if (y > 1080 && y < 1205) { this.audio.tone('bell'); this.beginBattle(); }
      return;
    }
    if (this.state !== 'battle') return;
    if (this.infoOverlay) { this.infoOverlay = null; return; }
    if (this.paused) {
      if (x > 225 && x < 525 && y > 735 && y < 835) this.paused = false;
      return;
    }
    if (this.phase === 'cards') {
      for (var ci = 0; ci < 3; ci++) {
        var cardX = 35 + ci * 235;
        if (x >= cardX && x <= cardX + 215 && y >= 390 && y <= 860) { this.pickCard(ci); return; }
      }
      return;
    }
    if (x > 680 && y >= 135 && y <= 485) {
      var action = Math.floor((y - 135) / 86);
      if (action === 0) this.paused = true;
      else if (action === 1) this.infoOverlay = 'data';
      else if (action === 2) this.speed = this.speed >= 3 ? 1 : this.speed + 1;
      else this.infoOverlay = 'enemy';
      return;
    }
    for (var i = 0; i < this.heroes.length; i++) {
      var hero = this.heroes[i], slot = SOUL_SLOTS[hero.soulSlot];
      if (dist2(x, y, slot.x, slot.y - 25) < 55 * 55) {
        this.dragSoul = hero;
        this.audio.tone('shoot');
        return;
      }
    }
  };

  Game.prototype.onUp = function (x, y) {
    if (this.state !== 'battle' || !this.dragSoul) return;
    var best = Infinity, targetSlot = this.dragSoul.soulSlot;
    for (var i = 0; i < SOUL_SLOTS.length; i++) {
      var slot = SOUL_SLOTS[i], d = dist2(x, y, slot.x, slot.y - 25);
      if (d < best) { best = d; targetSlot = i; }
    }
    var from = this.dragSoul.soulSlot;
    if (targetSlot !== from && best < 95 * 95) {
      var other = this.heroAtSoulSlot(targetSlot);
      if (other) other.soulSlot = from;
      this.dragSoul.soulSlot = targetSlot;
      this.message = '魂位已换 · 下次魂归从新位返场';
      this.messageTime = 2.4;
      this.burst(SOUL_SLOTS[targetSlot].x, SOUL_SLOTS[targetSlot].y - 25, C.gold, 16);
      this.audio.tone('bell');
    }
    this.dragSoul = null;
  };

  Game.prototype.heroAtSoulSlot = function (slot) {
    for (var i = 0; i < this.heroes.length; i++) if (this.heroes[i].soulSlot === slot) return this.heroes[i];
    return null;
  };

  Game.prototype.makeHero = function (type, slot, stats) {
    var anchor = ANCHORS[slot], meta = HERO_META[type];
    return {
      id: this.idSeed++, type: type, name: meta.name, role: meta.role,
      soulSlot: slot, anchorIndex: slot, x: anchor.x, y: anchor.y,
      hp: stats.hp, maxHp: stats.hp, shield: 0, defense: stats.defense || 0,
      block: stats.block, search: stats.search, attackRange: stats.range,
      moveSpeed: stats.move, damage: stats.damage, rate: stats.rate,
      projectileSpeed: stats.projectile || 0, alive: true, respawn: 0,
      respawnMax: 8, invuln: 1.2, target: null, attackCd: Math.random() * .4,
      ultimateCd: stats.ultimate, ultimateMax: stats.ultimate,
      healCd: 2.5, attackCount: 0, flash: 0, attackAnim: 0, attackDuration: .38,
      scale: stats.scale || .72, blocked: [], damageDone: 0, healingDone: 0,
      blockedTotal: 0, deaths: 0, upgrades: { attack: 0, passive: 0, ultimate: 0 }
    };
  };

  Game.prototype.beginBattle = function () {
    this.state = 'battle'; this.phase = 'wave'; this.paused = false; this.infoOverlay = null;
    this.wave = 1; this.waveMax = 20; this.speed = 1; this.gameTime = 0;
    this.baseMax = 1000; this.baseHp = this.baseMax; this.score = 0; this.coins = 0;
    this.kills = 0; this.totalDamage = 0; this.totalHealing = 0; this.idSeed = 1;
    this.level = 1; this.xp = 0; this.xpNeed = 95; this.pendingLevels = 0; this.upgradeCount = 0;
    this.enemies = []; this.projectiles = []; this.particles = []; this.floaters = []; this.zones = [];
    this.pendingCards = []; this.waveQueue = []; this.intermission = 0;
    this.waveBanner = 2.2; this.messageTime = 5; this.message = '拖动阵中虚影交换魂位 · 场上御灵自动迎敌';
    this.spellCd = { fire: 3.5, bell: 7, water: 5 };
    this.spellMax = { fire: 10, bell: 14, water: 12 };
    this.spellDamage = { fire: 0, bell: 0, water: 0 };
    this.heroes = [
      this.makeHero('hongyi', 0, { hp: 420, block: 1, search: 210, range: 230, move: 90, damage: 58, rate: 1.05, projectile: 500, ultimate: 12, scale: .70 }),
      this.makeHero('xuanya', 1, { hp: 560, block: 2, search: 185, range: 58, move: 126, damage: 76, rate: .82, ultimate: 13, scale: .72 }),
      this.makeHero('huangjin', 2, { hp: 860, block: 4, search: 160, range: 60, move: 82, damage: 50, rate: 1.16, defense: .12, ultimate: 15, scale: .75 }),
      this.makeHero('suwen', 3, { hp: 470, block: 1, search: 195, range: 205, move: 88, damage: 34, rate: 1.2, projectile: 460, ultimate: 14, scale: .68 }),
      this.makeHero('qingyi', 4, { hp: 450, block: 1, search: 220, range: 240, move: 92, damage: 47, rate: 1.08, projectile: 520, ultimate: 13, scale: .69 })
    ];
    this.startWave(1);
  };

  Game.prototype.startWave = function (number) {
    this.wave = number; this.phase = 'wave'; this.waveBanner = 1.65; this.spawnTimer = .35;
    this.waveQueue = [];
    var count = 4 + Math.floor(number * .55);
    for (var i = 0; i < count; i++) {
      var type = 'wisp';
      if (number >= 3 && i % 3 === 1) type = 'jiangshi';
      if (number >= 7 && i % 5 === 3) type = 'armored';
      if (number >= 12 && i % 7 === 5) type = 'swift';
      this.waveQueue.push({ type: type, elite: false, mini: false });
    }
    if (number === 5 || number === 15) this.waveQueue.push({ type: 'armored', elite: true, mini: false });
    if (number === 10) this.waveQueue.push({ type: 'boss', elite: true, mini: true });
    if (number === 20) {
      this.waveQueue = [
        { type: 'jiangshi', elite: true }, { type: 'armored', elite: false },
        { type: 'wisp', elite: true }, { type: 'swift', elite: true },
        { type: 'boss', elite: true, mini: false }
      ];
    }
    this.waveTotal = this.waveQueue.length;
  };

  Game.prototype.spawnEnemy = function (config) {
    var type = config.type, elite = !!config.elite, mini = !!config.mini;
    var lanes = [95, 165, 245, 325, 425, 505, 585, 655];
    var data = {
      wisp: { hp: 62, speed: 48, damage: 22, rate: 1.12, size: .78, xp: 8, coin: 5 },
      swift: { hp: 82, speed: 72, damage: 27, rate: .9, size: .76, xp: 10, coin: 7 },
      jiangshi: { hp: 132, speed: 34, damage: 36, rate: 1.22, size: .90, xp: 12, coin: 9 },
      armored: { hp: 250, speed: 25, damage: 54, rate: 1.35, size: 1.00, xp: 18, coin: 14 },
      boss: { hp: 2100, speed: 14, damage: 105, rate: 1.45, size: 1.34, xp: 130, coin: 120 }
    }[type];
    var scale = 1 + (this.wave - 1) * .075;
    var eliteScale = elite ? 1.65 : 1;
    if (mini) eliteScale *= .62;
    var hp = data.hp * scale * eliteScale;
    this.enemies.push({
      id: this.idSeed++, type: type, x: choice(lanes) + Math.random() * 20 - 10, y: 142,
      hp: hp, maxHp: hp, speed: data.speed * (elite ? 1.05 : 1),
      damage: data.damage * (1 + (this.wave - 1) * .045), attackRate: data.rate,
      attackCd: Math.random() * .5, size: data.size * (elite ? 1.08 : 1),
      xp: data.xp * (elite ? 2 : 1), coin: data.coin * (elite ? 2 : 1),
      elite: elite, mini: mini, blocker: null, breaking: false, dead: false,
      slow: 0, freeze: 0, burn: 0, burnDps: 0, burnTick: 0, hit: 0, age: 0,
      summonCd: type === 'boss' ? 6 : 999, summonAnim: 0, attackAnim: 0,
      attackDuration: type === 'boss' ? .75 : .5
    });
  };

  Game.prototype.getHero = function (id) {
    for (var i = 0; i < this.heroes.length; i++) if (this.heroes[i].id === id) return this.heroes[i];
    return null;
  };

  Game.prototype.getEnemy = function (id) {
    for (var i = 0; i < this.enemies.length; i++) if (this.enemies[i].id === id) return this.enemies[i];
    return null;
  };

  Game.prototype.heroAnchor = function (hero) { return ANCHORS[hero.anchorIndex]; };

  Game.prototype.acquireTarget = function (hero) {
    var anchor = this.heroAnchor(hero), best = null, bestScore = -Infinity;
    for (var i = 0; i < this.enemies.length; i++) {
      var enemy = this.enemies[i];
      if (enemy.dead || dist2(enemy.x, enemy.y, anchor.x, anchor.y) > hero.search * hero.search) continue;
      var score = enemy.y * 2 + (enemy.elite ? 220 : 0) + (enemy.type === 'boss' ? 450 : 0);
      if (enemy.blocker === hero.id) score += 1000;
      if (score > bestScore) { bestScore = score; best = enemy; }
    }
    return best;
  };

  Game.prototype.updateHeroes = function (dt) {
    for (var i = 0; i < this.heroes.length; i++) {
      var hero = this.heroes[i];
      hero.flash = Math.max(0, hero.flash - dt);
      hero.attackAnim = Math.max(0, hero.attackAnim - dt);
      hero.invuln = Math.max(0, hero.invuln - dt);
      if (!hero.alive) {
        hero.respawn -= dt;
        if (hero.respawn <= 0) this.respawnHero(hero);
        continue;
      }
      hero.attackCd -= dt; hero.ultimateCd -= dt; hero.healCd -= dt;
      hero.blocked = [];
      for (var e = 0; e < this.enemies.length; e++) if (this.enemies[e].blocker === hero.id && !this.enemies[e].dead) hero.blocked.push(this.enemies[e].id);

      var target = hero.blocked.length ? this.getEnemy(hero.blocked[0]) : this.getEnemy(hero.target);
      var anchor = this.heroAnchor(hero);
      if (!target || target.dead || dist2(target.x, target.y, anchor.x, anchor.y) > hero.search * hero.search * 1.25) {
        target = this.acquireTarget(hero);
        hero.target = target ? target.id : null;
      }
      if (target) {
        var d = distance(hero.x, hero.y, target.x, target.y);
        if (d > hero.attackRange) {
          var dx = (target.x - hero.x) / Math.max(1, d), dy = (target.y - hero.y) / Math.max(1, d);
          var nx = hero.x + dx * hero.moveSpeed * dt, ny = hero.y + dy * hero.moveSpeed * dt;
          if (dist2(nx, ny, anchor.x, anchor.y) <= hero.search * hero.search) { hero.x = nx; hero.y = ny; }
        } else if (hero.attackCd <= 0) {
          this.heroAttack(hero, target);
          hero.attackCd = hero.rate;
        }
      } else {
        var homeDist = distance(hero.x, hero.y, anchor.x, anchor.y);
        if (homeDist > 3) {
          hero.x += (anchor.x - hero.x) / homeDist * hero.moveSpeed * dt;
          hero.y += (anchor.y - hero.y) / homeDist * hero.moveSpeed * dt;
        }
      }
      if (hero.type === 'suwen' && hero.healCd <= 0) {
        var wounded = this.lowestHealthHero();
        if (wounded && wounded.hp < wounded.maxHp * .78) {
          this.healHero(wounded, 42 * (1 + hero.upgrades.passive * .25), hero);
          hero.healCd = 4.2;
        } else hero.healCd = 1.2;
      }
      if (hero.ultimateCd <= 0) this.castHeroUltimate(hero);
    }
  };

  Game.prototype.syncBlocks = function () {
    var i, enemy, hero;
    for (i = 0; i < this.enemies.length; i++) {
      enemy = this.enemies[i];
      if (enemy.blocker) {
        hero = this.getHero(enemy.blocker);
        if (!hero || !hero.alive || distance(enemy.x, enemy.y, hero.x, hero.y) > 90) enemy.blocker = null;
      }
    }
    for (i = 0; i < this.heroes.length; i++) {
      hero = this.heroes[i]; if (!hero.alive) continue;
      var capacity = hero.block + (hero.type === 'huangjin' && hero.upgrades.passive >= 2 ? 1 : 0);
      var current = 0;
      for (var count = 0; count < this.enemies.length; count++) if (this.enemies[count].blocker === hero.id) current++;
      if (current >= capacity) continue;
      var candidates = [];
      for (var j = 0; j < this.enemies.length; j++) {
        enemy = this.enemies[j];
        if (!enemy.dead && !enemy.blocker && !enemy.breaking && distance(enemy.x, enemy.y, hero.x, hero.y) < 48 + enemy.size * 10) candidates.push(enemy);
      }
      candidates.sort(function (a, b) { return b.y - a.y; });
      for (var c = 0; c < candidates.length && current < capacity; c++) {
        candidates[c].blocker = hero.id; current++; hero.blockedTotal++;
        this.burst(candidates[c].x, candidates[c].y, HERO_META[hero.type].color, 5);
      }
    }
  };

  Game.prototype.heroAttack = function (hero, target) {
    var level = hero.upgrades.attack, damage = hero.damage * (1 + level * .25);
    hero.attackCount++; hero.flash = .12; hero.attackAnim = hero.attackDuration;
    if (hero.type === 'xuanya') {
      if ((target.elite || target.type === 'boss') && level >= 2) damage *= 1.35;
      if (hero.upgrades.passive >= 1 && hero.attackCount % 4 === 0) damage *= 2;
      this.damageEnemy(target, damage, hero);
      if (level >= 3 && !target.dead) this.damageEnemy(target, damage * .55, hero);
      if (hero.upgrades.passive >= 3 && target.type !== 'boss' && target.hp < target.maxHp * .15) this.damageEnemy(target, target.hp + 1, hero);
      this.zones.push({ type: 'slash', x: hero.x, y: hero.y - 25, tx: target.x, ty: target.y, color: '#e8d8b7', life: .22 });
    } else if (hero.type === 'huangjin') {
      this.damageEnemy(target, damage, hero);
      if (level >= 2 && hero.attackCount % 3 === 0) {
        this.damageArea(hero.x, hero.y, 82, damage * .65, hero, null);
        this.zones.push({ type: 'ring', x: hero.x, y: hero.y, r: 18, color: C.gold, life: .5 });
        if (level >= 3) this.pushEnemies(hero.x, hero.y, 92, 28, .65);
      }
    } else {
      this.projectiles.push({
        x: hero.x, y: hero.y - 34, target: target.id, hero: hero.id, type: hero.type,
        speed: hero.projectileSpeed, damage: damage, color: HERO_META[hero.type].color,
        r: hero.type === 'hongyi' ? 8 : 6, life: 2.4
      });
    }
    this.audio.tone('shoot');
  };

  Game.prototype.updateProjectiles = function (dt) {
    for (var i = this.projectiles.length - 1; i >= 0; i--) {
      var p = this.projectiles[i], target = this.getEnemy(p.target);
      p.life -= dt;
      if (!target || target.dead || p.life <= 0) { this.projectiles.splice(i, 1); continue; }
      var d = distance(p.x, p.y, target.x, target.y);
      if (d <= p.speed * dt + 12) {
        this.projectileHit(p, target);
        this.projectiles.splice(i, 1);
      } else {
        p.x += (target.x - p.x) / d * p.speed * dt;
        p.y += (target.y - p.y) / d * p.speed * dt;
      }
    }
  };

  Game.prototype.projectileHit = function (p, target) {
    var hero = this.getHero(p.hero);
    if (!hero) return;
    this.damageEnemy(target, p.damage, hero);
    if (p.type === 'hongyi') {
      if (hero.upgrades.attack >= 2) {
        target.burn = Math.max(target.burn, 3 + hero.upgrades.passive * 2);
        target.burnDps = Math.max(target.burnDps, 18 + hero.upgrades.passive * 9);
        target.burnSource = hero.id;
      }
      if (hero.upgrades.attack >= 3) this.damageArea(target.x, target.y, 62, p.damage * .55, hero, 'burn');
    } else if (p.type === 'qingyi') {
      target.slow = Math.max(target.slow, hero.upgrades.attack >= 2 ? 4.5 : 2.3);
      if (hero.upgrades.attack >= 3) {
        this.damageArea(target.x, target.y, 58, p.damage * .42, hero, 'slow');
        this.zones.push({ type: 'ring', x: target.x, y: target.y, r: 16, color: C.blue, life: .45 });
      }
      if (hero.upgrades.passive >= 2 && hero.attackCount % 5 === 0) this.pushEnemies(target.x, target.y, 70, 34, 0);
    } else if (p.type === 'suwen') {
      if (hero.upgrades.attack >= 2) {
        var ally = this.lowestHealthHero();
        if (ally) this.healHero(ally, p.damage * .72, hero);
      }
      if (hero.upgrades.attack >= 3) {
        var second = this.secondLowestHealthHero();
        if (second) this.healHero(second, p.damage * .55, hero);
        this.damageArea(target.x, target.y, 48, p.damage * .5, hero, null);
      }
    }
    this.burst(target.x, target.y, p.color, 7);
  };

  Game.prototype.castHeroUltimate = function (hero) {
    if (!hero.alive) return;
    var level = hero.upgrades.ultimate, factor = 1 + level * .35;
    if (hero.type === 'hongyi') {
      var center = this.densestEnemy();
      if (!center) { hero.ultimateCd = 1; return; }
      var repeats = level >= 3 ? 3 : 1;
      for (var r = 0; r < repeats; r++) this.zones.push({ type: 'delayedFire', x: center.x, y: center.y, r: level >= 2 ? 105 : 82, life: .35 + r * .28, damage: 105 * factor, hero: hero.id, fired: false });
    } else if (hero.type === 'qingyi') {
      for (var i = 0; i < this.enemies.length; i++) {
        var e = this.enemies[i];
        this.damageEnemy(e, 58 * factor, hero); e.slow = Math.max(e.slow, 4.5);
        if (level >= 2 && e.type !== 'boss') e.freeze = Math.max(e.freeze, 1.1);
      }
      this.zones.push({ type: 'wave', x: 60, y: 560, tx: 690, ty: 560, color: C.blue, life: .7 });
      if (level >= 3) this.zones.push({ type: 'wave', x: 690, y: 620, tx: 60, ty: 620, color: C.blue, life: .95 });
    } else if (hero.type === 'huangjin') {
      hero.shield += 180 * factor;
      if (level >= 2) {
        var anchor = this.heroAnchor(hero);
        for (var j = 0; j < this.enemies.length; j++) {
          var enemy = this.enemies[j];
          if (!enemy.blocker && dist2(enemy.x, enemy.y, anchor.x, anchor.y) < hero.search * hero.search) enemy.blocker = hero.id;
        }
      }
      this.damageArea(hero.x, hero.y, level >= 3 ? 125 : 92, 70 * factor, hero, null);
      this.zones.push({ type: 'guard', x: hero.x, y: hero.y, r: level >= 3 ? 125 : 92, color: C.gold, life: level >= 3 ? 3 : 1.2, hero: hero.id });
    } else if (hero.type === 'xuanya') {
      var target = this.highestThreatEnemy();
      if (!target) { hero.ultimateCd = 1; return; }
      var hits = 2 + level;
      for (var h = 0; h < hits; h++) this.damageEnemy(target, 75 * factor, hero);
      if (level >= 2) target.armorBreak = 5;
      if (level >= 3) hero.invuln = 1.4;
      hero.x = clamp(target.x + (Math.random() * 50 - 25), 60, 690);
      hero.y = clamp(target.y + 42, 180, 885);
      this.zones.push({ type: 'slash', x: hero.x - 70, y: hero.y, tx: target.x + 70, ty: target.y - 50, color: '#f6e7c0', life: .5 });
    } else {
      var amount = 95 * factor;
      var targetHero = this.lowestHealthHero();
      if (level >= 2) {
        for (var k = 0; k < this.heroes.length; k++) if (this.heroes[k].alive) this.healHero(this.heroes[k], amount * .72, hero);
      } else if (targetHero) this.healHero(targetHero, amount, hero);
      if (level >= 3) {
        var returning = this.soonestReturningHero();
        if (returning) returning.respawn = Math.max(.4, returning.respawn - 3);
      }
      this.zones.push({ type: 'heal', x: 375, y: 720, r: 150, color: C.jade, life: 1.2 });
    }
    hero.ultimateCd = hero.ultimateMax * (1 - Math.min(.24, level * .08));
    hero.flash = .18; hero.attackAnim = .55; this.audio.tone('bell'); this.shake = 4;
  };

  Game.prototype.updateEnemies = function (dt) {
    for (var i = this.enemies.length - 1; i >= 0; i--) {
      var enemy = this.enemies[i];
      if (enemy.dead) { this.enemies.splice(i, 1); continue; }
      enemy.age += dt; enemy.hit = Math.max(0, enemy.hit - dt);
      enemy.attackAnim = Math.max(0, enemy.attackAnim - dt);
      enemy.summonAnim = Math.max(0, enemy.summonAnim - dt);
      enemy.slow = Math.max(0, enemy.slow - dt);
      enemy.freeze = Math.max(0, enemy.freeze - dt);
      if (enemy.armorBreak) enemy.armorBreak = Math.max(0, enemy.armorBreak - dt);
      if (enemy.burn > 0) {
        enemy.burn -= dt; enemy.burnTick -= dt;
        if (enemy.burnTick <= 0) {
          enemy.burnTick = .5;
          var source = this.getHero(enemy.burnSource);
          this.damageEnemy(enemy, enemy.burnDps * .5, source);
          if (enemy.dead) continue;
        }
      }
      if (enemy.type === 'boss') {
        enemy.summonCd -= dt;
        if (enemy.summonCd <= 0 && this.enemies.length < 22) {
          enemy.summonCd = 7; enemy.summonAnim = .65;
          this.spawnEnemy({ type: 'wisp', elite: true }); this.spawnEnemy({ type: 'jiangshi', elite: false });
        }
      }
      var blocker = enemy.blocker ? this.getHero(enemy.blocker) : null;
      enemy.attackCd -= dt;
      if (blocker && blocker.alive) {
        enemy.breaking = false;
        if (enemy.attackCd <= 0) {
          this.damageHero(blocker, enemy.damage, enemy);
          enemy.attackCd = enemy.attackRate; enemy.attackAnim = enemy.attackDuration;
        }
      } else if (enemy.y >= 914) {
        enemy.breaking = true; enemy.blocker = null;
        if (enemy.attackCd <= 0) {
          this.baseHp -= enemy.damage; enemy.attackCd = enemy.attackRate; enemy.attackAnim = enemy.attackDuration;
          this.floatText(enemy.x, 900, '-' + Math.round(enemy.damage) + ' 阵', C.danger, 22);
          this.burst(enemy.x, 914, C.danger, 8); this.audio.tone('hurt'); this.shake = Math.min(10, this.shake + 3);
          if (this.baseHp <= 0) { this.baseHp = 0; this.endBattle(false); return; }
        }
      } else if (enemy.freeze <= 0) {
        var slowFactor = enemy.slow > 0 ? .52 : 1;
        enemy.y += enemy.speed * slowFactor * dt;
      }
    }
  };

  Game.prototype.damageHero = function (hero, amount, enemy) {
    if (!hero.alive || hero.invuln > 0) return;
    var reduction = hero.defense;
    if (hero.type === 'huangjin' && hero.upgrades.passive >= 1) reduction += .12;
    var damage = amount * (1 - clamp(reduction, 0, .65));
    if (hero.shield > 0) {
      var absorbed = Math.min(hero.shield, damage);
      hero.shield -= absorbed; damage -= absorbed;
    }
    hero.hp -= damage; hero.flash = .16;
    if (Math.random() < .35) this.floatText(hero.x, hero.y - 80, '-' + Math.round(damage), '#ff9b8b', 19);
    if (hero.type === 'huangjin' && hero.upgrades.passive >= 3 && enemy && !enemy.dead) this.damageEnemy(enemy, damage * .35, hero);
    if (hero.hp <= 0) this.soulReturn(hero);
  };

  Game.prototype.soulReturn = function (hero) {
    hero.hp = 0; hero.alive = false; hero.respawn = hero.respawnMax; hero.deaths++;
    hero.target = null; hero.blocked = [];
    for (var i = 0; i < this.enemies.length; i++) if (this.enemies[i].blocker === hero.id) this.enemies[i].blocker = null;
    this.message = hero.name + '魂归 · 可拖动虚影安排返场位置';
    this.messageTime = 2.6; this.burst(hero.x, hero.y, HERO_META[hero.type].color, 24); this.audio.tone('hurt');
  };

  Game.prototype.respawnHero = function (hero) {
    hero.anchorIndex = hero.soulSlot;
    var anchor = this.heroAnchor(hero);
    hero.x = anchor.x; hero.y = anchor.y; hero.hp = hero.maxHp; hero.shield = 45;
    hero.alive = true; hero.invuln = 1.25; hero.respawn = 0; hero.target = null;
    this.pushEnemies(hero.x, hero.y, 95, 36, .45);
    this.burst(hero.x, hero.y, HERO_META[hero.type].color, 30);
    this.zones.push({ type: 'respawn', x: hero.x, y: hero.y, r: 18, color: HERO_META[hero.type].color, life: .8 });
    if (hero.type === 'suwen' && hero.upgrades.passive >= 3) {
      for (var i = 0; i < this.heroes.length; i++) if (this.heroes[i].alive) this.healHero(this.heroes[i], 55, hero);
    }
    this.message = hero.name + '归阵 · ' + ANCHORS[hero.anchorIndex].name;
    this.messageTime = 1.8; this.audio.tone('bell');
  };

  Game.prototype.damageEnemy = function (enemy, amount, source) {
    if (!enemy || enemy.dead) return;
    var final = amount * (enemy.armorBreak ? 1.25 : 1);
    if (enemy.slow > 0 && source && source.type === 'qingyi' && source.upgrades.passive >= 3) final *= 1.15;
    enemy.hp -= final; enemy.hit = .11;
    this.totalDamage += final;
    if (source) { source.damageDone += final; }
    if (Math.random() < .25 || final > 110) this.floatText(enemy.x, enemy.y - 45, '-' + Math.round(final), final > 110 ? '#ffe17b' : '#f7e4bc', final > 110 ? 26 : 19);
    if (enemy.hp <= 0) this.killEnemy(enemy, source);
  };

  Game.prototype.killEnemy = function (enemy, source) {
    if (enemy.dead) return;
    enemy.dead = true; this.kills++; this.coins += Math.round(enemy.coin); this.score += Math.round(enemy.xp * 12);
    this.gainXp(enemy.xp);
    if (source && source.type === 'hongyi' && source.upgrades.passive >= 2 && enemy.burn > 0) {
      for (var i = 0; i < this.enemies.length; i++) {
        var nearby = this.enemies[i];
        if (!nearby.dead && nearby !== enemy && dist2(nearby.x, nearby.y, enemy.x, enemy.y) < 85 * 85) {
          nearby.burn = Math.max(nearby.burn, 3); nearby.burnDps = Math.max(nearby.burnDps, enemy.burnDps * .75); nearby.burnSource = source.id;
        }
      }
    }
    this.burst(enemy.x, enemy.y, enemy.elite ? '#ce83dc' : C.gold, enemy.type === 'boss' ? 42 : 14);
    if (enemy.type === 'boss') { this.shake = 14; this.audio.tone('win'); }
  };

  Game.prototype.healHero = function (hero, amount, source) {
    if (!hero || !hero.alive || hero.hp >= hero.maxHp) return;
    var actual = Math.min(amount, hero.maxHp - hero.hp);
    hero.hp += actual; this.totalHealing += actual;
    if (source) source.healingDone += actual;
    if (source && source.type === 'suwen' && source.upgrades.passive >= 2) hero.shield += actual * .35;
    this.floatText(hero.x, hero.y - 90, '+' + Math.round(actual), '#86f3be', 20);
    this.burst(hero.x, hero.y - 25, C.jade, 6);
  };

  Game.prototype.lowestHealthHero = function () {
    var best = null, ratio = 2;
    for (var i = 0; i < this.heroes.length; i++) {
      var h = this.heroes[i]; if (!h.alive) continue;
      var r = h.hp / h.maxHp;
      if (r < ratio) { ratio = r; best = h; }
    }
    return best;
  };

  Game.prototype.secondLowestHealthHero = function () {
    var alive = this.heroes.filter(function (h) { return h.alive; });
    alive.sort(function (a, b) { return a.hp / a.maxHp - b.hp / b.maxHp; });
    return alive[1] || alive[0] || null;
  };

  Game.prototype.soonestReturningHero = function () {
    var best = null;
    for (var i = 0; i < this.heroes.length; i++) {
      var h = this.heroes[i];
      if (!h.alive && (!best || h.respawn < best.respawn)) best = h;
    }
    return best;
  };

  Game.prototype.densestEnemy = function () {
    var best = null, bestCount = 0;
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i], count = 0;
      for (var j = 0; j < this.enemies.length; j++) if (dist2(e.x, e.y, this.enemies[j].x, this.enemies[j].y) < 120 * 120) count++;
      if (count > bestCount) { bestCount = count; best = e; }
    }
    return best;
  };

  Game.prototype.highestThreatEnemy = function () {
    var best = null, score = -1;
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i], value = e.y + e.hp / e.maxHp * 80 + (e.elite ? 160 : 0) + (e.type === 'boss' ? 300 : 0);
      if (value > score) { score = value; best = e; }
    }
    return best;
  };

  Game.prototype.damageArea = function (x, y, radius, damage, source, effect) {
    for (var i = this.enemies.length - 1; i >= 0; i--) {
      var e = this.enemies[i];
      if (!e.dead && dist2(x, y, e.x, e.y) <= radius * radius) {
        this.damageEnemy(e, damage, source);
        if (effect === 'burn') { e.burn = Math.max(e.burn, 3); e.burnDps = Math.max(e.burnDps, 22); e.burnSource = source ? source.id : null; }
        if (effect === 'slow') e.slow = Math.max(e.slow, 3.2);
      }
    }
  };

  Game.prototype.pushEnemies = function (x, y, radius, amount, freeze) {
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i], d = distance(x, y, e.x, e.y);
      if (d < radius && e.type !== 'boss') {
        e.y = Math.max(135, e.y - amount); e.blocker = null;
        if (freeze) e.freeze = Math.max(e.freeze, freeze);
      }
    }
  };

  Game.prototype.castAutoSpells = function (dt) {
    this.spellCd.fire -= dt; this.spellCd.bell -= dt; this.spellCd.water -= dt;
    if (this.spellCd.fire <= 0 && this.enemies.length >= 3) {
      var center = this.densestEnemy();
      if (center) {
        var before = this.totalDamage;
        this.damageArea(center.x, center.y, 105, 145, null, 'burn');
        this.spellDamage.fire += this.totalDamage - before;
        this.zones.push({ type: 'fire', x: center.x, y: center.y, r: 105, color: C.fire, life: .85 });
        this.spellCd.fire = this.spellMax.fire; this.audio.tone('bell');
      }
    }
    if (this.spellCd.bell <= 0 && (this.enemies.length >= 6 || this.baseHp < this.baseMax * .45)) {
      var beforeBell = this.totalDamage;
      for (var i = 0; i < this.enemies.length; i++) { this.enemies[i].slow = Math.max(this.enemies[i].slow, 3.5); this.damageEnemy(this.enemies[i], 24, null); }
      this.spellDamage.bell += this.totalDamage - beforeBell;
      this.zones.push({ type: 'ring', x: 375, y: 690, r: 20, color: C.gold, life: .8 });
      this.spellCd.bell = this.spellMax.bell; this.audio.tone('bell');
    }
    if (this.spellCd.water <= 0 && this.enemies.length) {
      var threat = this.highestThreatEnemy(), beforeWater = this.totalDamage;
      if (threat) {
        for (var j = 0; j < this.enemies.length; j++) {
          var e = this.enemies[j];
          if (Math.abs(e.x - threat.x) < 62) { this.damageEnemy(e, 92, null); e.slow = Math.max(e.slow, 2.5); }
        }
        this.zones.push({ type: 'wave', x: threat.x, y: 160, tx: threat.x, ty: 910, color: C.blue, life: .5 });
      }
      this.spellDamage.water += this.totalDamage - beforeWater;
      this.spellCd.water = this.spellMax.water; this.audio.tone('shoot');
    }
  };

  Game.prototype.gainXp = function (amount) {
    this.xp += amount;
    while (this.xp >= this.xpNeed) {
      this.xp -= this.xpNeed; this.level++; this.pendingLevels++;
      this.xpNeed = 95 + (this.level - 1) * 22;
    }
    if (this.pendingLevels > 0 && this.phase === 'wave') this.offerCards();
  };

  Game.prototype.totalUpgrade = function (hero) {
    return hero.upgrades.attack + hero.upgrades.passive + hero.upgrades.ultimate;
  };

  Game.prototype.cardCandidates = function (hero) {
    var list = [];
    if (hero.upgrades.attack < 3) list.push('attack');
    if (hero.upgrades.passive < 3) list.push('passive');
    if (hero.upgrades.ultimate < 3) list.push('ultimate');
    return list;
  };

  Game.prototype.makeCard = function (hero, line) {
    var level = hero.upgrades[line], meta = HERO_META[hero.type];
    var lineNames = { attack: '普攻', passive: '被动', ultimate: '必杀' };
    return {
      hero: hero.id, line: line, heroName: hero.name, role: hero.role,
      title: lineNames[line] + ' · ' + (level + 1) + '阶',
      desc: meta[line][level], color: meta.color, icon: meta.icon
    };
  };

  Game.prototype.offerCards = function () {
    this.phase = 'cards'; this.pendingLevels = Math.max(0, this.pendingLevels - 1);
    var heroes = this.heroes.slice().filter(function (h) {
      return h.upgrades.attack < 3 || h.upgrades.passive < 3 || h.upgrades.ultimate < 3;
    });
    heroes.sort(function (a, b) {
      var ta = a.upgrades.attack + a.upgrades.passive + a.upgrades.ultimate;
      var tb = b.upgrades.attack + b.upgrades.passive + b.upgrades.ultimate;
      return ta - tb;
    });
    var cards = [], used = {};
    if (heroes.length) {
      var least = heroes[0], firstLine = choice(this.cardCandidates(least));
      cards.push(this.makeCard(least, firstLine)); used[least.id + ':' + firstLine] = true;
    }
    var pool = shuffle(heroes.slice());
    while (cards.length < 3 && pool.length) {
      var hero = pool.shift(), lines = shuffle(this.cardCandidates(hero));
      for (var i = 0; i < lines.length; i++) {
        var key = hero.id + ':' + lines[i];
        if (!used[key]) { cards.push(this.makeCard(hero, lines[i])); used[key] = true; break; }
      }
    }
    while (cards.length < 3) {
      var anyHero = choice(heroes), options = this.cardCandidates(anyHero), line = choice(options);
      var anyKey = anyHero.id + ':' + line;
      if (!used[anyKey]) { cards.push(this.makeCard(anyHero, line)); used[anyKey] = true; }
    }
    this.pendingCards = cards;
    this.audio.tone('bell');
  };

  Game.prototype.pickCard = function (index) {
    var card = this.pendingCards[index], hero = card && this.getHero(card.hero);
    if (!hero) return;
    hero.upgrades[card.line]++; this.upgradeCount++;
    this.message = hero.name + ' · ' + card.title + '：' + card.desc; this.messageTime = 3;
    this.burst(SOUL_SLOTS[hero.soulSlot].x, SOUL_SLOTS[hero.soulSlot].y - 25, card.color, 20);
    if (this.pendingLevels > 0) this.offerCards(); else this.phase = 'wave';
  };

  Game.prototype.updateZones = function (dt) {
    for (var i = this.zones.length - 1; i >= 0; i--) {
      var zone = this.zones[i]; zone.life -= dt;
      if (zone.type === 'delayedFire' && !zone.fired && zone.life <= .05) {
        zone.fired = true;
        this.damageArea(zone.x, zone.y, zone.r, zone.damage, this.getHero(zone.hero), 'burn');
        this.burst(zone.x, zone.y, C.fire, 24); this.shake = 5;
      }
      if (zone.type === 'guard' && zone.life > 0) {
        var guardian = this.getHero(zone.hero);
        if (guardian && guardian.alive && guardian.upgrades.ultimate >= 3) this.damageArea(guardian.x, guardian.y, zone.r, 16 * dt, guardian, null);
      }
      if (zone.life <= 0) this.zones.splice(i, 1);
    }
  };

  Game.prototype.burst = function (x, y, color, count) {
    for (var i = 0; i < count && this.particles.length < 180; i++) {
      var life = .35 + Math.random() * .55, angle = Math.random() * Math.PI * 2, speed = 35 + Math.random() * 130;
      this.particles.push({ x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 30, life: life, max: life, size: 2 + Math.random() * 5, color: color });
    }
  };

  Game.prototype.floatText = function (x, y, value, color, size) {
    if (this.floaters.length >= 40) this.floaters.shift();
    this.floaters.push({ x: x, y: y, value: value, color: color, size: size || 20, life: 1, max: 1 });
  };

  Game.prototype.updateEffects = function (dt) {
    for (var i = this.particles.length - 1; i >= 0; i--) {
      var p = this.particles[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (var j = this.floaters.length - 1; j >= 0; j--) {
      var f = this.floaters[j]; f.life -= dt; f.y -= 34 * dt;
      if (f.life <= 0) this.floaters.splice(j, 1);
    }
  };

  Game.prototype.updateBattle = function (dt) {
    this.messageTime = Math.max(0, this.messageTime - dt);
    this.waveBanner = Math.max(0, this.waveBanner - dt);
    this.shake = Math.max(0, this.shake - dt * 18);
    this.updateEffects(dt);
    if (this.paused || this.infoOverlay || this.phase === 'cards') return;
    this.gameTime += dt;
    if (this.waveQueue.length && this.spawnTimer <= 0) {
      this.spawnEnemy(this.waveQueue.shift());
      this.spawnTimer = Math.max(.34, .65 - this.wave * .012);
    } else this.spawnTimer -= dt;
    this.updateHeroes(dt);
    this.syncBlocks();
    this.updateEnemies(dt);
    if (this.state !== 'battle') return;
    this.updateProjectiles(dt);
    this.updateZones(dt);
    this.castAutoSpells(dt);
    if (!this.waveQueue.length && !this.enemies.length && this.phase === 'wave') {
      if (this.wave >= this.waveMax) this.endBattle(true);
      else if (this.intermission <= 0) this.intermission = 1.25;
    }
    if (this.intermission > 0) {
      this.intermission -= dt;
      if (this.intermission <= 0 && this.state === 'battle') this.startWave(this.wave + 1);
    }
  };

  Game.prototype.endBattle = function (win) {
    if (this.state !== 'battle') return;
    this.state = 'result'; this.win = win;
    this.finalScore = Math.round(this.score + this.baseHp * 2 + this.upgradeCount * 80 + (win ? 2500 : 0));
    this.rewardXp = Math.max(20, Math.round(this.wave * 12 + this.kills * 1.5));
    this.audio.tone(win ? 'win' : 'hurt');
  };

  Game.prototype.loop = function (timestamp) {
    var now = timestamp || Date.now(), dt = this.last ? (now - this.last) / 1000 : .016;
    this.last = now; dt = Math.min(.034, Math.max(.001, dt)); this.time += dt;
    if (this.state === 'battle') {
      var steps = this.paused ? 1 : (this.speed || 1);
      for (var i = 0; i < steps; i++) this.updateBattle(dt);
    }
    this.render();
    this.raf(this.boundLoop);
  };

  Game.prototype.render = function () {
    var ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (this.state === 'loading') this.drawLoading(ctx);
    else if (this.state === 'title') this.drawTitle(ctx);
    else if (this.state === 'battle') this.drawBattle(ctx);
    else this.drawResult(ctx);
  };

  Game.prototype.drawLoading = function (ctx) {
    ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, 560); ctx.rotate(this.time * 1.6);
    ctx.strokeStyle = C.gold; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, 48, 0, Math.PI * 1.5); ctx.stroke(); ctx.restore();
    A.text(ctx, '正在铺开五灵阵…', W / 2, 690, 30, C.paper);
    A.bar(ctx, 175, 750, 400, 18, this.loaded, Math.max(1, this.loadTotal), C.jade);
  };

  Game.prototype.drawTitle = function (ctx) {
    if (!cover(ctx, this.assets.title, 0, 0, W, H)) { ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H); }
    var fade = ctx.createLinearGradient(0, 0, 0, 540);
    fade.addColorStop(0, 'rgba(4,12,22,.92)'); fade.addColorStop(1, 'rgba(4,12,22,0)');
    ctx.fillStyle = fade; ctx.fillRect(0, 0, W, 560);
    A.text(ctx, '御 灵 召 来', W / 2, 165, 72, '#f7d58c', 'center', '900');
    A.text(ctx, '五灵守阵 · 魂归换位', W / 2, 235, 28, '#8de3cc');
    A.panel(ctx, 78, 895, 594, 122, .80);
    A.text(ctx, '五名御灵下场阻敌', W / 2, 927, 25, C.paper);
    A.text(ctx, '拖动阵中虚影 · 安排下一次返场位置', W / 2, 968, 22, '#a9cfc2');
    A.button(ctx, 145, 1035, 460, 118, '开 阵 镇 魂', true, '#bd5a2e');
    A.text(ctx, '20 波完整试炼 · 道士术法自动释放', W / 2, 1195, 20, '#b8c9c2');
    A.text(ctx, '核心验证版  ·  v0.2', W / 2, 1265, 18, 'rgba(255,243,210,.68)');
  };

  Game.prototype.drawBattle = function (ctx) {
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - .5) * this.shake, (Math.random() - .5) * this.shake);
    if (!cover(ctx, this.assets.battlefield, 0, 0, W, 960)) {
      var bg = ctx.createLinearGradient(0, 0, 0, 960); bg.addColorStop(0, '#142a36'); bg.addColorStop(1, '#19251e');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, 960);
    }
    ctx.fillStyle = 'rgba(5,13,18,.2)'; ctx.fillRect(0, 0, W, 960);
    this.drawTopHud(ctx);
    this.drawGuardAreas(ctx);
    this.drawZones(ctx);
    var drawables = [], i;
    for (i = 0; i < this.enemies.length; i++) drawables.push({ y: this.enemies[i].y, kind: 'enemy', value: this.enemies[i] });
    for (i = 0; i < this.heroes.length; i++) if (this.heroes[i].alive) drawables.push({ y: this.heroes[i].y, kind: 'hero', value: this.heroes[i] });
    drawables.sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < drawables.length; i++) {
      if (drawables[i].kind === 'enemy') { A.enemy(ctx, drawables[i].value, this.time, this.assets); this.drawEnemyBar(ctx, drawables[i].value); }
      else { A.hero(ctx, drawables[i].value, this.time, this.assets); this.drawHeroBar(ctx, drawables[i].value); }
    }
    this.drawProjectiles(ctx); this.drawEffects(ctx);
    if (this.waveBanner > 0) this.drawWaveBanner(ctx);
    if (this.messageTime > 0) {
      A.rr(ctx, 72, 875, 606, 48, 18, 'rgba(7,15,20,.82)', 'rgba(219,168,76,.55)', 2);
      A.text(ctx, this.message, W / 2, 899, 20, C.paper);
    }
    ctx.restore();
    this.drawSideRail(ctx);
    this.drawBottomFormation(ctx);
    if (this.phase === 'cards') this.drawCards(ctx);
    if (this.paused) this.drawPause(ctx);
    if (this.infoOverlay) this.drawInfo(ctx);
  };

  Game.prototype.drawTopHud = function (ctx) {
    A.panel(ctx, 14, 12, 650, 112, .90);
    A.text(ctx, '幽井村 · 五灵阵', 115, 38, 22, C.paper);
    A.text(ctx, '第 ' + this.wave + ' / ' + this.waveMax + ' 波', 505, 38, 27, C.white);
    A.bar(ctx, 38, 62, 260, 24, this.baseHp, this.baseMax, C.red, '#25151a', '阵法 ' + Math.ceil(this.baseHp) + ' / ' + this.baseMax);
    A.bar(ctx, 330, 62, 285, 18, this.xp, this.xpNeed, C.jade, '#102027', '御灵共鸣 Lv.' + this.level);
    var total = Math.max(1, this.waveTotal || 1), remaining = this.waveQueue.length + this.enemies.length;
    A.bar(ctx, 330, 92, 285, 12, total - remaining, total, C.gold, '#171b1e');
  };

  Game.prototype.drawGuardAreas = function (ctx) {
    ctx.save();
    ctx.setLineDash([8, 9]); ctx.lineWidth = 2;
    for (var i = 0; i < ANCHORS.length; i++) {
      var anchor = ANCHORS[i], hero = this.heroForAnchor(i);
      ctx.strokeStyle = hero ? HERO_META[hero.type].color + '80' : 'rgba(180,180,170,.22)';
      ctx.beginPath(); ctx.arc(anchor.x, anchor.y, hero ? Math.min(112, hero.search * .52) : 88, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(8,18,24,.55)'; ctx.beginPath(); ctx.arc(anchor.x, anchor.y, 15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ctx.strokeStyle; ctx.stroke();
      ctx.setLineDash([8, 9]);
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(226,91,65,.55)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(35, 922); ctx.lineTo(715, 922); ctx.stroke();
    A.text(ctx, '阵 界', 375, 940, 17, '#e9927b');
    ctx.restore();
  };

  Game.prototype.heroForAnchor = function (anchorIndex) {
    for (var i = 0; i < this.heroes.length; i++) if (this.heroes[i].alive && this.heroes[i].anchorIndex === anchorIndex) return this.heroes[i];
    return null;
  };

  Game.prototype.drawHeroBar = function (ctx, hero) {
    A.bar(ctx, hero.x - 46, hero.y - 112, 92, 9, hero.hp, hero.maxHp, C.jade, '#15171a');
    if (hero.shield > 0) {
      ctx.strokeStyle = '#9feaff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hero.x, hero.y - 30, 50, 0, Math.PI * 2); ctx.stroke();
    }
    var blocked = 0;
    for (var i = 0; i < this.enemies.length; i++) if (this.enemies[i].blocker === hero.id) blocked++;
    A.text(ctx, blocked + '/' + (hero.block + (hero.type === 'huangjin' && hero.upgrades.passive >= 2 ? 1 : 0)), hero.x + 43, hero.y - 95, 14, '#f5d477');
  };

  Game.prototype.drawEnemyBar = function (ctx, enemy) {
    var width = enemy.type === 'boss' ? 145 : 66, y = enemy.y - (enemy.type === 'boss' ? 145 : 78) * enemy.size;
    A.bar(ctx, enemy.x - width / 2, y, width, enemy.type === 'boss' ? 12 : 7, enemy.hp, enemy.maxHp, enemy.elite ? '#c96dd9' : C.red, '#171118');
    if (enemy.breaking) A.text(ctx, '破阵', enemy.x, y - 14, 15, C.danger);
  };

  Game.prototype.drawProjectiles = function (ctx) {
    for (var i = 0; i < this.projectiles.length; i++) {
      var p = this.projectiles[i];
      ctx.save(); ctx.shadowColor = p.color; ctx.shadowBlur = 14; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  };

  Game.prototype.drawZones = function (ctx) {
    for (var i = 0; i < this.zones.length; i++) {
      var z = this.zones[i], alpha = clamp(z.life * 2, 0, 1);
      ctx.save(); ctx.globalAlpha = alpha;
      if (z.type === 'fire' || z.type === 'delayedFire') {
        var fire = ctx.createRadialGradient(z.x, z.y, 4, z.x, z.y, z.r);
        fire.addColorStop(0, 'rgba(255,221,112,.82)'); fire.addColorStop(.5, 'rgba(245,91,35,.5)'); fire.addColorStop(1, 'rgba(120,24,14,0)');
        ctx.fillStyle = fire; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill();
      } else if (z.type === 'ring' || z.type === 'respawn' || z.type === 'guard' || z.type === 'heal') {
        ctx.strokeStyle = z.color || C.gold; ctx.lineWidth = z.type === 'heal' ? 12 : 7; ctx.shadowColor = z.color || C.gold; ctx.shadowBlur = 14;
        var radius = z.r + (1 - alpha) * 55;
        ctx.beginPath(); ctx.arc(z.x, z.y, radius, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.strokeStyle = z.color || C.blue; ctx.lineWidth = z.type === 'wave' ? 18 : 9; ctx.shadowColor = z.color || C.blue; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.lineTo(z.tx, z.ty); ctx.stroke();
      }
      ctx.restore();
    }
  };

  Game.prototype.drawEffects = function (ctx) {
    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (var j = 0; j < this.floaters.length; j++) {
      var f = this.floaters[j]; ctx.globalAlpha = clamp(f.life / f.max, 0, 1);
      A.text(ctx, f.value, f.x, f.y, f.size, f.color);
    }
    ctx.globalAlpha = 1;
  };

  Game.prototype.drawWaveBanner = function (ctx) {
    var alpha = clamp(this.waveBanner * 1.3, 0, 1), boss = this.wave === 10 || this.wave === 20;
    ctx.save(); ctx.globalAlpha = alpha;
    A.panel(ctx, 155, 210, 440, 96, .84);
    A.text(ctx, boss ? (this.wave === 20 ? '终 局 · 纸 扎 迎 亲' : '中 段 · 凶 煞 现 形') : '诡 潮 · 第 ' + this.wave + ' 波', W / 2, 247, 32, boss ? '#ff9d65' : C.paper);
    A.text(ctx, boss ? '首领来袭' : '观察来路 · 提前安排魂位', W / 2, 279, 19, C.jade);
    ctx.restore();
  };

  Game.prototype.drawSideRail = function (ctx) {
    A.panel(ctx, 676, 135, 66, 350, .86);
    var ys = [174, 260, 346, 432], labels = ['Ⅱ', '数', '×' + this.speed, '敌'];
    for (var i = 0; i < ys.length; i++) A.button(ctx, 685, ys[i] - 28, 48, 56, labels[i], true, '#5c4b32');
    A.panel(ctx, 676, 540, 66, 300, .84);
    var spellYs = [585, 682, 779], icons = [0, 1, 2], keys = ['fire', 'bell', 'water'];
    for (var s = 0; s < 3; s++) {
      A.icon(ctx, this.assets.icons, icons[s], 709, spellYs[s], 52, clamp(this.spellCd[keys[s]] / this.spellMax[keys[s]], 0, 1));
      A.text(ctx, '自动', 709, spellYs[s] + 38, 13, '#b9c9c3');
    }
  };

  Game.prototype.heroSprite = function (hero) { return this.assets[HERO_META[hero.type].sprite]; };

  Game.prototype.drawBottomFormation = function (ctx) {
    ctx.fillStyle = '#071119'; ctx.fillRect(0, 960, W, 374);
    A.panel(ctx, 8, 966, 734, 360, .98);
    A.text(ctx, '拖动虚影换魂位 · 只影响下一次返场', W / 2, 989, 18, '#a9cfc2');
    ctx.save(); ctx.strokeStyle = 'rgba(219,168,76,.42)'; ctx.lineWidth = 3;
    var order = [0, 1, 4, 3, 2, 0]; ctx.beginPath();
    for (var i = 0; i < order.length; i++) {
      var slot = SOUL_SLOTS[order[i]];
      if (i === 0) ctx.moveTo(slot.x, slot.y - 25); else ctx.lineTo(slot.x, slot.y - 25);
    }
    ctx.stroke(); ctx.restore();
    this.drawTaoistCore(ctx);
    for (var h = 0; h < this.heroes.length; h++) this.drawSoulGhost(ctx, this.heroes[h]);
    A.text(ctx, '五 魂 归 阵', W / 2, 1304, 19, C.gold);
    if (this.dragSoul) {
      var origin = SOUL_SLOTS[this.dragSoul.soulSlot];
      ctx.save(); ctx.strokeStyle = HERO_META[this.dragSoul.type].color; ctx.lineWidth = 4; ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.moveTo(origin.x, origin.y - 25); ctx.lineTo(this.pointer.x, this.pointer.y); ctx.stroke(); ctx.restore();
    }
  };

  Game.prototype.drawSoulGhost = function (ctx, hero) {
    var slot = SOUL_SLOTS[hero.soulSlot], color = HERO_META[hero.type].color, img = this.heroSprite(hero);
    ctx.save();
    ctx.beginPath(); ctx.arc(slot.x, slot.y - 25, 45, 0, Math.PI * 2);
    ctx.fillStyle = hero.alive ? 'rgba(21,39,43,.78)' : 'rgba(55,24,37,.88)'; ctx.fill();
    ctx.clip();
    A.spriteImage(ctx, img, slot.x, slot.y + 23, 86, 100, hero.alive ? .46 : .78);
    ctx.restore();
    ctx.beginPath(); ctx.arc(slot.x, slot.y - 25, 47, 0, Math.PI * 2);
    ctx.strokeStyle = this.dragSoul === hero ? '#fff0b0' : color; ctx.lineWidth = this.dragSoul === hero ? 6 : 3; ctx.stroke();
    A.text(ctx, hero.name, slot.x, slot.y + 34, 15, C.paper);
    if (hero.alive) A.text(ctx, ANCHORS[hero.anchorIndex].name + ' · 在场', slot.x, slot.y + 53, 12, '#83cbb9');
    else A.text(ctx, '魂归 ' + Math.max(0, hero.respawn).toFixed(1) + 's', slot.x, slot.y + 53, 12, '#ff9b8b');
  };

  Game.prototype.drawTaoistCore = function (ctx) {
    var img = this.assets.title;
    ctx.save(); ctx.beginPath(); ctx.arc(375, 1118, 57, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#101a21'; ctx.fillRect(315, 1058, 120, 120);
    if (img && (img.width || img.naturalWidth)) {
      var iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
      ctx.drawImage(img, iw * .11, ih * .46, iw * .5, ih * .48, 315, 1038, 120, 176);
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(375, 1118, 61, 0, Math.PI * 2); ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.stroke();
    A.text(ctx, '御灵师', 375, 1184, 16, C.paper);
    A.text(ctx, '术法自律', 375, 1204, 13, C.jade);
  };

  Game.prototype.drawHeroPortrait = function (ctx, hero, x, y, radius) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#101b22'; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    A.spriteImage(ctx, this.heroSprite(hero), x, y + radius, radius * 1.7, radius * 2.15, 1);
    ctx.restore();
    ctx.beginPath(); ctx.arc(x, y, radius + 2, 0, Math.PI * 2); ctx.strokeStyle = HERO_META[hero.type].color; ctx.lineWidth = 4; ctx.stroke();
  };

  Game.prototype.drawCards = function (ctx) {
    ctx.save(); ctx.fillStyle = 'rgba(3,8,14,.89)'; ctx.fillRect(0, 0, W, H);
    A.text(ctx, '共 鸣 升 阶', W / 2, 178, 48, C.gold);
    A.text(ctx, '选择一道灵契 · 强化本局御灵技能', W / 2, 232, 23, C.paper);
    for (var i = 0; i < 3; i++) {
      var card = this.pendingCards[i], hero = this.getHero(card.hero), x = 35 + i * 235;
      A.panel(ctx, x, 390, 215, 470, .99);
      A.rr(ctx, x + 15, 410, 185, 34, 13, card.color);
      A.text(ctx, card.heroName, x + 107, 427, 18, C.ink);
      this.drawHeroPortrait(ctx, hero, x + 107, 535, 62);
      A.text(ctx, card.title, x + 107, 637, 24, C.gold);
      A.text(ctx, card.role, x + 107, 674, 17, '#9ab4ac');
      this.wrapText(ctx, card.desc, x + 107, 731, 174, 22, C.paper);
      A.text(ctx, '点按选择', x + 107, 824, 17, C.jade);
    }
    A.text(ctx, '本局已强化 ' + this.upgradeCount + ' 次', W / 2, 930, 20, '#9eb7af');
    ctx.restore();
  };

  Game.prototype.wrapText = function (ctx, value, x, y, maxWidth, size, color) {
    var chars = value.split(''), line = '', lines = [];
    ctx.save(); ctx.font = '700 ' + size + 'px "Microsoft YaHei","PingFang SC",sans-serif';
    for (var i = 0; i < chars.length; i++) {
      var test = line + chars[i];
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = chars[i]; } else line = test;
    }
    if (line) lines.push(line); ctx.restore();
    for (var j = 0; j < lines.length; j++) A.text(ctx, lines[j], x, y + j * (size + 7), size, color);
  };

  Game.prototype.drawPause = function (ctx) {
    ctx.fillStyle = 'rgba(3,8,13,.86)'; ctx.fillRect(0, 0, W, H);
    A.panel(ctx, 135, 420, 480, 450, .99);
    A.text(ctx, '阵 法 暂 歇', W / 2, 510, 44, C.gold);
    A.text(ctx, '战斗已暂停', W / 2, 578, 24, C.paper);
    A.text(ctx, '场上御灵不能拖动', W / 2, 645, 21, '#a9c0b8');
    A.text(ctx, '调整阵中虚影将在下次魂归生效', W / 2, 685, 21, '#a9c0b8');
    A.button(ctx, 225, 740, 300, 92, '继续镇魂', true, '#6d6440');
  };

  Game.prototype.drawInfo = function (ctx) {
    ctx.fillStyle = 'rgba(3,8,13,.80)'; ctx.fillRect(0, 0, W, H);
    A.panel(ctx, 70, 190, 610, 790, .99);
    if (this.infoOverlay === 'data') {
      A.text(ctx, '战 斗 数 据', W / 2, 250, 38, C.gold);
      for (var i = 0; i < this.heroes.length; i++) {
        var hero = this.heroes[i], y = 340 + i * 105;
        this.drawHeroPortrait(ctx, hero, 135, y, 34);
        A.text(ctx, hero.name + ' · ' + hero.role, 190, y - 20, 21, C.paper, 'left');
        A.text(ctx, '伤害 ' + Math.round(hero.damageDone) + '  治疗 ' + Math.round(hero.healingDone), 190, y + 12, 17, '#9cb4ac', 'left');
        A.text(ctx, '阻挡 ' + hero.blockedTotal + '  魂归 ' + hero.deaths, 190, y + 38, 16, HERO_META[hero.type].color, 'left');
      }
      A.text(ctx, '道士术法伤害 ' + Math.round(this.spellDamage.fire + this.spellDamage.bell + this.spellDamage.water), W / 2, 900, 20, C.jade);
    } else {
      A.text(ctx, '敌 情 与 规 则', W / 2, 250, 38, C.gold);
      var entries = [
        ['游魂', '速度快 · 血量低 · 数量多'],
        ['符尸', '均衡敌人 · 接敌后持续攻击'],
        ['甲尸', '高血高伤 · 消耗阻挡位'],
        ['疾影', '高速突进 · 优先关注边路'],
        ['纸扎人', '第10与20波出现 · 会召来替身']
      ];
      for (var e = 0; e < entries.length; e++) {
        var ey = 345 + e * 92;
        A.text(ctx, entries[e][0], 155, ey, 22, C.paper, 'left');
        A.text(ctx, entries[e][1], 265, ey, 18, '#9db1aa', 'left');
      }
      A.text(ctx, '阻挡数 = 同时截停的敌人数', W / 2, 835, 20, C.gold);
      A.text(ctx, '未被阻挡的敌人抵达阵界后会持续破阵', W / 2, 880, 19, '#e99880');
    }
    A.text(ctx, '点击任意处关闭', W / 2, 945, 17, '#80938e');
  };

  Game.prototype.drawResult = function (ctx) {
    if (!cover(ctx, this.assets.title, 0, 0, W, H)) { ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = 'rgba(4,9,14,.80)'; ctx.fillRect(0, 0, W, H);
    A.panel(ctx, 70, 130, 610, 1040, .96);
    A.text(ctx, this.win ? '诡 事 已 镇' : '五 灵 阵 破', W / 2, 220, 52, this.win ? C.gold : '#e87868');
    A.text(ctx, this.win ? '五灵归位，幽井村灯火未灭。' : '魂位尚在，重整之后仍可再战。', W / 2, 282, 23, C.paper);
    var startX = 145;
    for (var i = 0; i < this.heroes.length; i++) this.drawHeroPortrait(ctx, this.heroes[i], startX + i * 115, 405, 42);
    var rows = [
      ['镇守波次', this.wave + ' / ' + this.waveMax],
      ['镇伏诡物', this.kills + ''],
      ['御灵强化', this.upgradeCount + ' 次'],
      ['魂归次数', this.heroes.reduce(function (sum, h) { return sum + h.deaths; }, 0) + ' 次'],
      ['铜钱', this.coins + ''],
      ['总评分', this.finalScore + '']
    ];
    for (var r = 0; r < rows.length; r++) {
      var y = 515 + r * 70;
      ctx.strokeStyle = 'rgba(219,168,76,.24)'; ctx.beginPath(); ctx.moveTo(145, y + 31); ctx.lineTo(605, y + 31); ctx.stroke();
      A.text(ctx, rows[r][0], 170, y, 22, '#9eb3aa', 'left');
      A.text(ctx, rows[r][1], 580, y, 25, r === rows.length - 1 ? C.gold : C.white, 'right');
    }
    A.text(ctx, '本轮获得 · 御灵谱经验 +' + this.rewardXp, W / 2, 965, 22, C.jade);
    A.button(ctx, 150, 1080, 450, 105, this.win ? '再 镇 一 局' : '重 整 魂 位', true, '#a8492b');
    A.text(ctx, '失败仍按到达波次结算', W / 2, 1245, 18, '#89a39b');
  };

  YL.Game = Game;
}(typeof globalThis !== 'undefined' ? globalThis : this));
