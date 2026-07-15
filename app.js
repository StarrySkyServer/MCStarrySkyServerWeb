const { createApp, ref, computed, onMounted, onBeforeUnmount } = Vue;

// Set playlistId to use a NetEase playlist through a Meting-compatible API.
const MUSIC_CONFIG = {
  playlistId: '2114319187',
  api: 'https://api.i-meto.com/meting/api?server=netease&type=playlist&id={id}'
};

createApp({
  setup() {
    const serverHost = 'mc.szzz666.top';
    const serverPort = '19132';
    const minecraftUrl = `minecraft://?addExternalServer=MC%20Starry%20Sky|${serverHost}:${serverPort}`;
    // file:// pages cannot request local JSON, so keep a useful built-in fallback.
    const sponsors = ref([
      { name: '小忧', amount: 666 },
      { name: '꧁❦澪༒月❦꧂', amount: 432.5 },
      { name: 'Skydream', amount: 371.8 },
      { name: '芝士狐狸', amount: 180.26 },
      { name: 'pyeietywu', amount: 150 },
      { name: 'HLYB2023', amount: 140 },
      { name: 'folent1764', amount: 137.8 },
      { name: 'YILONG233', amount: 100 },
      { name: '磕矮の小極', amount: 100 },
      { name: 'WinterCoffee176', amount: 83.4 }
    ]);
    const copied = ref(false);
    const compact = ref(localStorage.getItem('compact') === 'true');
    const theme = ref(localStorage.getItem('theme') || 'auto');
    const toast = ref('');
    const audio = ref(null);
    const musicPlaying = ref(false);
    const savedVolume = Number(localStorage.getItem('musicVolume'));
    const volume = ref(Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 1 ? savedVolume : 0.7);
    const volumeOpen = ref(false);
    const savedPlayMode = localStorage.getItem('musicPlayMode');
    const playMode = ref(['sequence', 'single', 'random'].includes(savedPlayMode) ? savedPlayMode : 'sequence');
    const playlist = ref([{ name: '星空背景音乐', artist: 'Minecraft 星空服务器', url: 'data/星空背景音乐.mp3', pic: 'img/Starry sky logo air.png' }]);
    const playlistId = ref(localStorage.getItem('musicPlaylistId') || MUSIC_CONFIG.playlistId);
    const playlistLoading = ref(false);
    const trackIndex = ref(0);
    const playlistOpen = ref(false);
    const currentTime = ref(0);
    const duration = ref(0);
    const sponsorOpen = ref(false);
    const videoSection = ref(null);
    const videoReady = ref(false);
    const localBackground = window.innerWidth <= 700 ? 'img/bgpe.jpg' : 'img/bgpc.jpg';
    const backgroundHistory = ref([localBackground]);
    const backgroundIndex = ref(0);
    const serverStatus = ref({ loading: true, online: false, players: 0, max: 0 });
    let toastTimer;
    let statusTimer;
    let videoObserver;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const links = [
      { title: '在线聊天', description: '与服务器玩家实时交流', icon: '◌', url: 'http://mc.szzz666.top:23400/public/StarrySkyLink' },
      { title: '游戏下载', description: '获取 Minecraft 客户端', icon: '↓', url: 'https://mc.minebbs.com/#/' },
      { title: '意见反馈', description: '告诉我们你的建议', icon: '✦', url: 'https://www.wenjuan.com/s/UZBZJvqQRqb/' },
      { title: 'QQ 频道', description: '加入星空官方频道', icon: '#', url: 'https://pd.qq.com/s/d88deyhxs' },
      { title: '玩家群聊', description: '加入官方 QQ 群', icon: '∞', url: 'https://qm.qq.com/q/Nnjg4MN8Ma' },
      { title: '协管中心', description: '服务器协管入口', icon: '◇', url: 'http://mc.szzz666.top:23400/public/Assistant' },
      { title: '服务中心', description: '访问服务器其他服务', icon: '⌂', url: 'http://mc.szzz666.top:23400/' },
      { title: '星空起始页', description: '打开独立搜索起始页', icon: '⌕', url: 'search.html' }
    ];

    const themeLabel = computed(() => ({ auto: '自动', light: '浅色', dark: '暗色' })[theme.value]);
    const themeIcon = computed(() => ({ auto: '◐', light: '☀', dark: '☾' })[theme.value]);
    const backgroundUrl = computed(() => backgroundHistory.value[backgroundIndex.value]);
    const currentTrack = computed(() => playlist.value[trackIndex.value] || playlist.value[0]);
    const playModeLabel = computed(() => ({ sequence: '顺序循环', single: '单曲循环', random: '随机播放' })[playMode.value]);
    const backgroundImage = computed(() => backgroundUrl.value === localBackground
      ? `url('${localBackground}')`
      : `url('${backgroundUrl.value}'), url('${localBackground}')`);

    function showToast(message) {
      toast.value = message;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.value = ''; }, 2200);
    }

    function applyTheme() {
      const resolved = theme.value === 'auto' ? (mediaQuery.matches ? 'dark' : 'light') : theme.value;
      document.documentElement.dataset.theme = resolved;
      document.querySelector('meta[name="theme-color"]').content = resolved === 'dark' ? '#08182b' : '#eaf5ff';
    }

    function cycleTheme() {
      const themes = ['auto', 'light', 'dark'];
      theme.value = themes[(themes.indexOf(theme.value) + 1) % themes.length];
      localStorage.setItem('theme', theme.value);
      applyTheme();
    }

    function toggleCompact() {
      compact.value = !compact.value;
      localStorage.setItem('compact', compact.value);
      document.body.classList.toggle('compact-mode', compact.value);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function copyAddress() {
      const address = `${serverHost}:${serverPort}`;
      try {
        await navigator.clipboard.writeText(address);
      } catch (_) {
        const input = document.createElement('textarea');
        input.value = address;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }
      copied.value = true;
      showToast(`已复制 ${address}`);
      setTimeout(() => { copied.value = false; }, 1800);
    }

    function findNumber(source, paths) {
      for (const path of paths) {
        const value = path.split('.').reduce((object, key) => object && object[key], source);
        if (Number.isFinite(Number(value))) return Number(value);
      }
      return 0;
    }

    async function loadServerStatus() {
      const endpoints = [
        `https://api.mcsrvstat.us/bedrock/3/${serverHost}:${serverPort}`,
        `https://api.mcstatus.io/v2/status/bedrock/${serverHost}:${serverPort}`,
        `https://motdbe.blackbe.work/api?host=${serverHost}:${serverPort}`,
        'https://mcbsl.szzz666.top:8080/api/servers/1/status'
      ];
      for (const endpoint of endpoints) {
        try {
          const { data } = await axios.get(endpoint, { timeout: 9000 });
          const payload = data.data ?? data;
          const onlineFlag = payload.online ?? payload.status ?? payload.success;
          const players = findNumber(payload, ['onlinePlayers', 'players.online', 'players', 'online_players', 'online']);
          const max = findNumber(payload, ['maxPlayers', 'players.max', 'max_players', 'max']);
          const online = onlineFlag === true || onlineFlag === 'online' || players > 0;
          if (online) {
            serverStatus.value = { loading: false, online: true, players, max };
            return;
          }
        } catch (_) {
          // Failed and offline responses both fall through to the next provider.
        }
      }
      serverStatus.value = { loading: false, online: false, players: 0, max: 0 };
    }

    async function nextBackground() {
      const endpoint = window.innerWidth <= 700 ? 'https://www.loliapi.com/acg/pe/?type=url' : 'https://www.loliapi.com/acg/pc/?type=url';
      try {
        const { data } = await axios.get(endpoint, { timeout: 10000, responseType: 'text' });
        const url = String(data).trim();
        if (!/^https?:\/\//i.test(url)) throw new Error('Invalid background URL');
        backgroundHistory.value = backgroundHistory.value.slice(0, backgroundIndex.value + 1).concat(url);
        backgroundIndex.value += 1;
      } catch (_) {}
    }

    function previousBackground() {
      if (backgroundIndex.value > 0) backgroundIndex.value -= 1;
      else showToast('已经是第一张背景');
    }

    async function downloadBackground() {
      try {
        const response = await fetch(backgroundUrl.value);
        if (!response.ok) throw new Error('Download failed');
        const objectUrl = URL.createObjectURL(await response.blob());
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = `starrysky-background-${Date.now()}.jpg`;
        link.click();
        URL.revokeObjectURL(objectUrl);
      } catch (_) {
        window.open(backgroundUrl.value, '_blank', 'noopener');
        showToast('受图片服务限制，已在新窗口打开背景');
      }
    }

    async function toggleMusic() {
      if (!audio.value) return;
      ensureMusicLoaded();
      if (audio.value.paused) {
        try { await audio.value.play(); } catch (_) { showToast('浏览器阻止了音乐播放，请再次点击'); }
      } else audio.value.pause();
    }

    function ensureMusicLoaded() {
      if (!audio.value || audio.value.getAttribute('src')) return;
      audio.value.src = currentTrack.value.url;
      audio.value.load();
    }

    async function selectTrack(index, shouldPlay = musicPlaying.value) {
      if (!audio.value || !playlist.value.length) return;
      trackIndex.value = (index + playlist.value.length) % playlist.value.length;
      currentTime.value = 0;
      duration.value = 0;
      audio.value.src = currentTrack.value.url;
      audio.value.load();
      if (shouldPlay) try { await audio.value.play(); } catch (_) {}
    }

    function previousTrack() { selectTrack(trackIndex.value - 1, true); }
    function randomTrackIndex() {
      if (playlist.value.length < 2) return trackIndex.value;
      let index;
      do { index = Math.floor(Math.random() * playlist.value.length); } while (index === trackIndex.value);
      return index;
    }
    function nextTrack() {
      selectTrack(playMode.value === 'random' ? randomTrackIndex() : trackIndex.value + 1, true);
    }
    function handleTrackEnded() {
      if (playMode.value === 'single') selectTrack(trackIndex.value, true);
      else nextTrack();
    }
    function cyclePlayMode() {
      const modes = ['sequence', 'single', 'random'];
      playMode.value = modes[(modes.indexOf(playMode.value) + 1) % modes.length];
      localStorage.setItem('musicPlayMode', playMode.value);
      showToast(`播放模式：${playModeLabel.value}`);
    }
    function updateMusicTime() {
      if (!audio.value) return;
      currentTime.value = Number.isFinite(audio.value.currentTime) ? audio.value.currentTime : 0;
      duration.value = Number.isFinite(audio.value.duration) ? audio.value.duration : 0;
    }
    function seekMusic(event) {
      if (!audio.value) return;
      audio.value.currentTime = Number(event.target.value);
      updateMusicTime();
    }
    function setVolume(event) {
      const nextVolume = Math.min(1, Math.max(0, Number(event.target?.value ?? event)));
      volume.value = nextVolume;
      if (audio.value) audio.value.volume = nextVolume;
      localStorage.setItem('musicVolume', nextVolume);
    }
    function toggleVolumePanel() { volumeOpen.value = !volumeOpen.value; }
    function closeVolumePanel() { volumeOpen.value = false; }
    function handleTrackError() { if (playlist.value.length > 1) nextTrack(); }
    function formatTime(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
      return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
    }
    async function loadNetEasePlaylist(id = playlistId.value) {
      const nextId = String(id || '').trim();
      if (!nextId) return showToast('请输入网易云歌单 ID');
      if (playlistLoading.value) return;
      playlistLoading.value = true;
      try {
        const { data } = await axios.get(MUSIC_CONFIG.api.replace('{id}', encodeURIComponent(nextId)), { timeout: 10000 });
        const tracks = (Array.isArray(data) ? data : data.data || []).filter(track => track.url).map(track => ({
          name: track.name || track.title || '未知歌曲',
          artist: track.artist || track.author || '网易云音乐',
          url: track.url.replace(/^http:/, 'https:'),
          pic: (track.pic || track.cover || 'img/Starry sky logo air.png').replace(/^http:/, 'https:')
        }));
        if (!tracks.length) throw new Error('Playlist is empty');
        playlist.value = tracks;
        trackIndex.value = 0;
        localStorage.setItem('musicPlaylistId', nextId);
        showToast(`已加载 ${tracks.length} 首歌曲`);
      } catch (_) {
        showToast('歌单加载失败，请检查 ID 或稍后重试');
      } finally {
        playlistLoading.value = false;
      }
    }

    const formatAmount = amount => Number(amount).toLocaleString('zh-CN', { maximumFractionDigits: 2 });

    onMounted(async () => {
      applyTheme();
      if (audio.value) audio.value.volume = volume.value;
      document.body.classList.toggle('compact-mode', compact.value);
      // The interface is ready; do not wait for slow external fonts, APIs or iframes.
      requestAnimationFrame(() => requestAnimationFrame(() => window.hidePageLoader?.()));
      mediaQuery.addEventListener('change', applyTheme);
      document.addEventListener('keydown', closeSponsorOnEscape);
      document.addEventListener('click', closeVolumePanel);
      if ('IntersectionObserver' in window && videoSection.value) {
        videoObserver = new IntersectionObserver(([entry]) => {
          if (!entry.isIntersecting) return;
          videoReady.value = true;
          videoObserver.disconnect();
        }, { rootMargin: '300px' });
        videoObserver.observe(videoSection.value);
      } else {
        videoReady.value = true;
      }
      const loadDeferredData = async () => {
        if (window.location.protocol === 'file:') return;
        try {
          const { data } = await axios.get('data/sponsor_data.json');
          if (Array.isArray(data)) sponsors.value = data.sort((a, b) => b.amount - a.amount);
        } catch (_) {}
      };
      const runWhenIdle = callback => 'requestIdleCallback' in window
        ? window.requestIdleCallback(callback, { timeout: 3000 })
        : setTimeout(callback, 1500);
      runWhenIdle(() => {
        nextBackground();
        loadServerStatus();
        statusTimer = setInterval(loadServerStatus, 60000);
      });
      runWhenIdle(() => {
        const fontStylesheet = document.createElement('link');
        fontStylesheet.rel = 'stylesheet';
        fontStylesheet.href = 'https://fonts.loli.net/css2?family=Noto+Sans+SC:wght@400;500;600;700;900&display=swap';
        document.head.appendChild(fontStylesheet);
      });
      runWhenIdle(loadDeferredData);
      runWhenIdle(() => loadNetEasePlaylist());
    });

    onBeforeUnmount(() => {
      clearInterval(statusTimer);
      clearTimeout(toastTimer);
      videoObserver?.disconnect();
      mediaQuery.removeEventListener('change', applyTheme);
      document.removeEventListener('keydown', closeSponsorOnEscape);
      document.removeEventListener('click', closeVolumePanel);
    });

    function closeSponsorOnEscape(event) {
      if (event.key === 'Escape') sponsorOpen.value = false;
    }

    return { serverHost, serverPort, minecraftUrl, sponsors, sponsorOpen, videoSection, videoReady, copied, compact, themeLabel, themeIcon, toast, audio, musicPlaying, volume, volumeOpen, playMode, playModeLabel, playlist, playlistId, playlistLoading, trackIndex, playlistOpen, currentTrack, currentTime, duration, serverStatus, links, backgroundUrl, backgroundImage, cycleTheme, toggleCompact, copyAddress, nextBackground, previousBackground, downloadBackground, toggleMusic, toggleVolumePanel, setVolume, cyclePlayMode, selectTrack, previousTrack, nextTrack, handleTrackEnded, updateMusicTime, seekMusic, handleTrackError, loadPlaylistById: () => loadNetEasePlaylist(), formatTime, formatAmount };
  }
}).mount('#app');
