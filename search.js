(() => {
      const MUSIC_CONFIG = {
        playlistId: '2114319187',
        api: 'https://api.i-meto.com/meting/api?server=netease&type=playlist&id={id}'
      };
      const engines = {
        baidu: { name: '百度', icon: '百', url: 'https://www.baidu.com/s?wd=' },
        bing: { name: 'Bing', icon: 'B', url: 'https://cn.bing.com/search?q=' },
        google: { name: 'Google', icon: 'G', url: 'https://www.google.com/search?q=' },
        sogou: { name: '搜狗', icon: '搜', url: 'https://www.sogou.com/web?query=' },
        so360: { name: '360 搜索', icon: '360', url: 'https://www.so.com/s?q=' },
        duckduckgo: { name: 'DuckDuckGo', icon: 'D', url: 'https://duckduckgo.com/?q=' },
        brave: { name: 'Brave Search', icon: 'Br', url: 'https://search.brave.com/search?q=' },
        yahoo: { name: 'Yahoo', icon: 'Y', url: 'https://search.yahoo.com/search?p=' },
        yandex: { name: 'Yandex', icon: 'Я', url: 'https://yandex.com/search/?text=' },
        ecosia: { name: 'Ecosia', icon: 'E', url: 'https://www.ecosia.org/search?q=' },
        github: { name: 'GitHub', icon: 'GH', url: 'https://github.com/search?q=' },
        bilibili: { name: '哔哩哔哩', icon: '哔', url: 'https://search.bilibili.com/all?keyword=' }
      };
      const defaultLinks = [
        { title: '星空服务器', description: 'Minecraft 社区', url: 'index.html', icon: '✦', protected: true },
        { title: 'GitHub', description: '代码与项目', url: 'https://github.com', icon: '◉' },
        { title: '哔哩哔哩', description: '视频与灵感', url: 'https://www.bilibili.com', icon: '▶' },
        { title: '知乎', description: '发现新知识', url: 'https://www.zhihu.com', icon: '知' },
        { title: '网易云音乐', description: '让好音乐相遇', url: 'https://music.163.com', icon: '♫' },
        { title: 'Minecraft Wiki', description: '方块世界百科', url: 'https://zh.minecraft.wiki', icon: '▣' }
      ];
      const fallbackTrack = { name: '星空背景音乐', artist: 'Minecraft 星空服务器', url: 'data/星空背景音乐.mp3', pic: 'img/Starry sky logo air.png' };
      const localBackground = window.innerWidth <= 700 ? 'img/bgpe.jpg' : 'img/bgpc.jpg';
      const read = (key, fallback) => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch (_) { return fallback; } };
      const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} };
      const $ = id => document.getElementById(id);
      let linkData = read('starry-start-links', defaultLinks);
      if (!Array.isArray(linkData)) linkData = defaultLinks.slice();
      const isProtectedLink = link => link?.protected === true || (link?.title === '星空服务器' && link?.url === 'index.html');
      let engineKey = localStorage.getItem('starry-start-engine') || 'baidu';
      if (!Object.prototype.hasOwnProperty.call(engines, engineKey)) engineKey = 'baidu';
      let theme = localStorage.getItem('theme') || localStorage.getItem('starry-start-theme') || 'auto';
      if (!['auto', 'light', 'dark'].includes(theme)) theme = 'auto';
      const mediaQuery = matchMedia('(prefers-color-scheme: dark)');
      let hitokotoText = '';
      let manageMode = false;
      let compactMode = localStorage.getItem('searchCompact') || '0';
      if (!['0', '1', '2'].includes(compactMode)) compactMode = '0';
      let modalTrigger = null;
      let backgroundHistory = [localBackground];
      let backgroundIndex = 0;
      let playlist = [fallbackTrack];
      let trackIndex = 0;
      let playlistId = localStorage.getItem('musicPlaylistId') || MUSIC_CONFIG.playlistId;
      let playlistLoading = false;
      let playMode = localStorage.getItem('musicPlayMode');
      if (!['sequence', 'single', 'random'].includes(playMode)) playMode = 'sequence';
      let toastTimer;
      const audio = $('audio');

      function applyTheme() {
        const resolved = theme === 'auto' ? (mediaQuery.matches ? 'dark' : 'light') : theme;
        document.documentElement.dataset.theme = resolved;
        $('themeIcon').textContent = ({ auto: '◐', light: '☀', dark: '☾' })[theme];
        $('themeLabel').textContent = ({ auto: '自动', light: '浅色', dark: '暗色' })[theme];
        $('themeButton').title = `当前主题：${$('themeLabel').textContent}`;
        document.querySelector('meta[name="theme-color"]').content = resolved === 'dark' ? '#08182b' : '#eaf5ff';
      }
      function cycleTheme() {
        const themes = ['auto', 'light', 'dark'];
        theme = themes[(themes.indexOf(theme) + 1) % themes.length];
        localStorage.setItem('theme', theme);
        applyTheme();
      }
      function applyCompact() {
        const mode = Number(compactMode);
        const app = $('app');
        app.classList.toggle('compact', mode >= 1);
        app.classList.toggle('compact-minimal', mode === 2);
        document.body.classList.toggle('compact-mode', mode >= 1);
        document.body.classList.toggle('compact-minimal', mode === 2);
        $('compactButton').textContent = mode === 0 ? '精简' : mode === 1 ? '极简' : '展开';
        $('compactButton').title = mode === 0 ? '切换精简显示' : mode === 1 ? '切换极简显示' : '恢复完整显示';
      }
      function toggleCompact() {
        const main = $('main');
        if (main.classList.contains('fade-out')) return;
        let finalized = false;
        const finalize = () => {
          if (finalized) return;
          finalized = true;
          compactMode = String((Number(compactMode) + 1) % 3);
          localStorage.setItem('searchCompact', compactMode);
          applyCompact();
          requestAnimationFrame(() => main.classList.remove('fade-out'));
          window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        main.classList.add('fade-out');
        main.addEventListener('transitionend', finalize, { once: true });
        setTimeout(finalize, 480);
      }

      function updateClock() {
        const now = new Date();
        $('clock').textContent = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
        $('dateText').textContent = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
        if (!hitokotoText) {
          const hour = now.getHours();
          $('greeting').innerHTML = `${hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'}，<b>星空旅人</b>。愿你今天也能发现一颗闪亮的星星。`;
        }
      }
      async function loadHitokoto() {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
          const response = await fetch('https://v1.hitokoto.cn/?c=i', { signal: controller.signal, cache: 'no-store' });
          if (!response.ok) throw new Error('Hitokoto request failed');
          const data = await response.json();
          if (typeof data.hitokoto !== 'string' || !data.hitokoto.trim()) throw new Error('Invalid Hitokoto response');
          hitokotoText = data.hitokoto.trim();
          $('greeting').textContent = hitokotoText;
        } catch (_) {
          // Keep the time-based greeting when the quote service is unavailable.
        } finally {
          clearTimeout(timeout);
        }
      }
      function showToast(message) {
        clearTimeout(toastTimer);
        $('toast').textContent = message;
        $('toast').classList.remove('hidden');
        toastTimer = setTimeout(() => $('toast').classList.add('hidden'), 2200);
      }
      function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }

      function renderEngines() {
        const currentEngine = engines[engineKey];
        $('engineButton').textContent = currentEngine.icon;
        $('engineButton').title = `当前搜索引擎：${currentEngine.name}`;
        $('searchInput').placeholder = `使用 ${currentEngine.name} 搜索，或输入网址`;
        $('engineMenu').innerHTML = Object.entries(engines).map(([key, engine]) => `<button type="button" class="${key === engineKey ? 'active' : ''}" data-engine="${key}" role="option" aria-selected="${key === engineKey}"><b>${escapeHtml(engine.icon)}</b>${escapeHtml(engine.name)}</button>`).join('');
      }
      function closeEngineMenu(returnFocus = false) {
        $('engineMenu').classList.add('hidden');
        $('engineButton').setAttribute('aria-expanded', 'false');
        if (returnFocus) $('engineButton').focus();
      }
      function openEngineMenu() {
        $('engineMenu').classList.remove('hidden');
        $('engineButton').setAttribute('aria-expanded', 'true');
        requestAnimationFrame(() => ($('engineMenu').querySelector('.active') || $('engineMenu').querySelector('button'))?.focus());
      }
      function selectEngine(key) {
        if (!Object.prototype.hasOwnProperty.call(engines, key)) return;
        engineKey = key;
        localStorage.setItem('starry-start-engine', engineKey);
        renderEngines();
        closeEngineMenu();
        $('searchInput').focus();
        showToast(`已切换到 ${engines[engineKey].name}`);
      }

      function renderLinks() {
         const cards = linkData.map((link, index) => `<article class="quick-card glass"><a class="quick-link" href="${escapeHtml(link.url)}" ${/^https?:/i.test(link.url) ? 'target="_blank" rel="noopener noreferrer"' : ''} data-shortcut><span class="quick-icon">${escapeHtml(link.icon || '•')}</span><span class="quick-copy"><strong>${escapeHtml(link.title)}</strong><small>${escapeHtml(link.description || link.url.replace(/^https?:\/\//, ''))}</small></span></a>${manageMode && !isProtectedLink(link) ? `<button class="remove-link" type="button" data-remove="${index}" aria-label="删除 ${escapeHtml(link.title)}">×</button>` : ''}</article>`).join('');
        const addCard = manageMode ? '<button class="quick-card add-card glass" id="addLink" type="button"><span class="quick-icon">＋</span><span class="quick-copy"><strong>添加入口</strong><small>自定义你的星图</small></span></button>' : '';
        $('quickGrid').innerHTML = cards + addCard;
        $('linkCount').textContent = `${linkData.length} 个入口`;
        $('quickSection').classList.toggle('manage-on', manageMode);
        $('quickSection').classList.toggle('manage-off', !manageMode);
        $('manageButton').classList.toggle('active', manageMode);
        $('manageButton').setAttribute('aria-pressed', String(manageMode));
        $('manageButton').title = manageMode ? '完成快捷入口管理' : '开启管理模式';
        $('manageButton').innerHTML = `${manageMode ? '✓' : '⚙'} <span class="label">${manageMode ? '完成' : '管理'}</span>`;
      }
      function setManageMode(enabled) {
        manageMode = Boolean(enabled);
        if (!manageMode) closeModal();
        renderLinks();
        if (manageMode) $('quickSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast(manageMode ? '管理模式已开启，可以添加或删除入口' : '管理模式已关闭');
      }
      function requireManageMode() {
        if (manageMode) return true;
        showToast('请先开启管理模式');
        return false;
      }
      function openModal(trigger) {
        if (!requireManageMode()) return;
        modalTrigger = trigger || $('manageButton');
        $('modalBackdrop').classList.remove('hidden');
        $('linkForm').elements.title.focus();
      }
      function closeModal() {
        if ($('modalBackdrop').classList.contains('hidden')) return;
        $('modalBackdrop').classList.add('hidden');
        $('linkForm').reset();
        modalTrigger?.focus();
        modalTrigger = null;
      }

       function applyBackground() {
         const current = backgroundHistory[backgroundIndex];
         $('background').style.backgroundImage = current === localBackground
           ? `url("${current}")`
           : `url("${current}"), url("${localBackground}")`;
       }
       async function nextBackground(silent = false) {
         const endpoint = window.innerWidth <= 700 ? 'https://www.loliapi.com/acg/pe/?type=url' : 'https://www.loliapi.com/acg/pc/?type=url';
         try {
           const response = await fetch(endpoint, { cache: 'no-store' });
           if (!response.ok) throw new Error('Background request failed');
           const url = (await response.text()).trim().replace(/^http:/i, 'https:');
           if (!/^https?:\/\//i.test(url)) throw new Error('Invalid background URL');
          backgroundHistory = backgroundHistory.slice(0, backgroundIndex + 1).concat(url);
          backgroundIndex += 1;
          applyBackground();
         } catch (_) { if (!silent) showToast('暂时无法获取新背景'); }
      }
      function previousBackground() {
        if (backgroundIndex > 0) { backgroundIndex -= 1; applyBackground(); }
        else showToast('已经是第一张背景');
      }
      async function downloadBackground() {
        const url = backgroundHistory[backgroundIndex];
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error('Download failed');
          const objectUrl = URL.createObjectURL(await response.blob());
          const link = document.createElement('a');
          link.href = objectUrl;
          link.download = `starrysky-background-${Date.now()}.jpg`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
        } catch (_) {
          window.open(url, '_blank', 'noopener');
          showToast('受图片服务限制，已在新窗口打开背景');
        }
      }

      function currentTrack() { return playlist[trackIndex] || fallbackTrack; }
      function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
        return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
      }
      function playModeLabel() { return ({ sequence: '顺序循环', single: '单曲循环', random: '随机播放' })[playMode]; }
      function playModeIcon() {
        if (playMode === 'single') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 2l3 3-3 3M4 11V9a4 4 0 014-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 01-4 4H4"/><text x="12" y="14.5">1</text></svg>';
        if (playMode === 'random') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3h5v5M4 5h2.5a4 4 0 013.2 1.6l4.6 6.8a4 4 0 003.2 1.6H21M16 21h5v-5M4 19h2.5a4 4 0 003.2-1.6l1.1-1.6M14.2 7.7l.1-.1A4 4 0 0117.5 6H21"/></svg>';
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 2l3 3-3 3M4 11V9a4 4 0 014-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 01-4 4H4"/></svg>';
      }
      function updatePlayer() {
        const track = currentTrack();
        const playing = !audio.paused;
        $('trackName').textContent = track.name;
        $('trackArtist').textContent = track.artist;
        if ($('trackCover').src !== new URL(track.pic, location.href).href) $('trackCover').src = track.pic;
        $('playingDot').classList.toggle('hidden', !playing);
        $('playMusic').title = playing ? '暂停音乐' : '播放音乐';
        $('playMusic').setAttribute('aria-label', $('playMusic').title);
        $('playMusic').innerHTML = playing ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7L8 5z"/></svg>';
        $('currentTime').textContent = formatTime(audio.currentTime);
        $('duration').textContent = formatTime(audio.duration);
        $('musicProgress').max = Number.isFinite(audio.duration) ? audio.duration : 0;
        $('musicProgress').value = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
        $('musicProgress').style.setProperty('--range-progress', `${audio.duration ? Math.min(100, audio.currentTime / audio.duration * 100) : 0}%`);
        $('playMode').title = `播放模式：${playModeLabel()}`;
        $('playMode').setAttribute('aria-label', $('playMode').title);
        $('playMode').innerHTML = playModeIcon();
        updatePlaylistState();
      }
      function updatePlaylistState() {
        $('playlistItems').querySelectorAll('[data-track]').forEach((button, index) => {
          const active = index === trackIndex;
          button.classList.toggle('active', active);
          button.setAttribute('aria-label', `${active ? '当前歌曲，' : ''}播放 ${playlist[index].name} - ${playlist[index].artist}`);
          button.querySelector('.track-number').textContent = active && !audio.paused ? '▶' : String(index + 1).padStart(2, '0');
          const oldIndicator = button.querySelector('.playing-indicator');
          if (active && !audio.paused && !oldIndicator) {
            const indicator = document.createElement('span');
            indicator.className = 'playing-indicator';
            indicator.setAttribute('aria-label', '正在播放');
            indicator.innerHTML = '<i></i><i></i><i></i>';
            button.append(indicator);
          } else if ((!active || audio.paused) && oldIndicator) oldIndicator.remove();
        });
      }
      function renderPlaylist() {
        $('playlistCount').textContent = `${playlist.length} 首`;
        const fragment = document.createDocumentFragment();
        playlist.forEach((track, index) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = `playlist-item${index === trackIndex ? ' active' : ''}`;
          button.dataset.track = index;
          button.setAttribute('aria-label', `${index === trackIndex ? '当前歌曲，' : ''}播放 ${track.name} - ${track.artist}`);
          const number = document.createElement('span');
          number.className = 'track-number';
          number.textContent = index === trackIndex && !audio.paused ? '▶' : String(index + 1).padStart(2, '0');
          const image = document.createElement('img');
          image.src = track.pic;
          image.alt = '';
          image.loading = 'lazy';
          image.addEventListener('error', () => { image.src = 'img/Starry sky logo air.png'; }, { once: true });
          const copy = document.createElement('span');
          copy.className = 'playlist-track';
          const name = document.createElement('strong');
          name.textContent = track.name;
          const artist = document.createElement('small');
          artist.textContent = track.artist;
          copy.append(name, artist);
          const indicator = document.createElement('span');
          if (index === trackIndex && !audio.paused) {
            indicator.className = 'playing-indicator';
            indicator.setAttribute('aria-label', '正在播放');
            indicator.innerHTML = '<i></i><i></i><i></i>';
          }
          button.append(number, image, copy, indicator);
          fragment.append(button);
        });
        $('playlistItems').replaceChildren(fragment);
      }
      function ensureMusicLoaded() {
        if (audio.getAttribute('src')) return;
        audio.src = currentTrack().url;
        audio.load();
      }
      async function toggleMusic() {
        ensureMusicLoaded();
        if (audio.paused) {
          try { await audio.play(); } catch (_) { showToast('浏览器阻止了音乐播放，请再次点击'); }
        } else audio.pause();
      }
      async function selectTrack(index, shouldPlay = !audio.paused) {
        if (!playlist.length) return;
        trackIndex = (index + playlist.length) % playlist.length;
        audio.src = currentTrack().url;
        audio.load();
        updatePlayer();
        if (shouldPlay) try { await audio.play(); } catch (_) {}
      }
      function randomTrackIndex() {
        if (playlist.length < 2) return trackIndex;
        let index;
        do { index = Math.floor(Math.random() * playlist.length); } while (index === trackIndex);
        return index;
      }
      function nextTrack() { selectTrack(playMode === 'random' ? randomTrackIndex() : trackIndex + 1, true); }
      function previousTrack() { selectTrack(trackIndex - 1, true); }
      function handleTrackEnded() { selectTrack(playMode === 'single' ? trackIndex : playMode === 'random' ? randomTrackIndex() : trackIndex + 1, true); }
      function cyclePlayMode() {
        const modes = ['sequence', 'single', 'random'];
        playMode = modes[(modes.indexOf(playMode) + 1) % modes.length];
        localStorage.setItem('musicPlayMode', playMode);
        updatePlayer();
        showToast(`播放模式：${playModeLabel()}`);
      }
      function setVolume(value) {
        const volume = Math.min(1, Math.max(0, Number(value)));
        audio.volume = volume;
        $('volumeSlider').value = volume;
        $('volumeSlider').style.setProperty('--range-progress', `${volume * 100}%`);
        $('volumeText').textContent = Math.round(volume * 100);
        localStorage.setItem('musicVolume', volume);
      }
      function closePlayerPanels() {
        $('volumePopover').classList.add('hidden');
        $('playlistPanel').classList.add('hidden');
        $('volumeButton').classList.remove('active');
        $('playlistButton').classList.remove('active');
        $('volumeButton').setAttribute('aria-expanded', 'false');
        $('playlistButton').setAttribute('aria-expanded', 'false');
      }
      function toggleVolumePanel() {
        const opening = $('volumePopover').classList.contains('hidden');
        closePlayerPanels();
        if (opening) {
          $('volumePopover').classList.remove('hidden');
          $('volumeButton').classList.add('active');
          $('volumeButton').setAttribute('aria-expanded', 'true');
        }
      }
      function togglePlaylist() {
        const opening = $('playlistPanel').classList.contains('hidden');
        closePlayerPanels();
        if (opening) {
          $('playlistPanel').classList.remove('hidden');
          $('playlistButton').classList.add('active');
          $('playlistButton').setAttribute('aria-expanded', 'true');
        }
      }
      async function loadNetEasePlaylist(id = playlistId) {
        const nextId = String(id || '').trim();
        if (!nextId) return showToast('请输入网易云歌单 ID');
        if (playlistLoading) return;
        playlistLoading = true;
        $('playlistId').disabled = true;
        $('playlistLoad').disabled = true;
        $('playlistLoad').classList.add('loading');
        $('playlistLoad').querySelector('span').textContent = '加载中';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          const response = await fetch(MUSIC_CONFIG.api.replace('{id}', encodeURIComponent(nextId)), { signal: controller.signal });
          if (!response.ok) throw new Error('Playlist request failed');
          const data = await response.json();
          const source = Array.isArray(data) ? data : data.data || [];
          const tracks = source.filter(track => track.url).map(track => ({
            name: track.name || track.title || '未知歌曲',
            artist: track.artist || track.author || '网易云音乐',
            url: String(track.url).replace(/^http:/, 'https:'),
            pic: String(track.pic || track.cover || fallbackTrack.pic).replace(/^http:/, 'https:')
          }));
          if (!tracks.length) throw new Error('Playlist is empty');
          playlist = tracks;
          trackIndex = 0;
          playlistId = nextId;
          localStorage.setItem('musicPlaylistId', nextId);
          renderPlaylist();
          updatePlayer();
          showToast(`已加载 ${tracks.length} 首歌曲`);
        } catch (_) {
          showToast('歌单加载失败，请检查 ID 或稍后重试');
        } finally {
          clearTimeout(timeout);
          playlistLoading = false;
          $('playlistId').disabled = false;
          $('playlistLoad').disabled = false;
          $('playlistLoad').classList.remove('loading');
          $('playlistLoad').querySelector('span').textContent = '加载歌单';
        }
      }

      updateClock();
      setInterval(updateClock, 1000);
      applyTheme();
      mediaQuery.addEventListener('change', applyTheme);
      applyCompact();
      applyBackground();
      renderEngines();
      renderLinks();
      $('playlistId').value = playlistId;
      const savedVolume = Number(localStorage.getItem('musicVolume'));
      setVolume(Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 1 ? savedVolume : .7);
      renderPlaylist();
      updatePlayer();

      $('searchForm').addEventListener('submit', event => {
        event.preventDefault();
        const query = $('searchInput').value.trim();
        if (!query) return $('searchInput').focus();
        window.location.assign(/^https?:\/\//i.test(query) ? query : engines[engineKey].url + encodeURIComponent(query));
      });
      $('engineButton').addEventListener('click', event => {
        event.stopPropagation();
        $('engineMenu').classList.contains('hidden') ? openEngineMenu() : closeEngineMenu();
      });
      $('engineButton').addEventListener('keydown', event => {
        if (['ArrowDown', 'Enter', ' '].includes(event.key) && $('engineMenu').classList.contains('hidden')) { event.preventDefault(); openEngineMenu(); }
      });
      $('engineMenu').addEventListener('click', event => {
        const button = event.target.closest('[data-engine]');
        if (button) { event.preventDefault(); event.stopPropagation(); selectEngine(button.dataset.engine); }
      });
      $('engineMenu').addEventListener('keydown', event => {
        const options = [...$('engineMenu').querySelectorAll('button')];
        const index = options.indexOf(document.activeElement);
        let next = index;
        if (event.key === 'ArrowDown') next = (index + 1) % options.length;
        else if (event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = options.length - 1;
        else if (['Enter', ' '].includes(event.key)) { event.preventDefault(); return selectEngine(document.activeElement.dataset.engine); }
        else if (event.key === 'Escape') { event.preventDefault(); return closeEngineMenu(true); }
        else return;
        event.preventDefault();
        options[next]?.focus();
      });
      $('quickGrid').addEventListener('click', event => {
        const link = event.target.closest('[data-shortcut]');
        if (link && manageMode) { event.preventDefault(); return; }
        const remove = event.target.closest('[data-remove]');
        if (remove) {
          event.preventDefault();
          event.stopPropagation();
          if (!requireManageMode()) return;
          const index = Number(remove.dataset.remove);
          if (!Number.isInteger(index) || !linkData[index]) return;
          if (isProtectedLink(linkData[index])) {
            showToast('星空服务器入口无法删除');
            return;
          }
          const deleted = linkData.splice(index, 1)[0];
          save('starry-start-links', linkData);
          renderLinks();
          showToast(`已移除「${deleted.title}」`);
          return;
        }
        const add = event.target.closest('#addLink');
        if (add) openModal(add);
      });
      $('linkForm').addEventListener('submit', event => {
        event.preventDefault();
        if (!requireManageMode()) { closeModal(); return; }
        const data = new FormData(event.target);
        let url = String(data.get('url')).trim();
        if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
        try {
          const parsed = new URL(url);
          linkData.push({ title: String(data.get('title')).trim(), description: parsed.hostname.replace(/^www\./, ''), url: parsed.href, icon: String(data.get('icon')).trim() || '✦' });
          save('starry-start-links', linkData);
          renderLinks();
          closeModal();
          showToast('快捷入口已加入星图');
        } catch (_) { showToast('请输入有效的网址'); }
      });
      $('manageButton').addEventListener('click', () => setManageMode(!manageMode));
      $('compactButton').addEventListener('click', toggleCompact);
      $('themeButton').addEventListener('click', cycleTheme);
      $('cancelLink').addEventListener('click', closeModal);
      $('modalBackdrop').addEventListener('click', event => { if (event.target === $('modalBackdrop')) closeModal(); });
      $('previousBackground').addEventListener('click', previousBackground);
      $('nextBackground').addEventListener('click', nextBackground);
      $('downloadBackground').addEventListener('click', downloadBackground);
      $('playMusic').addEventListener('click', toggleMusic);
      $('previousTrack').addEventListener('click', previousTrack);
      $('nextTrack').addEventListener('click', nextTrack);
      $('playMode').addEventListener('click', cyclePlayMode);
      $('volumeButton').addEventListener('click', event => { event.stopPropagation(); toggleVolumePanel(); });
      $('volumePopover').addEventListener('click', event => event.stopPropagation());
      $('volumeSlider').addEventListener('input', event => setVolume(event.target.value));
      $('playlistButton').addEventListener('click', event => { event.stopPropagation(); togglePlaylist(); });
      $('playlistPanel').addEventListener('click', event => event.stopPropagation());
      $('playlistClose').addEventListener('click', closePlayerPanels);
      $('playlistConfig').addEventListener('submit', event => { event.preventDefault(); loadNetEasePlaylist($('playlistId').value); });
      $('playlistItems').addEventListener('click', event => {
        const item = event.target.closest('[data-track]');
        if (item) selectTrack(Number(item.dataset.track), true);
      });
      $('musicProgress').addEventListener('input', event => { audio.currentTime = Number(event.target.value); updatePlayer(); });
      $('trackCover').addEventListener('error', () => { $('trackCover').src = fallbackTrack.pic; });
      audio.addEventListener('play', updatePlayer);
      audio.addEventListener('pause', updatePlayer);
      audio.addEventListener('timeupdate', updatePlayer);
      audio.addEventListener('loadedmetadata', updatePlayer);
      audio.addEventListener('ended', handleTrackEnded);
      audio.addEventListener('error', () => { if (playlist.length > 1) nextTrack(); });
      document.addEventListener('click', event => {
        if (!event.target.closest('.search-box')) closeEngineMenu();
        if (!event.target.closest('.music-player')) closePlayerPanels();
      });
      document.addEventListener('keydown', event => {
        if (event.key === '/' && document.activeElement !== $('searchInput') && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); $('searchInput').focus(); }
        if (event.key === 'Escape') {
          closeModal();
          closeEngineMenu();
          closePlayerPanels();
          if (manageMode) setManageMode(false);
        }
      });

      const runWhenIdle = callback => 'requestIdleCallback' in window ? requestIdleCallback(callback, { timeout: 3000 }) : setTimeout(callback, 1200);
      runWhenIdle(() => nextBackground(true));
      runWhenIdle(loadHitokoto);
      runWhenIdle(() => loadNetEasePlaylist());

})();