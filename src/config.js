(function (root) {
  'use strict';
  var YL = root.YL = root.YL || {};
  YL.W = 750;
  YL.H = 1334;
  YL.COLORS = {
    ink: '#07111d', ink2: '#101c29', panel: '#16202a',
    paper: '#f4ddb0', gold: '#dba84c', gold2: '#8b5a23',
    red: '#d94a35', red2: '#8f261f', fire: '#ff8a36',
    jade: '#47d8b1', teal: '#15958d', blue: '#58bde9',
    white: '#fff7df', muted: '#98a6a2', danger: '#ef5d56'
  };
  YL.ASSETS = {
    battlefield: 'assets/art/battlefield.webp',
    title: 'assets/art/title-keyart.webp',
    characters: 'assets/art/character-atlas.webp',
    icons: 'assets/art/icon-atlas.webp',
    heroHongyi: 'assets/art/sprites/hero-hongyi.webp',
    heroQingyi: 'assets/art/sprites/hero-qingyi.webp',
    heroHuangjin: 'assets/art/sprites/hero-huangjin.webp',
    heroXuanya: 'assets/art/sprites/hero-xuanya.webp',
    heroSuwen: 'assets/art/sprites/hero-suwen.webp',
    enemyWisp: 'assets/art/sprites/enemy-wisp.webp',
    enemyJiangshi: 'assets/art/sprites/enemy-jiangshi.webp',
    enemyBoss: 'assets/art/sprites/enemy-boss-transparent.webp'
  };
}(typeof globalThis !== 'undefined' ? globalThis : this));
