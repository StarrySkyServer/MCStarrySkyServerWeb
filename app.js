const { createApp, ref, computed, onMounted, onBeforeUnmount } = Vue;

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
    const sponsorOpen = ref(false);
    const backgroundHistory = ref(['img/bg1.jpg']);
    const backgroundIndex = ref(0);
    const serverStatus = ref({ loading: true, online: false, players: 0, max: 0 });
    let toastTimer;
    let statusTimer;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const links = [
      { title: '在线聊天', description: '与服务器玩家实时交流', icon: '◌', url: 'http://mc.szzz666.top:23400/public/StarrySkyLink' },
      { title: '游戏下载', description: '获取 Minecraft 客户端', icon: '↓', url: 'https://mc.minebbs.com/#/' },
      { title: '意见反馈', description: '告诉我们你的建议', icon: '✦', url: 'https://www.wenjuan.com/s/UZBZJvqQRqb/' },
      { title: 'QQ 频道', description: '加入星空官方频道', icon: '#', url: 'https://pd.qq.com/s/d88deyhxs' },
      { title: '玩家群聊', description: '加入官方 QQ 群', icon: '∞', url: 'https://qm.qq.com/q/Nnjg4MN8Ma' },
      { title: '协管中心', description: '服务器协管入口', icon: '◇', url: 'http://mc.szzz666.top:23400/public/Assistant' },
      { title: '服务中心', description: '访问服务器其他服务', icon: '⌂', url: 'http://mc.szzz666.top:23400/' },
      { title: 'Bing 搜索', description: '打开独立搜索起始页', icon: '⌕', url: 'search.html' }
    ];

    const themeLabel = computed(() => ({ auto: '自动', light: '浅色', dark: '暗色' })[theme.value]);
    const themeIcon = computed(() => ({ auto: '◐', light: '☀', dark: '☾' })[theme.value]);
    const backgroundUrl = computed(() => backgroundHistory.value[backgroundIndex.value]);

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
        'https://mcbsl.szzz666.top:8080/api/servers/1/status',
        `https://api.mcstatus.io/v2/status/bedrock/${serverHost}:${serverPort}`,
        `https://motdbe.blackbe.work/api?host=${serverHost}:${serverPort}`
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
      } catch (_) {
        const fallback = backgroundUrl.value === 'img/bg1.jpg' ? 'img/bg2.jpg' : 'img/bg1.jpg';
        backgroundHistory.value = backgroundHistory.value.slice(0, backgroundIndex.value + 1).concat(fallback);
        backgroundIndex.value += 1;
        showToast('随机背景不可用，已切换本地背景');
      }
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
      if (audio.value.paused) {
        try { await audio.value.play(); } catch (_) { showToast('浏览器阻止了音乐播放，请再次点击'); }
      } else audio.value.pause();
    }

    async function tryAutoplayMusic() {
      if (!audio.value) return;
      try {
        await audio.value.play();
      } catch (_) {
        const resume = async () => {
          try { await audio.value.play(); } catch (_) { return; }
          document.removeEventListener('pointerdown', resume);
          document.removeEventListener('keydown', resume);
        };
        document.addEventListener('pointerdown', resume, { once: true });
        document.addEventListener('keydown', resume, { once: true });
      }
    }

    const formatAmount = amount => Number(amount).toLocaleString('zh-CN', { maximumFractionDigits: 2 });

    onMounted(async () => {
      applyTheme();
      document.body.classList.toggle('compact-mode', compact.value);
      tryAutoplayMusic();
      nextBackground();
      // The interface is ready; do not wait for slow external fonts, APIs or iframes.
      requestAnimationFrame(() => requestAnimationFrame(() => window.hidePageLoader?.()));
      mediaQuery.addEventListener('change', applyTheme);
      document.addEventListener('keydown', closeSponsorOnEscape);
      loadServerStatus();
      statusTimer = setInterval(loadServerStatus, 60000);
      if (window.location.protocol !== 'file:') {
        try {
          const { data } = await axios.get('data/sponsor_data.json');
          if (Array.isArray(data)) sponsors.value = data.sort((a, b) => b.amount - a.amount);
        } catch (_) {
          showToast('完整赞助榜加载失败，正在显示本地榜单');
        }
      }
    });

    onBeforeUnmount(() => {
      clearInterval(statusTimer);
      clearTimeout(toastTimer);
      mediaQuery.removeEventListener('change', applyTheme);
      document.removeEventListener('keydown', closeSponsorOnEscape);
    });

    function closeSponsorOnEscape(event) {
      if (event.key === 'Escape') sponsorOpen.value = false;
    }

    return { serverHost, serverPort, minecraftUrl, sponsors, sponsorOpen, copied, compact, themeLabel, themeIcon, toast, audio, musicPlaying, serverStatus, links, backgroundUrl, cycleTheme, toggleCompact, copyAddress, nextBackground, previousBackground, downloadBackground, toggleMusic, formatAmount };
  }
}).mount('#app');
