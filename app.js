// DeenBondhu BD Core Application Logic

const State = {
  currentView: 'home',
  language: localStorage.getItem('db_lang') || 'bn',
  city: localStorage.getItem('db_city') || 'Dhaka',
  prayerTimes: null,
  hijriDate: '',
  gregorianDate: '',
  surahs: [],
  currentSurah: null,
  tasbihCount: parseInt(localStorage.getItem('db_tasbih') || '0'),
  tasbihTarget: 33,
  tracker: JSON.parse(localStorage.getItem('db_tracker') || '{}'),
  profiles: JSON.parse(localStorage.getItem('db_profiles') || '[{"name": "প্রধান ব্যবহারকারী", "age": "Adult"}]'),
  activeProfile: 0
};

// Translations Dictionary
const I18n = {
  bn: {
    appTitle: "দ্বীনবন্ধু বিডি",
    tagline: "প্রতিদিনের জীবনে দ্বীনের সঙ্গী",
    home: "হোম",
    quran: "আল-কুরআন",
    duas: "দুআ সমূহ",
    tasbih: "তাসবিহ",
    settings: "সেটিংস",
    prayerTimes: "আজকের নামাজের সময়সূচী",
    nextPrayer: "পরবর্তী নামাজ",
    dailyVerse: "আজকের আয়াত / বাণী",
    quickAccess: "দ্রুত সেবা",
    searchPlaceholder: "কুরআন বা দুআ খুঁজুন...",
    asamaUlHusna: "আল্লাহর ৯৯ নাম",
    salahGuide: "নামাজ শিক্ষা",
    wuduGuide: "ওজু ও গোসল",
    qibla: "কিবলা কম্পাস",
    familyMode: "ফ্যামিলি মোড",
    safeDns: "সেফ ডিএনএস",
    mealReminders: "খাবারের রিমাইন্ডার",
    worshipTracker: "ইবাদত ট্র্যাকার"
  },
  en: {
    appTitle: "DeenBondhu BD",
    tagline: "Everyday Islamic Companion",
    home: "Home",
    quran: "Al-Quran",
    duas: "Duas",
    tasbih: "Tasbih",
    settings: "Settings",
    prayerTimes: "Today's Prayer Times",
    nextPrayer: "Next Prayer",
    dailyVerse: "Daily Verse",
    quickAccess: "Quick Access",
    searchPlaceholder: "Search Quran or Duas...",
    asamaUlHusna: "99 Names of Allah",
    salahGuide: "Salah Guide",
    wuduGuide: "Wudu & Ghusl",
    qibla: "Qibla Compass",
    familyMode: "Family Mode",
    safeDns: "Safe DNS",
    mealReminders: "Meal Reminders",
    worshipTracker: "Worship Tracker"
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  updateUIStrings();
  setupEventListeners();
  loadDates();
  await fetchPrayerTimes(State.city);
  await loadSurahsList();
  renderHome();
  
  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW registration failed:', err));
  }
}

function setupEventListeners() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = e.currentTarget.getAttribute('data-view');
      switchView(view);
    });
  });
}

function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.add('active');
  
  const targetNav = document.querySelector(`[data-view="${viewName}"]`);
  if (targetNav) targetNav.classList.add('active');
  
  State.currentView = viewName;
  window.scrollTo(0, 0);

  if (viewName === 'quran' && State.surahs.length === 0) {
    loadSurahsList();
  }
}

function updateUIStrings() {
  const t = I18n[State.language] || I18n.bn;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) el.textContent = t[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (t[key]) el.placeholder = t[key];
  });
}

function loadDates() {
  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  State.gregorianDate = now.toLocaleDateString(State.language === 'bn' ? 'bn-BD' : 'en-US', options);
  
  // Estimated Hijri placeholder or live API calculation
  State.hijriDate = "১৫ রবিউল আখের ১৪৪৮ হিজরি"; 
}

