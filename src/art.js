(function (root) {
  'use strict';
  var YL = root.YL = root.YL || {};
  var C = YL.COLORS;

  function pathRoundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function rr(ctx, x, y, w, h, r, fill, stroke, line) {
    pathRoundRect(ctx, x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = line || 2; ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function text(ctx, value, x, y, size, color, align, weight) {
    ctx.save();
    ctx.font = (weight || '700') + ' ' + size + 'px "Microsoft YaHei","PingFang SC",sans-serif';
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color || C.white;
    ctx.shadowColor = 'rgba(0,0,0,.75)';
    ctx.shadowBlur = size > 32 ? 7 : 3;
    ctx.fillText(value, x, y);
    ctx.restore();
  }

  function panel(ctx, x, y, w, h, alpha) {
    ctx.save();
    rr(ctx, x, y, w, h, 18, 'rgba(10,18,25,' + (alpha == null ? 0.9 : alpha) + ')', C.gold2, 3);
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = C.paper;
    ctx.lineWidth = 1;
    pathRoundRect(ctx, x + 7, y + 7, w - 14, h - 14, 13);
    ctx.stroke();
    ctx.restore();
  }

  function button(ctx, x, y, w, h, label, active, accent) {
    ctx.save();
    var grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, active ? (accent || '#cc6d32') : '#42505a');
    grad.addColorStop(1, active ? '#73321f' : '#26323a');
    rr(ctx, x, y, w, h, 18, grad, active ? C.gold : '#687179', 4);
    rr(ctx, x + 7, y + 7, w - 14, h - 14, 13, null, 'rgba(255,239,187,.35)', 2);
    text(ctx, label, x + w / 2, y + h / 2 + 1, 28, active ? C.white : '#aeb6b4');
    ctx.restore();
  }

  function bar(ctx, x, y, w, h, value, max, fill, bg, label) {
    var p = Math.max(0, Math.min(1, max ? value / max : 0));
    rr(ctx, x, y, w, h, h / 2, bg || 'rgba(0,0,0,.58)', 'rgba(240,213,153,.4)', 2);
    if (p > 0) {
      var g = ctx.createLinearGradient(x, y, x + w, y);
      g.addColorStop(0, fill);
      g.addColorStop(1, fill === C.red ? C.fire : '#8ff6d6');
      rr(ctx, x + 3, y + 3, Math.max(3, (w - 6) * p), h - 6, (h - 6) / 2, g);
    }
    if (label) text(ctx, label, x + w / 2, y + h / 2, Math.min(22, h - 5), C.white);
  }

  function clipCircle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
  }

  function atlasCell(ctx, img, cols, rows, index, x, y, w, h, circle) {
    if (!img || !img.complete && !img.width) return;
    var sw = img.width / cols;
    var sh = img.height / rows;
    var col = index % cols;
    var row = Math.floor(index / cols);
    ctx.save();
    if (circle) clipCircle(ctx, x + w / 2, y + h / 2, Math.min(w, h) / 2);
    ctx.drawImage(img, col * sw + 4, row * sh + 4, sw - 8, sh - 8, x, y, w, h);
    ctx.restore();
  }

  function icon(ctx, img, index, x, y, size, cooldown) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(x, y, size / 2 + 5, 0, Math.PI * 2);
    ctx.fillStyle = '#0b1723'; ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.stroke();
    atlasCell(ctx, img, 4, 3, index, x - size / 2, y - size / 2, size, size, true);
    if (cooldown > 0) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, size / 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, cooldown));
      ctx.closePath();
      ctx.fillStyle = 'rgba(3,8,13,.72)'; ctx.fill();
    }
    ctx.restore();
  }

  function portrait(ctx, img, index, x, y, size) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, size / 2 + 5, 0, Math.PI * 2);
    ctx.fillStyle = C.ink2; ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.stroke();
    atlasCell(ctx, img, 3, 2, index, x - size / 2, y - size / 2, size, size, true);
    ctx.restore();
  }

  function shadow(ctx, x, y, rx, alpha) {
    ctx.save();
    ctx.scale(1, 0.32);
    ctx.beginPath(); ctx.arc(x, y / 0.32, rx, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,' + (alpha || 0.35) + ')'; ctx.fill();
    ctx.restore();
  }

  function atlasSprite(ctx, img, index, x, y, w, h, alpha) {
    if (!img || !(img.width || img.naturalWidth)) return false;
    var iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
    var sw = iw / 3, sh = ih / 2, col = index % 3, row = Math.floor(index / 3);
    var inset = 8;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(img, col * sw + inset, row * sh + inset, sw - inset * 2, sh - inset * 2, x, y, w, h);
    ctx.restore();
    return true;
  }

  function spriteImage(ctx, img, centerX, baseY, maxW, maxH, alpha, blend) {
    if (!img || !(img.width || img.naturalWidth)) return false;
    var iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
    var scale = Math.min(maxW / iw, maxH / ih), w = iw * scale, h = ih * scale;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.globalCompositeOperation = blend || 'source-over';
    ctx.drawImage(img, centerX - w / 2, baseY - h, w, h);
    ctx.restore();
    return true;
  }

  function hero(ctx, h, time, sprites) {
    var spriteMap = {
      hongyi: sprites.heroHongyi,
      qingyi: sprites.heroQingyi,
      huangjin: sprites.heroHuangjin,
      xuanya: sprites.heroXuanya,
      suwen: sprites.heroSuwen
    };
    var colorMap = {
      hongyi: C.fire,
      qingyi: C.blue,
      huangjin: C.gold,
      xuanya: '#d9c7a6',
      suwen: C.jade
    };
    var sprite = spriteMap[h.type] || sprites.heroHongyi;
    var color = colorMap[h.type] || C.paper;
    var duration = h.attackDuration || .34;
    var progress = h.attackAnim > 0 ? 1 - h.attackAnim / duration : 0;
    var strike = h.attackAnim > 0 ? Math.sin(progress * Math.PI) : 0;
    var bob = Math.sin(time * 3 + (h.id || h.slot || 0)) * 3;
    var x = h.x, y = h.y + bob - strike * 17;
    var baseScale = h.scale || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((h.type === 'qingyi' ? -.035 : .035) * strike);
    ctx.scale(baseScale * (1 + strike * .09), baseScale * (1 - strike * .06));
    shadow(ctx, 0, 45, 49, .48);
    var aura = ctx.createRadialGradient(0, -17, 8, 0, -17, 70);
    aura.addColorStop(0, color + '55'); aura.addColorStop(1, color + '00');
    ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(0, -17, 70, 0, Math.PI * 2); ctx.fill();
    if (strike > 0) {
      ctx.strokeStyle = color; ctx.globalAlpha = .75 * strike; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(0, -26, 67 + strike * 15, Math.PI * 1.05, Math.PI * 1.9); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    spriteImage(ctx, sprite, 0, 34, 132, 138, .99);
    if (h.flash > 0) {
      spriteImage(ctx, sprite, 0, 34, 132, 138, Math.min(.42, h.flash * 2.6), 'lighter');
    }
    rr(ctx, -33, 34, 66, 24, 11, 'rgba(7,16,23,.86)', color, 2);
    text(ctx, h.name, 0, 47, 16, C.white);
    ctx.restore();
  }

  function paperSeal(ctx, x, y, scale, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(scale, scale);
    ctx.fillStyle = '#e9c870'; rr(ctx, -9, -20, 18, 40, 2, '#e9c870', '#8d3d2f', 2);
    ctx.strokeStyle = '#b5342b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-4, -14); ctx.lineTo(4, -14); ctx.lineTo(-3, -7); ctx.lineTo(4, 0); ctx.lineTo(-4, 7); ctx.lineTo(4, 14); ctx.stroke();
    ctx.restore();
  }

  function enemy(ctx, e, time, sprites) {
    var sprite = e.type === 'wisp' ? sprites.enemyWisp : e.type === 'boss' ? sprites.enemyBoss : sprites.enemyJiangshi;
    var boss = e.type === 'boss';
    var armored = e.type === 'armored';
    var bob = Math.sin(time * (e.type === 'wisp' ? 5 : 3.2) + e.id) * (e.type === 'wisp' ? 5 : 2);
    var duration = e.attackDuration || .58;
    var attackProgress = e.attackAnim > 0 ? 1 - e.attackAnim / duration : 0;
    var lunge = e.attackAnim > 0 ? Math.sin(attackProgress * Math.PI) : 0;
    var summon = e.summonAnim > 0 ? Math.sin((1 - e.summonAnim / .65) * Math.PI) : 0;
    var recoil = e.hit > 0 ? Math.sin(e.hit / .11 * Math.PI) : 0;
    var scale = e.size * (boss ? 1.1 : armored ? 1.06 : 1);
    ctx.save();
    ctx.translate(e.x + recoil * 7, e.y + bob + lunge * 24 - summon * 10);
    ctx.rotate((e.id % 2 ? 1 : -1) * (.06 * lunge + .025 * summon));
    ctx.scale(scale * (1 + summon * .14), scale * (1 - lunge * .1 + summon * .08));
    shadow(ctx, 0, boss ? 61 : 38, boss ? 68 : 39, boss ? .5 : .38);
    if (e.elite || summon > 0) {
      var auraColor = boss ? C.fire : '#bd68e0';
      var aura = ctx.createRadialGradient(0, -16, 5, 0, -16, boss ? 98 : 62);
      aura.addColorStop(0, auraColor + '66'); aura.addColorStop(1, auraColor + '00');
      ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(0, -16, boss ? 98 : 62, 0, Math.PI * 2); ctx.fill();
    }
    if (lunge > 0) {
      ctx.strokeStyle = boss ? C.fire : '#e9dfbd'; ctx.lineWidth = boss ? 10 : 6;
      ctx.globalAlpha = lunge * .75; ctx.beginPath(); ctx.arc(0, -20, boss ? 86 : 56, .2, 2.45); ctx.stroke(); ctx.globalAlpha = 1;
    }
    var spriteW = boss ? 190 : armored ? 112 : 98;
    var spriteH = boss ? 190 : armored ? 112 : 98;
    spriteImage(ctx, sprite, 0, boss ? 58 : 36, spriteW, spriteH, e.hit > 0 ? .82 : .99);
    if (armored) {
      ctx.strokeStyle = '#9ab8ad'; ctx.lineWidth = 4; ctx.globalAlpha = .65;
      ctx.beginPath(); ctx.arc(0, -26, 47, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  YL.Art = {
    rr: rr, text: text, panel: panel, button: button, bar: bar,
    icon: icon, portrait: portrait, hero: hero, enemy: enemy,
    atlasCell: atlasCell, pathRoundRect: pathRoundRect, paperSeal: paperSeal,
    spriteImage: spriteImage
  };
}(typeof globalThis !== 'undefined' ? globalThis : this));