async function fetchPrayerTimes(city) {
  try {
    const response = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${city}&country=Bangladesh&method=1`);
    const data = await response.json();
    if (data.code === 200) {
      State.prayerTimes = data.data.timings;
      renderPrayerTimesWidget();
    }
  } catch (error) {
    console.error('Failed to fetch prayer times:', error);
    // Fallback static timings if offline
    State.prayerTimes = { Fajr: '04:45', Dhuhr: '12:02', Asr: '16:15', Maghrib: '17:48', Isha: '19:02' };
    renderPrayerTimesWidget();
  }
}

function renderHome() {
  const container = document.getElementById('home-content');
  const t = I18n[State.language];
  
  container.innerHTML = `
    <div class="hero-banner">
      <h2>${t.appTitle}</h2>
      <p>${t.tagline}</p>
    </div>

    <div class="dates-row">
      <div>তারিখ: <span id="greg-date">${State.gregorianDate}</span></div>
      <div>হিজরি: <span id="hijri-date">${State.hijriDate}</span></div>
    </div>

    <div class="card">
      <div class="card-title">
        <span>📍 ${State.city}, বাংলাদেশ</span>
        <button class="btn" style="width: auto; padding: 4px 10px; font-size: 0.75rem;" onclick="changeCity()">শহর পরিবর্তন</button>
      </div>
      <div class="prayer-list" id="home-prayer-list">
        <!-- Rendered dynamically -->
      </div>
    </div>

    <div class="quick-grid">
      <div class="quick-item" onclick="switchView('quran')">
        <div class="quick-icon">📖</div>
        <div class="quick-label">${t.quran}</div>
      </div>
      <div class="quick-item" onclick="switchView('duas')">
        <div class="quick-icon">🤲</div>
        <div class="quick-label">${t.duas}</div>
      </div>
      <div class="quick-item" onclick="switchView('tasbih')">
        <div class="quick-icon">📿</div>
        <div class="quick-label">${t.tasbih}</div>
      </div>
      <div class="quick-item" onclick="switchView('tools')">
        <div class="quick-icon">🧭</div>
        <div class="quick-label">অন্যান্য</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">✨ আজকের নির্বাচিত আয়াত</div>
      <p class="arabic-text" style="font-size: 1.1rem; text-align: right; margin-bottom: 8px;">إِنَّ مَعَ الْعُسْرِ يُسْرًا</p>
      <p style="font-size: 0.9rem; color: var(--text-main);">"নিশ্চয়ই কষ্টের সাথেই স্বস্তি রয়েছে।" (সূরা আল-ইনশিরাহ: ৬)</p>
    </div>
  `;
  renderPrayerTimesWidget();
}

function renderPrayerTimesWidget() {
  const listEl = document.getElementById('home-prayer-list');
  if (!listEl || !State.prayerTimes) return;
  
  const prayers = [
    { key: 'Fajr', name: 'ফজর', time: State.prayerTimes.Fajr },
    { key: 'Dhuhr', name: 'যোহর', time: State.prayerTimes.Dhuhr },
    { key: 'Asr', name: 'আসর', time: State.prayerTimes.Asr },
    { key: 'Maghrib', name: 'মাগরিব', time: State.prayerTimes.Maghrib },
    { key: 'Isha', name: 'এশা', time: State.prayerTimes.Isha }
  ];

  listEl.innerHTML = prayers.map(p => `
    <div class="prayer-item">
      <span class="prayer-name">${p.name}</span>
      <span class="prayer-time">${p.time}</span>
    </div>
  `).join('');
}

function changeCity() {
  const newCity = prompt("আপনার শহরের নাম লিখুন (ഉദാ: Dhaka, Chittagong, Sylhet):", State.city);
  if (newCity) {
    State.city = newCity.trim();
    localStorage.setItem('db_city', State.city);
    fetchPrayerTimes(State.city);
    renderHome();
  }
}

async function loadSurahsList() {
  const container = document.getElementById('surah-list-container');
  if (!container) return;
  
  container.innerHTML = '<p style="text-align:center; color: var(--text-muted);">কুরআন লোড হচ্ছে...</p>';
  
  try {
    const res = await fetch('https://api.alquran.cloud/v1/surah');
    const data = await res.json();
    if (data.code === 200) {
      State.surahs = data.data;
      renderSurahs(State.surahs);
    }
  } catch (err) {
    container.innerHTML = '<p style="text-align:center; color: var(--danger);">ইন্টারনেট সংযোগ ব্যর্থ হয়েছে। অফলাইন মোড সক্রিয়।</p>';
  }
}

function renderSurahs(surahs) {
  const container = document.getElementById('surah-list-container');
  if (!container) return;
  
  container.innerHTML = surahs.map(s => `
    <div class="list-row" onclick="openSurah(${s.number})">
      <div>
        <strong>${s.number}. ${s.englishName}</strong> (${s.englishNameTranslation})<br>
        <small style="color: var(--text-muted);">${s.revelationType === 'Meccan' ? 'মাক্কী' : 'মাদানী'} • ${s.numberOfAyahs} আয়াত</small>
      </div>
      <div class="arabic-text" style="font-size: 1.1rem;">${s.name}</div>
    </div>
  `).join('');
}

async function openSurah(number) {
  const viewContainer = document.getElementById('view-quran');
  viewContainer.innerHTML = '<p style="text-align:center; padding: 40px; color: var(--gold);">সূরা লোড হচ্ছে...</p>';
  
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/surah/${number}/editions/quran-uthmani,bn.bengali`);
    const data = await res.json();
    if (data.code === 200) {
      const arabic = data.data[0].ayahs;
      const bengali = data.data[1].ayahs;
      const surahMeta = State.surahs.find(s => s.number === number);
      
      let html = `
        <button class="btn" style="width: auto; margin-bottom: 16px;" onclick="switchView('quran'); loadSurahsList();">← সূরার তালিকায় ফিরে যান</button>
        <div class="card" style="text-align: center;">
          <h2>${surahMeta.englishName} (${surahMeta.name})</h2>
          <p style="color: var(--text-muted);">${surahMeta.englishNameTranslation} • ${surahMeta.numberOfAyahs} Ayahs</p>
        </div>
      `;
      
      for (let i = 0; i < arabic.length; i++) {
        html += `
          <div class="card">
            <div style="font-size: 0.8rem; color: var(--gold); margin-bottom: 8px;">আয়াত ${arabic[i].numberInSurah}</div>
            <p class="arabic-text" style="margin-bottom: 12px;">${arabic[i].text}</p>
            <p style="font-size: 0.95rem; color: var(--text-main);">${bengali[i].text}</p>
          </div>
        `;
      }
      
      viewContainer.innerHTML = html;
    }
  } catch (err) {
    viewContainer.innerHTML = '<p style="text-align:center; color: var(--danger);">সূরা লোড করতে ব্যর্থ হয়েছে।</p>';
  }
}

// Tasbih Functions
function incrementTasbih() {
  State.tasbihCount++;
  if (State.tasbihCount > 9999) State.tasbihCount = 0;
  localStorage.setItem('db_tasbih', State.tasbihCount);
  document.getElementById('tasbih-counter-display').textContent = State.tasbihCount;
}

function resetTasbih() {
  if (confirm('আপনি কি তাসবিহ রিসেট করতে চান?')) {
    State.tasbihCount = 0;
    localStorage.setItem('db_tasbih', 0);
    document.getElementById('tasbih-counter-display').textContent = 0;
  }
}
